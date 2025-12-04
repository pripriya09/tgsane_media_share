# FB-IG Connect — Media Share Auto-Post Guide


This repository documents how to connect a Facebook Page to an Instagram Professional (Business) Account, how to check the linked Page, and how to enable posting to both Facebook and Instagram using an app/site 
(with necessary Graph API permissions and sample API calls).


Files of interest:
- CONNECT_GUIDE.md — full step-by-step instructions.
- CHANGELOG.md — project history and versioned notes.
- .gitignore — ignores `.env`, `node_modules/`, etc.


## Quick start
1. Clone the repo
2. Review CONNECT_GUIDE.md to set up your FB/IG accounts
3. Follow the OAuth flow in your app to request scopes: `pages_show_list`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`
4. Store App ID / App Secret in a `.env` file (do NOT commit `.env`)fixed git email
