const config = window.FLUENT_SUPABASE_CONFIG || {};
const storagePrefix = 'fluent-learning-v1';
const status = document.getElementById('sync-status');
const accountButton = document.getElementById('account-button');
const profileButton = document.getElementById('profile-button');
const accountDialog = document.getElementById('account-dialog');
const authForm = document.getElementById('auth-form');
const authMessage = document.getElementById('auth-message');
const authTitle = document.getElementById('auth-title');
const authCopy = document.getElementById('auth-copy');
const authSubmit = document.getElementById('auth-submit');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const emailGroup = document.getElementById('email-group');
const passwordGroup = document.getElementById('password-group');
const authTabs = document.getElementById('auth-tabs');
const forgotPassword = document.getElementById('forgot-password');
let supabase = null;
let currentUser = null;
let authMode = 'signin';
let syncTimer = null;
let syncing = false;
let pendingProgress = null;

await new Promise(resolve => {
  if (window.fluentApp) resolve();
  else window.addEventListener('fluent:app-ready', resolve, { once: true });
});

function showStatus(message, state = 'local') {
  status.dataset.state = state;
  status.innerHTML = `<span class="save-dot"></span>${message}`;
}

function setMessage(message, kind = '') {
  authMessage.textContent = message;
  authMessage.dataset.kind = kind;
}

function portableProgress(progress) {
  const value = progress && typeof progress === 'object' ? progress : {};
  return {
    level: value.level || null,
    completed: Array.isArray(value.completed) ? value.completed : [],
    quizResults: value.quizResults && typeof value.quizResults === 'object' ? value.quizResults : {}
  };
}

function personalLocalProgress(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`${storagePrefix}:user:${userId}`) || '{}');
    return saved.speakingAnswers && typeof saved.speakingAnswers === 'object' ? saved.speakingAnswers : {};
  } catch {
    return {};
  }
}

