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


## let`s start now=====================================================================================================================================================================================================


# Social Media Management Platform

A comprehensive social media management platform that allows users to create, schedule, and publish content across multiple social media platforms from a single dashboard.

## 🚀 Features

### Multi-Platform Support
- **Facebook** - Post text, images, and videos to your Facebook pages
- **Instagram** - Share photos and videos to your Instagram business account
- **Twitter (X)** - Tweet with media support
- **Cross-Platform Posting** - Publish to multiple platforms simultaneously

### Content Management
- **Create Posts** - Rich text editor with media upload support
- **Schedule Posts** - Schedule content for future publishing with timezone support (IST)
- **Repost/Duplicate** - Easily repost previous content with one click
- **Posts History** - View all published and scheduled posts with filtering options
- **Media Library** - Upload and manage images/videos with Cloudinary integration

### Account Management
- **Multi-Account Support** - Connect multiple Facebook pages and Instagram accounts
- **Twitter OAuth Integration** - Secure Twitter account connection
- **Token Management** - Automatic token refresh for Facebook/Instagram
- **Account Selection** - Choose which page/account to post from

### Authentication
- **Site Login** - Traditional email/password authentication
- **Facebook Login** - OAuth login via Facebook
- **Admin Dashboard** - Separate admin panel for platform management
- **User Dashboard** - Personalized dashboard for each user

## 📁 Project Structure

├── backend/
│ ├──>> controllers/
│ │ ├── userController.js # User auth, posts, Facebook/Instagram
│ │ ├── twitterController.js # Twitter OAuth and posting
│ │ └── adminController.js # Admin functions
│ ├──>> models/
│ │ ├── User.js # User schema
│ │ ├── Post.js # Post schema
│ │ ├── PageToken.js # Facebook page tokens
│ │ └── UserToken.js # User OAuth tokens
│ ├──>> routes/
│ │ ├── userRoute.js # User API routes
│ │ └── adminRoute.js # Admin API routes
│ ├──>>middleware/utils/
│ │ |── auth.js # Authentication middleware
│ | |__postHelper.js
│ │ ├── tokenService.js # Token refresh logic
│ │ ├── cronRefresh.js # Scheduled token refresh
│ │ ├── cryptoStore.js # Token encryption
│ │ |── cloudinaryHelper.js # Media upload helper
| | |__postScheduler.js
│ |
| |__>>app.js # Express server
│
├── frontend/
│ ├── src/
│ │ ├── MEDIA_SHARE/
│ │ │ ├── Login.jsx # Login page (site + Facebook)
│ │ │ ├── Dashboard.jsx # User dashboard
│ │ │ ├── CreatePost.jsx # Post creation form
│ │ │ ├── PostsHistory.jsx # View all posts
│ │ │ ├── LogMedia.jsx # Media library
│ │ │ ├── TwitterConnect.jsx # Twitter connection
│ │ │ ├── TwitterCallback.jsx # Twitter OAuth callback
│ │ │ └── AdminDashboard.jsx # Admin panel
│ │ | |__Display.jsx
| | | |_Home.jsx
| | | |
│ │ │ └── api.jsx # API helper functions
│ │ └── AppRoutes.jsx # React Router setup
│ └── Main.jsx   # i am not using app.jsx,content.jsx, etc other then these
| |__index.html  # save facebook sdk
| |_package.json
| |__package-lock_json
│
├── CONNECT_GUIDE.md # Detailed setup instructions
├── CHANGELOG.md # Version history
└── README.md # This file

## ---------------------------------------------------------------


## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Facebook Developer Account
- Twitter Developer Account
- Cloudinary Account

### Backend Setup

1. **Clone the repository**
git clone <your-repo-url>
cd backend

text

2. **Install dependencies**
npm install

text

3. **Create `.env` file**
Server
PORT=5000
NODE_ENV=development

MongoDB
MONGODB_URI=mongodb://localhost:27017/social-media-platform

JWT
JWT_SECRET=your_jwt_secret_key

Facebook App
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret

Twitter (X) API
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

Encryption
ENCRYPTION_KEY=your_32_character_encryption_key

text

4. **Start the server**
npm run dev

text

### Frontend Setup

1. **Navigate to frontend**
cd frontend

text

2. **Install dependencies**
npm install

text

3. **Create `.env` file** (if needed)
VITE_API_URL=http://localhost:5000
VITE_FB_APP_ID=your_facebook_app_id

