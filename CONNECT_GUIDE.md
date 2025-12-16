# Social Media Platform Connection Guide

Complete setup guide for connecting Facebook, Instagram, and Twitter to your social media management platform.

---

## 📑 Table of Contents

1. [Facebook & Instagram Setup](#facebook--instagram-setup)
2. [Twitter (X) Setup](#twitter-x-setup)
3. [Local Development with HTTPS](#local-development-with-https)
4. [API Workflows](#api-workflows)
5. [Troubleshooting](#troubleshooting)

---

## 🔵 Facebook & Instagram Setup

### Prerequisites
- Facebook account
- Instagram account
- Facebook Page (for business)
- Facebook Developer account

---

### Step 1: Convert Instagram to Professional (Business) Account

1. **Open Instagram app** on your mobile device
2. Go to **Profile** → **Menu** (☰)
3. **Settings and Privacy** → **Account type and tools**
4. **Switch to Professional Account** → **Business**
5. Follow the prompts to complete setup

✅ **Verification**: Your profile should now show business tools like "Professional Dashboard"

---

### Step 2: Create/Configure Facebook Page

1. Go to [facebook.com](https://facebook.com)
2. Click **Pages** from left menu
3. Click **Create New Page**
4. Fill in page details:
   - Page name
   - Category
   - Description
5. Click **Create Page**

✅ **Verification**: You should see your new page in the Pages list

---

### Step 3: Connect Instagram to Facebook Page

**Method A: From Instagram**
1. Instagram app → **Profile** → **Edit Profile**
2. **Public business information** → **Page**
3. Select your Facebook Page
4. Tap **Done**

**Method B: From Facebook Page**
1. Go to your Facebook Page
2. **Settings** → **Instagram**
3. Click **Connect Account**
4. Log in to Instagram
5. Confirm connection

✅ **Verification**: 
- Instagram: **Settings & Privacy** → **Accounts Center** → Should show connected Page
- Facebook: **Page Settings** → **Linked Accounts** → Should show Instagram

---

### Step 4: Create Facebook Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Select **Business** as app type
4. Fill in app details:
   - **App Name**: Your platform name
   - **App Contact Email**: Your email
5. Click **Create App**

---

### Step 5: Configure Facebook App Settings

#### A. Basic Settings

1. In your app dashboard, go to **Settings** → **Basic**
2. Note down:
   - **App ID** (save to `.env` as `FB_APP_ID`)
   - **App Secret** (save to `.env` as `FB_APP_SECRET`)
3. Add **App Domains**: 
   - For local: Your ngrok domain (e.g., `abc123.ngrok.io`)
   - For production: Your domain (e.g., `yoursite.com`)
4. **Privacy Policy URL**: Add your privacy policy URL
5. Click **Save Changes**

#### B. Add Facebook Login Product

1. From left menu, click **Add Product**
2. Find **Facebook Login** → Click **Set Up**
3. Choose **Web** platform
4. Enter your site URL (with HTTPS)

#### C. Configure OAuth Redirect URIs

1. Go to **Facebook Login** → **Settings**
2. Under **Valid OAuth Redirect URIs**, add:
For local development (using ngrok)
https://your-ngrok-url.ngrok.io/auth/facebook/callback

For production
https://yoursite.com/auth/facebook/callback

text
3. Click **Save Changes**

#### D. Request Permissions

1. Go to **App Review** → **Permissions and Features**
2. Request the following permissions:
- ✅ `pages_show_list` - List user's pages
- ✅ `pages_manage_posts` - Post to pages
- ✅ `instagram_basic` - Access Instagram account
- ✅ `instagram_content_publish` - Publish to Instagram
- ✅ `pages_read_engagement` - Read engagement (optional)

3. For each permission:
- Click **Request Advanced Access**
- Fill in usage details
- Submit for review (may take 1-2 days)

**Note**: During development, you can test with Standard Access on test accounts.

---

### Step 6: Test Facebook Login Flow

1. Start your backend server:
cd backend
npm run dev

text

2. Start your frontend (with ngrok for HTTPS):
cd frontend
npm run dev

In another terminal
ngrok http 5173

text

3. Visit your ngrok URL and test Facebook Login:
- Click "Login with Facebook"
- Authorize your app
- Grant page permissions
- You should be redirected back to your dashboard

✅ **Verification**: Check if user's pages appear in the dashboard

---

## 🐦 Twitter (X) Setup

### Step 1: Create Twitter Developer Account

1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Click **Sign up** (or log in)
3. Complete developer application:
- **Use case**: Social media management tool
- **Description**: Platform for scheduling and posting tweets
4. Verify your email
5. Accept terms and conditions

✅ **Verification**: You should see the Developer Portal dashboard

---

### Step 2: Create Twitter App

1. In Developer Portal, go to **Projects & Apps**
2. Click **Create App** (or create a project first)
3. Fill in app details:
- **App name**: Your platform name (e.g., "SocialMediaManager")
- **Description**: Brief description of your platform
4. Click **Complete**

---

### Step 3: Configure App Settings

1. Click on your app name
2. Go to **Settings** tab

#### A. App Permissions
1. Under **User authentication settings**, click **Set up**
2. Enable **OAuth 1.0a**
3. **App permissions**: Select **Read and Write**
4. **Type of App**: **Web App**

#### B. Callback URLs
1. Add **Callback URL / Redirect URL**:
For local (via ngrok)
https://your-ngrok-url.ngrok.io/api/twitter/callback

For production
https://yourapi.com/api/twitter/callback

text

2. Add **Website URL**:
https://your-ngrok-url.ngrok.io

or your production URL
text

3. Click **Save**

---

### Step 4: Get API Keys

1. Go to **Keys and tokens** tab
2. Note down (save to `.env`):
- **API Key** → `TWITTER_API_KEY`
- **API Key Secret** → `TWITTER_API_SECRET`
3. Under **Authentication Tokens**:
- Click **Generate** for Access Token and Secret
- **Access Token** → Save for testing
- **Access Token Secret** → Save for testing
4. **Bearer Token** → `TWITTER_BEARER_TOKEN`

**Important**: Keep these keys secure! Never commit them to Git.

---

### Step 5: Configure Backend Environment

Add to `backend/.env`:
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/twitter/callback

text

---

### Step 6: Test Twitter Connection

1. Ensure backend is running with ngrok
2. In your app, navigate to **Connect Twitter** page
3. Click **Connect Twitter Account**
4. You'll be redirected to Twitter
5. **Authorize app**
6. You'll be redirected back to your app

✅ **Verification**: Twitter username should appear in your dashboard

---

### Step 7: Test Posting to Twitter

1. Go to **Create Post**
2. Select your connected Twitter account
3. Write a tweet
4. Click **Post Now**

✅ **Verification**: Check your Twitter account for the new tweet

---

## 🔒 Local Development with HTTPS

Facebook and Twitter require HTTPS for OAuth. Here's how to set it up locally:

### Option 1: ngrok (Recommended)

**Install ngrok:**
Download from ngrok.com or use package manager
brew install ngrok # Mac
choco install ngrok # Windows

text

**Expose frontend (port 5173):**
ngrok http 5173

text

**Expose backend (port 5000):**
ngrok http 5000

text

**Update your configs:**
- Facebook App: Add ngrok URL to OAuth redirect URIs
- Twitter App: Add ngrok URL to callback URLs
- Frontend: Update API URL to backend's ngrok URL

---

### Option 2: localtunnel

npm install -g localtunnel

Expose frontend
lt --port 5173 --subdomain myapp

Expose backend
lt --port 5000 --subdomain myapp-api

text

---

### Option 3: Cloudflare Tunnel (cloudflared)

Install cloudflared
brew install cloudflared

Tunnel frontend
cloudflared tunnel --url localhost:5173

Tunnel backend
cloudflared tunnel --url localhost:5000

text

---

### Option 4: Deploy to Staging

Deploy your app to:
- **Vercel** (frontend)
- **Heroku / Railway** (backend)
- **Render** (full-stack)

Use the production HTTPS URLs for development testing.

---

## 📡 API Workflows

### Facebook/Instagram Posting Workflow

#### 1. Get User's Pages
GET https://graph.facebook.com/v18.0/me/accounts
?access_token={USER_ACCESS_TOKEN}

text

**Response:**
{
"data": [
{
"id": "PAGE_ID",
"name": "Page Name",
"access_token": "PAGE_ACCESS_TOKEN"
}
]
}

text

#### 2. Check Instagram Connection
GET https://graph.facebook.com/v18.0/{PAGE_ID}
?fields=instagram_business_account
&access_token={PAGE_ACCESS_TOKEN}

text

**Response:**
{
"instagram_business_account": {
"id": "IG_ACCOUNT_ID"
}
}

text

#### 3. Post to Facebook
POST https://graph.facebook.com/v18.0/{PAGE_ID}/photos
?url={IMAGE_URL}
&message={POST_TEXT}
&access_token={PAGE_ACCESS_TOKEN}

text

#### 4. Post to Instagram

**Step A: Create container**
POST https://graph.facebook.com/v18.0/{IG_ACCOUNT_ID}/media
?image_url={IMAGE_URL}
&caption={POST_TEXT}
&access_token={PAGE_ACCESS_TOKEN}

text

**Response:**
{ "id": "CREATION_ID" }

text

**Step B: Publish container**
POST https://graph.facebook.com/v18.0/{IG_ACCOUNT_ID}/media_publish
?creation_id={CREATION_ID}
&access_token={PAGE_ACCESS_TOKEN}

text

---

### Twitter Posting Workflow

#### 1. Upload Media (if posting image)
POST https://upload.twitter.com/1.1/media/upload.json
Headers:
Authorization: OAuth 1.0a signature
Body:
media: base64_encoded_image

text

**Response:**
{ "media_id_string": "MEDIA_ID" }

text

#### 2. Create Tweet
POST https://api.twitter.com/2/tweets
Headers:
Authorization: OAuth 1.0a signature
Content-Type: application/json
Body:
{
"text": "Your tweet text",
"media": {
"media_ids": ["MEDIA_ID"]
}
}

text

---

## 🔧 Troubleshooting

### Facebook/Instagram Issues

**"Invalid OAuth Redirect URI"**
- ✅ Solution: Add your exact callback URL (with HTTPS) to Facebook App settings → Facebook Login → Valid OAuth Redirect URIs

**"Instagram account not found"**
- ✅ Solution: Make sure Instagram is converted to Business account and linked to Facebook Page

**"(#200) Requires pages_manage_posts permission"**
- ✅ Solution: Request Advanced Access for permissions in App Review section

**"Token expired"**
- ✅ Solution: Implement token refresh logic (see `tokenService.js`)

---

### Twitter Issues

**"Callback URL not approved"**
- ✅ Solution: Add exact callback URL in Twitter Developer Portal → App Settings → Authentication settings

**"Read-only application"**
- ✅ Solution: Change app permissions to "Read and Write" in Twitter Developer Portal

**"401 Unauthorized"**
- ✅ Solution: Check OAuth signature is correctly generated with proper keys

**"429 Too Many Requests"**
- ✅ Solution: You've hit rate limits. Free tier allows 500 posts/month. Implement rate limiting.

---

### HTTPS/Local Development Issues

**"Redirect URI must be HTTPS"**
- ✅ Solution: Use ngrok or another tunneling service for local development

**"Unable to verify app"**
- ✅ Solution: Make sure all URLs in developer consoles match your actual URLs (including http/https)

---

### Token Refresh Issues

**"Token refresh failed"**
- ✅ Solution: User needs to manually reconnect account. Implement UI notification.

**"No valid access token"**
- ✅ Solution: Check token encryption/decryption is working correctly

---

## 🎯 Quick Reference

### Required Environment Variables

Backend .env
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_CALLBACK_URL=https://your-domain/api/twitter/callback
MONGODB_URI=mongodb://localhost:27017/social-media
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
ENCRYPTION_KEY=your_32_char_encryption_key

text

### Useful Links
- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [ngrok Download](https://ngrok.com/download)
- [Instagram API Docs](https://developers.facebook.com/docs/instagram-api)

---

**Need help?** Open an issue on GitHub or check the main README.md for support options.