async function syncProgress(progress = window.fluentApp.getState()) {
  if (!supabase || !currentUser) return;
  if (syncing) {
    pendingProgress = progress;
    return;
  }
  const userId = currentUser.id;
  syncing = true;
  showStatus('Syncing progress…', 'syncing');
  const { error } = await supabase.from('user_progress').upsert({
    user_id: currentUser.id,
    progress: portableProgress(progress),
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  syncing = false;
  if (currentUser?.id !== userId) {
    pendingProgress = null;
    return;
  }
  if (error) {
    console.error('Progress sync failed:', error.message);
    showStatus('Cloud sync needs setup', 'error');
  } else {
    showStatus('Progress synced to your account', 'cloud');
  }
  if (pendingProgress) {
    const next = pendingProgress;
    pendingProgress = null;
    await syncProgress(next);
  }
}

async function activateSession(user) {
  if (user?.id === currentUser?.id) return;
  currentUser = user || null;
  clearTimeout(syncTimer);
  pendingProgress = null;
  if (!currentUser) {
    window.fluentApp.setScope(null);
    document.getElementById('profile-name').textContent = 'Your learning space';
    document.getElementById('profile-caption').textContent = 'Saved on this device';
    document.getElementById('profile-avatar').textContent = 'Y';
    accountButton.textContent = 'Sign in';
    document.getElementById('auth-signout').hidden = true;
    showStatus('Progress saved on this device', 'local');
    document.getElementById('privacy-note').innerHTML = 'Made for steady progress <span>✳</span> Your progress stays on this device.';
    document.getElementById('progress-copy').textContent = 'Every small step counts. Your progress is saved in this browser.';
    return;
  }

  const email = currentUser.email || 'Learner';
  document.getElementById('profile-name').textContent = email;
  document.getElementById('profile-caption').textContent = 'Signed in · progress syncs';
  document.getElementById('profile-avatar').textContent = email[0].toUpperCase();
  accountButton.textContent = 'Account';
  document.getElementById('auth-signout').hidden = false;
  document.getElementById('privacy-note').innerHTML = 'Made for steady progress <span>✳</span> Your learning progress syncs securely; speaking transcripts stay on this device.';
  document.getElementById('progress-copy').textContent = 'Your level, lesson completions, and quiz results sync to your account. Speaking transcripts stay on this device.';
  showStatus('Loading your progress…', 'syncing');
  const userId = currentUser.id;
  const { data, error } = await supabase.from('user_progress').select('progress').eq('user_id', userId).maybeSingle();
  if (currentUser?.id !== userId) return;
  if (error) {
    console.error('Progress load failed:', error.message);
    showStatus('Cloud sync needs setup', 'error');
    return;
  }

  const local = window.fluentApp.getState();
  const localAnswers = personalLocalProgress(currentUser.id);
  const cloud = data?.progress;
  const nextProgress = cloud
    ? { ...portableProgress(cloud), speakingAnswers: localAnswers }
    : { ...portableProgress(local), speakingAnswers: Object.keys(localAnswers).length ? localAnswers : local.speakingAnswers };
  window.fluentApp.setScope(`${storagePrefix}:user:${currentUser.id}`, nextProgress);
  if (!cloud) await syncProgress(nextProgress);
  else showStatus('Progress synced to your account', 'cloud');
}

function setAuthMode(mode) {
  authMode = mode;
  authTabs.hidden = mode === 'reset' || mode === 'update';
  emailGroup.hidden = mode === 'update';
  authEmail.required = mode !== 'update';
  passwordGroup.hidden = mode === 'reset';
  authPassword.required = mode !== 'reset';
  forgotPassword.hidden = mode !== 'signin';
  authTabs.querySelectorAll('[data-auth-mode]').forEach(button => button.classList.toggle('active', button.dataset.authMode === mode));
  if (mode === 'signup') {
    authTitle.textContent = 'Create your learning account.';
    authCopy.textContent = 'Your level, completed lessons, and quiz results will follow you across devices.';
    authSubmit.innerHTML = 'Create account <span>→</span>';
    authPassword.autocomplete = 'new-password';
  } else if (mode === 'reset') {
    authTitle.textContent = 'Reset your password.';
    authCopy.textContent = 'We’ll email you a secure link to choose a new password.';
    authSubmit.innerHTML = 'Send reset link <span>→</span>';
  } else if (mode === 'update') {
    authTitle.textContent = 'Choose a new password.';
    authCopy.textContent = 'Use at least 8 characters for your new password.';
    authSubmit.innerHTML = 'Update password <span>→</span>';
    authPassword.autocomplete = 'new-password';
  } else {
    authTitle.textContent = 'Keep your progress with you.';
    authCopy.textContent = 'Sign in to sync your level, completed lessons, and quiz results across devices.';
    authSubmit.innerHTML = 'Sign in <span>→</span>';
    authPassword.autocomplete = 'current-password';
  }
  setMessage('');
}

function openAccount() {
  document.getElementById('auth-signout').hidden = !currentUser;
  if (!supabase) {
    setAuthMode('signin');
    authForm.hidden = true;
    authTabs.hidden = true;
    forgotPassword.hidden = true;
    setMessage('Supabase is not connected yet. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to the Vercel project after creating its Supabase project.', 'error');
  } else if (currentUser) {
    setAuthMode('signin');
    authForm.hidden = true;
    authTabs.hidden = true;
    forgotPassword.hidden = true;
    setMessage(`Signed in as ${currentUser.email}. Your level, lesson completions, and quiz results sync to your account.`, 'success');
  } else {
    setAuthMode('signin');
    authForm.hidden = false;
    authTabs.hidden = false;
  }
  accountDialog.showModal();
}

authTabs.addEventListener('click', event => {
  const button = event.target.closest('[data-auth-mode]');
  if (button) setAuthMode(button.dataset.authMode);
});
forgotPassword.addEventListener('click', () => setAuthMode('reset'));
accountButton.addEventListener('click', openAccount);
profileButton.addEventListener('click', openAccount);

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabase) return;
  authSubmit.disabled = true;
  setMessage('Please wait…');
  const email = authEmail.value.trim();
  const password = authPassword.value;
  let result;
  if (authMode === 'signup') {
    result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (!result.error && !result.data.session) {
      setMessage('Check your email for a confirmation link, then come back here to sign in.', 'success');
      authSubmit.disabled = false;
      return;
    }
  } else if (authMode === 'reset') {
    result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (!result.error) {
      setMessage('If an account exists for this address, a password reset link is on its way.', 'success');
      authSubmit.disabled = false;
      return;
    }
  } else if (authMode === 'update') {
    result = await supabase.auth.updateUser({ password });
  } else {
    result = await supabase.auth.signInWithPassword({ email, password });
  }
  authSubmit.disabled = false;
  if (result.error) {
    setMessage(result.error.message, 'error');
    return;
  }
  setMessage('You’re signed in. Your progress is syncing now.', 'success');
  setTimeout(() => accountDialog.close(), 500);
});

document.getElementById('auth-signout').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) setMessage(error.message, 'error');
  else {
    accountDialog.close();
    setMessage('You have signed out.', 'success');
  }
});

window.addEventListener('fluent:progress-changed', event => {
  if (!currentUser || !supabase) return;
  clearTimeout(syncTimer);
  const progress = event.detail;
  syncTimer = setTimeout(() => syncProgress(progress), 500);
});

if (config.url && config.publishableKey) {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(config.url, config.publishableKey);
    const { data: { session } } = await supabase.auth.getSession();
    await activateSession(session?.user || null);
    supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        authForm.hidden = false;
        setAuthMode('update');
        accountDialog.showModal();
      }
      void activateSession(nextSession?.user || null);
    });
  } catch (error) {
    console.error('Supabase initialization failed:', error);
    showStatus('Could not connect to Supabase', 'error');
    setMessage('Could not connect to the account service. Check the project URL, publishable key, and internet connection.', 'error');
  }
} else {
  showStatus('Progress saved on this device', 'local');
}

document.getElementById('auth-signout').hidden = !currentUser;