text

4. **Start development server**
npm run dev


The app will be available at `http://localhost:5173`,`http://localhost:5174`

## 📚 Detailed Setup Guides

### Facebook & Instagram Setup
See [CONNECT_GUIDE.md](./CONNECT_GUIDE.md) for detailed instructions on:
- Converting Instagram to Business account
- Connecting Instagram to Facebook Page
- Setting up Facebook App
- Configuring OAuth permissions
- API workflow

### Twitter Setup
See [CONNECT_GUIDE.md](./CONNECT_GUIDE.md) for:
- Twitter Developer Portal setup
- OAuth 1.0a configuration
- App permissions
- Callback URL setup

## 🔑 Required API Permissions

### Facebook/Instagram
- `pages_show_list` - List user's Facebook pages
- `pages_manage_posts` - Post to Facebook pages
- `instagram_basic` - Access Instagram account info
- `instagram_content_publish` - Publish to Instagram
- `pages_read_engagement` - Read page insights (optional)

### Twitter
- Read and write access
- Tweet permissions
- Media upload permissions

## 📖 Usage

### Creating a Post

1. **Login** to your account
2. **Connect Accounts** - Link Facebook, Instagram, and Twitter
3. **Select Page/Account** - Choose which page/account to post from
4. **Create Post**:
   - Enter your content
   - Upload media (optional)
   - Select platforms (Facebook, Instagram, Twitter)
   - Choose to post now or schedule for later
5. **Publish** or **Schedule**

### Scheduling Posts

1. In the Create Post form, toggle **"Schedule Post"**
2. Select date and time (IST timezone)
3. Content will be published automatically at scheduled time

### Reposting Content

1. Go to **Posts History**
2. Find the post you want to repost
3. Click **"Repost"** button
4. Edit content if needed
5. Select new platforms/accounts
6. Publish or schedule again

### Managing Accounts

- **Dashboard** - View connected accounts and token status
- **Reconnect** - Refresh expired tokens
- **Switch Accounts** - Choose different pages/accounts for posting

## 🔄 Token Management

The platform automatically:
- Refreshes Facebook/Instagram tokens before expiry
- Runs daily cron job to check token health
- Notifies users when manual reconnection is needed
- Encrypts and securely stores all tokens

## 🚀 Deployment

### Backend Deployment (Example: Heroku)
Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret

... (set all env vars)
Deploy
git push heroku main

text

### Frontend Deployment (Example: Vercel)
Install Vercel CLI
npm i -g vercel

Deploy
cd frontend
vercel --prod

text

**Important**: Update OAuth redirect URLs in Facebook and Twitter developer consoles with your production URLs.

## 🐛 Troubleshooting

### Common Issues

**Facebook/Instagram not posting:**
- Check if Instagram is converted to Business account
- Verify Instagram is linked to Facebook Page
- Ensure tokens are not expired (check Dashboard)
- Verify API permissions in Facebook App settings

**Twitter not connecting:**
- Check callback URL matches Twitter app settings
- Verify API keys are correct
- Ensure app has Read and Write permissions

**Scheduled posts not publishing:**
- Check if server is running continuously
- Verify timezone settings (should be IST)
- Check MongoDB connection

**Media upload failing:**
- Verify Cloudinary credentials
- Check file size limits (max 10MB)
- Ensure supported formats (jpg, png, mp4)

## 📊 API Rate Limits

### Twitter Free Tier
- 500 posts/month (app-level limit)
- Shared across all users
- Consider implementing user-level API keys for scalability

### Facebook/Instagram
- Rate limits are per app and per user
- Generally sufficient for normal usage
- Token refresh required every 60 days

## 🔒 Security

- All tokens are encrypted before storage
- JWT authentication for API access
- CORS protection enabled
- Environment variables for sensitive data
- Secure password hashing with bcrypt

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check [CONNECT_GUIDE.md](./CONNECT_GUIDE.md) for setup help
- Review [CHANGELOG.md](./CHANGELOG.md) for recent updates

## 🎯 Roadmap

- [ ] LinkedIn integration
- [ ] YouTube Shorts support
- [ ] Analytics dashboard
- [ ] Bulk post upload
- [ ] Calendar view for scheduled posts
- [ ] User API key support for Twitter
- [ ] Advanced media editing
- [ ] Hashtag suggestions
- [ ] Post templates

---

**Made with ❤️ for social media managers**
