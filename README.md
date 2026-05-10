# The Golden Guild

A small browser-based blog for friends to write short essays under individual usernames.

## Open It

Open `index.html` in a browser. No server or install step is required.

## Deploy

This project can be deployed as a static site on Vercel:

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New... > Project**.
3. Import the GitHub repository.
4. Use the defaults:
   - Framework Preset: `Other`
   - Build Command: leave blank
   - Output Directory: leave blank
5. Deploy.

## Supabase Setup

To make accounts and posts shared across devices:

1. Create a Supabase project.
2. In Supabase, open **SQL Editor** and run `supabase-schema.sql`.
3. In **Authentication > Providers > Email**, turn off email confirmation for the simple friends-only username flow.
4. Copy your Project URL and anon public key from **Project Settings > API**.
5. Paste them into `supabase-config.js`.
6. Commit and push. Vercel will redeploy automatically.

## Prototype Notes

- If `supabase-config.js` is empty, accounts and posts are stored in the browser with `localStorage`.
- The seeded demo accounts are `Mira` and `Jonah`, both with the password `guild`.
- With Supabase configured, accounts and posts are stored in the shared Supabase database.
