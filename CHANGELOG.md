# Changelog


All notable changes to this project will be documented in this file.


## [Unreleased]
- Add initial FB-IG connect guide and API samples.


## [2025-11-28] - Initial commit
- Created CONNECT_GUIDE.md with setup and API workflow
- Added .gitignore and LICENSE (MIT)



# ----------------------------------------------------------------
Facebook Login / Redirect URIs — HTTPS requirement (local testing)

Facebook requires HTTPS for OAuth redirect URLs. Local http://localhost:5173 OR  http://localhost:5173  will NOT be accepted as a valid redirect unless you expose it over HTTPS. Add this guidance into the document and your README_FRONTEND.md.

Options for local HTTPS during development (pick one):

ngrok (recommended fast option)

Install ngrok and run it to expose your frontend or backend over HTTPS.

Example (frontend on Vite default port 5173):

# start your frontend dev server (Vite)
npm run dev --prefix frontend
# in another terminal, create an HTTPS tunnel
ngrok http 5173

Copy the https://xxxxxx.ngrok.io URL and add it to your Facebook App settings as a valid OAuth redirect URI and as the Site URL for the Facebook Login product.

Also use that https URL in any frontend config for REDIRECT_URI.

localtunnel or cloudflared (alternative tunneling)

Similar to ngrok: exposes a secure HTTPS URL that forwards to localhost.

Use mkcert + local HTTPS server (advanced)

Generate a self-signed certificate trusted on your machine, configure your dev server to use HTTPS and then use https://localhost:5173 as redirect. Note: Facebook may still disallow self-signed certs for OAuth endpoints; tunneling services are simpler.

Deploy preview / staging server

Push a branch to GitHub and use a temporary deployment (Vercel, Netlify) that provides an HTTPS URL. Use that live URL for Facebook app settings.

Exactly where to add the redirect URLs in Facebook App Dashboard

Go to your Facebook Developer Dashboard → select your app.

From left menu choose Products → Facebook Login → Settings.

Under Valid OAuth Redirect URIs add the HTTPS ngrok (or staging) URL plus the path your app uses for the OAuth callback, for example:

https://abcd1234.ngrok.io/auth/facebook/callback

Also add the same HTTPS domain under Settings → Basic as the App Domains (e.g. abcd1234.ngrok.io) and under Facebook Login → Client OAuth Settings add the site URL if required.

Where to put config values (frontend/backend)

Backend: store FB_APP_ID, FB_APP_SECRET, MONGODB_URI, and other secrets in backend/.env. Add .env to root .gitignore.

Frontend: store non-sensitive config (like OAUTH_REDIRECT_PATH) in a config file or environment file used for builds (e.g. .env.local for Vite). Do not put App Secret in frontend code. If you prefer not to use env files in code, set the redirect URL directly in a small frontend/src/config.js (but do NOT commit any secrets).


