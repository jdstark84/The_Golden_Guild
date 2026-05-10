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

## Prototype Notes

- Accounts and posts are stored in the browser with `localStorage`.
- The seeded demo accounts are `Mira` and `Jonah`, both with the password `guild`.
- For a public or multi-device site, replace the local storage layer with a real backend and secure authentication.
