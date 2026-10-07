import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const output = new URL('./dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'auth.js']) {
  await cp(new URL(`./${file}`, import.meta.url), new URL(`./dist/${file}`, import.meta.url));
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (process.argv.includes('--deployment') && (!url || !publishableKey)) {
  throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the Vercel project before deploying.');
}
const config = `window.FLUENT_SUPABASE_CONFIG = Object.freeze(${JSON.stringify({ url, publishableKey })});\n`;
await writeFile(new URL('./dist/supabase-config.js', import.meta.url), config, 'utf8');
console.log(url && publishableKey ? 'Built Fluent with Supabase Auth configured.' : 'Built Fluent in local-progress mode; set Supabase environment variables to enable accounts.');
