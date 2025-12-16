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




## -----------------------------------------------------------------------------after 7.0 tag push------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# Changelog

All notable changes to the Social Media Management Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned Features
- LinkedIn integration
- YouTube Shorts support
- Analytics dashboard with insights
- Bulk post upload functionality
- Calendar view for scheduled posts
- User-provided Twitter API keys
- Advanced media editing tools
- Hashtag suggestions
- Post templates library

---

## [7.1.0] - 2025-12-16

### Fixed
- **Platform Selection Independence** - Fixed UI logic so platforms can be selected independently
  - Instagram and Twitter can now be selected without requiring Facebook
  - Removed forced Facebook selection when Instagram was checked
  - All platform combinations now work: FB only, IG only, X only, FB+IG, FB+X, IG+X, and FB+IG+X

### Improved
- Better user experience with independent platform checkboxes
- Clearer platform selection workflow in CreatePost component

---

## [7.0.0] - 2025-12-15

### Added
- **Twitter (X) Integration** - Full Twitter OAuth 1.0a support
  - OAuth authentication flow
  - Tweet posting with media support
  - Twitter account connection page
  - OAuth callback handler
  - Secure token storage with encryption

### Added - Backend
- `twitterController.js` - Handles Twitter OAuth and posting
- Twitter routes in `userRoute.js`
- OAuth signature generation for Twitter API v1.1 and v2
- Media upload to Twitter
- Tweet creation with text and images

### Added - Frontend
- `TwitterConnect.jsx` - UI for connecting Twitter accounts
- `TwitterCallback.jsx` - Handles OAuth redirect from Twitter
- Twitter selection in CreatePost form
- Twitter account display in Dashboard

### Changed
- Updated User model to store Twitter credentials (encrypted)
- Enhanced Post model to support Twitter platform
- Updated CreatePost component to handle Twitter posting
- Modified Dashboard to show Twitter connection status

---

## [6.0.0] - 2025-12-14

### Added
- **Repost Functionality** - Duplicate/repost previous content
  - Repost button in PostsHistory
  - Pre-fills CreatePost form with previous content
  - Allows editing before reposting
  - Supports reposting to different platforms

### Added - PostsHistory
- Repost action button for each post
- Navigation to CreatePost with pre-filled data
- Better post actions layout

### Changed
- Enhanced CreatePost to accept pre-filled post data via navigation state
- Improved post duplication logic

---

## [5.0.0] - 2025-12-12

### Added
- **Post Scheduling** - Schedule posts for future publishing
  - DateTime picker for scheduling
  - Timezone support (IST - Indian Standard Time)
  - Backend cron job to publish scheduled posts
  - Scheduled post status tracking

### Added - Backend
- Scheduled post checking with cron job
- Automatic publishing at scheduled time
- Timezone conversion (IST to UTC)
- Post status: 'scheduled', 'published', 'failed'

### Added - Frontend
- "Schedule Post" toggle in CreatePost
- Date and time picker
- Scheduled posts display in PostsHistory
- Visual indicators for scheduled vs published posts

### Changed
- Post model updated with `scheduledFor` and `status` fields
- CreatePost component supports immediate and scheduled posting
- PostsHistory filters scheduled posts separately

---

## [4.0.0] - 2025-12-10

### Added
- **Media Library** - Centralized media management
  - Upload multiple images/videos
  - View all uploaded media
  - Cloudinary integration for media storage
  - Media URL generation for posting

### Added - Frontend
- `LogMedia.jsx` component for media library
- Media upload interface
- Grid view of uploaded media
- Copy media URL functionality

### Added - Backend
- `cloudinaryHelper.js` for Cloudinary operations
- Media upload endpoint
- Secure media URL generation

### Changed
- CreatePost now uses media library URLs
- Improved image/video upload workflow

---

## [3.0.0] - 2025-12-08

### Added
- **Posts History** - View all published posts
  - Filterable by platform (All, Facebook, Instagram, Both)
  - Displays post content, media, and timestamp
  - Pagination support
  - Post status indicators

### Added - Frontend
- `PostsHistory.jsx` component
- Post cards with media preview
- Platform filter dropdown
- Responsive grid layout

### Added - Backend
- GET endpoint for user's post history
- Query parameters for filtering and pagination
- Sorting by creation date (newest first)

