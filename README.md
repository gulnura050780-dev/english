# Fluent — English learning

A responsive English-learning site with CEFR-inspired A1–B2 levels, a placement check, and practice across reading, writing, listening, and speaking.

## Run locally

Run the built-in preview server so browser modules can load:

```powershell
node build.mjs
node serve.mjs
```

Then open `http://localhost:4173`. Without Supabase environment variables, the lessons still work and progress stays in the browser.

## Supabase Auth and progress sync

1. Create a Supabase project and copy its Project URL and **publishable** key (or legacy anon key).
2. In Supabase SQL Editor, run [`supabase/migrations/20261007000000_user_progress.sql`](supabase/migrations/20261007000000_user_progress.sql).
3. In Supabase Auth URL Configuration, set the production Site URL and allow `http://localhost:4173/**` plus the Vercel production URL. Add preview URLs only if preview deployments need sign-in.
4. Add these Vercel environment variables for Production and Preview as needed:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
5. Redeploy. `build.mjs` writes those public values to the generated `supabase-config.js` in `dist`.

The publishable/anon key is meant for browser clients. Never put a `service_role` key in the site or Vercel client build. The progress table uses Row Level Security so each signed-in learner can read and update only their own row. The cloud record contains level, completed lesson IDs, and quiz results. Speaking transcripts remain on the current device.

Email/password sign-up, sign-in, and password reset use Supabase Auth. If email confirmation is enabled in Supabase, learners confirm their address before signing in.

## Privacy and browser support

Anonymous progress is stored in browser `localStorage`. Once signed in, level selection, lesson completion, and quiz results sync to the learner's Supabase row. Speaking transcripts are stored locally per signed-in user and are never sent to Supabase. Audio recordings are not stored.

Microphone speech recognition depends on browser support and may require HTTPS or localhost. If unavailable, learners can type their response instead. Listening activities use browser speech synthesis and show the script if audio is unavailable.