---

## [2.0.0] - 2025-12-05

### Added
- **Token Auto-Refresh** - Automatic Facebook token refresh
  - Background cron job runs daily
  - Refreshes tokens before 60-day expiry
  - Encrypted token storage
  - Token health monitoring

### Added - Backend
- `tokenService.js` - Token refresh logic
- `cronRefresh.js` - Scheduled token checks
- `cryptoStore.js` - Token encryption/decryption
- PageToken and UserToken models for separate token storage

### Security
- All access tokens now encrypted before storage
- Environment-based encryption key
- Secure token decryption on API calls

### Changed
- Moved tokens from User model to separate collections
- Enhanced error handling for expired tokens
- Added token expiry warnings in dashboard

---

## [1.0.0] - 2025-11-28 - Initial Release

### Added - Core Features
- **User Authentication**
  - Email/password registration and login
  - JWT-based authentication
  - Password hashing with bcrypt
  - Protected routes

- **Facebook Login**
  - OAuth 2.0 integration
  - Facebook profile data retrieval
  - Automatic account creation/login

- **Facebook & Instagram Integration**
  - Connect Facebook Pages
  - Link Instagram Business accounts
  - Multi-page support
  - Page selection for posting

- **Post Creation**
  - Text posts with optional media
  - Image and video upload
  - Cross-posting to Facebook and Instagram
  - Platform selection (FB only, IG only, or both)

- **Admin Dashboard**
  - View all users
  - View all posts
  - System statistics
  - User management

### Added - Backend
- Express.js server setup
- MongoDB integration with Mongoose
- User model with authentication
- Post model for content storage
- Facebook Graph API integration
- Instagram Graph API integration
- File upload handling
- Error handling middleware
- CORS configuration

### Added - Frontend
- React with Vite setup
- React Router for navigation
- Login/Register pages
- User Dashboard
- CreatePost form component
- Admin Dashboard
- Responsive UI design
- API utility functions

### Added - Documentation
- README.md with project overview
- CONNECT_GUIDE.md with setup instructions
- .gitignore for security
- MIT License

---

## Development Notes

### Facebook Requirements
- Facebook app must have HTTPS redirect URIs
- For local development, use ngrok or similar tunneling service
- Required permissions: `pages_show_list`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`
- Tokens expire after 60 days and require refresh

### Instagram Requirements
- Instagram account must be converted to Business account
- Must be linked to a Facebook Page
- Only supports posting to Instagram Business accounts (not personal)
- Image requirements: JPG, PNG (max 8MB)

### Twitter Requirements
- Twitter Developer account required
- App must have Read and Write permissions
- OAuth 1.0a flow for authentication
- Free tier: 500 posts/month (app-wide limit, shared across users)
- Callback URL must use HTTPS

### Token Management
- Facebook tokens expire every 60 days
- Auto-refresh implemented to prevent expiry
- Users notified when manual reconnection needed
- All tokens encrypted in database

### Timezone Handling
- All scheduled times stored in UTC
- Frontend displays and accepts IST (UTC+5:30)
- Automatic conversion between timezones
- Cron job runs every minute to check for due posts

---

## Migration Guide

### Upgrading from v6.x to v7.x
- No breaking changes
- Platform selection logic improved
- No database migrations required

### Upgrading from v5.x to v6.x
- No breaking changes
- Repost feature is additive
- No database migrations required

### Upgrading from v4.x to v5.x
- Update Post model to include `scheduledFor` and `status` fields
- Run migration script (if needed) to add status to existing posts:
db.posts.updateMany(
{ status: { $exists: false } },
{ $set: { status: 'published' } }
);

text

### Upgrading from v3.x to v4.x
- Set up Cloudinary account and add credentials to `.env`
- No database migrations required

### Upgrading from v2.x to v3.x
- No breaking changes
- Posts history is read-only feature

### Upgrading from v1.x to v2.x
- **Important**: Token encryption added
- Add `ENCRYPTION_KEY` to `.env` (32 characters)
- Run token migration script to encrypt existing tokens
- Backup database before migration

---

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check documentation in README.md and CONNECT_GUIDE.md
- Review closed issues for solutions to common problems

---

**Contributors:** Priya
**Repository:** https://github.com/pripriya09/tgsane_media_share
**License:** MIT