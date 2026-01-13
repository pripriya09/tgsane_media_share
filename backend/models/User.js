// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  // Site Login
  name: String,
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, sparse: true },
  passwordHash: String, // For site login
  
  // Facebook Connection
  facebookId: { type: String, unique: true, sparse: true },
  facebookConnected: { type: Boolean, default: false },
  
  // Twitter Connection (ADD THESE) ✅
  twitterId: { type: String, unique: true, sparse: true }, // Unique Twitter ID
  twitterConnected: { type: Boolean, default: false }, // Tracks if Twitter is connected
  twitterUsername: String, // @username
  twitterName: String, // Display name
  twitterAccessToken: String, // OAuth 1.0a access token
  twitterAccessSecret: String, // OAuth 1.0a access secret
  twitterOauthTokenSecret: String, // Temporary during OAuth flow
  


 // YOUTUBE CONNECTION ✅ (FIXED)
  // ========================================
  youtubeId: { type: String, unique: true, sparse: true }, // YouTube channel ID
  youtubeConnected: { type: Boolean, default: false },
  youtubeAccessToken: String, // OAuth 2.0 access token
  youtubeRefreshToken: String, // OAuth 2.0 refresh token
  youtubeTokenExpiry: Date, // When token expires
  youtubeChannelId: String, // YouTube channel ID (same as youtubeId but kept for consistency)
  youtubeChannelName: String, // Channel title
  youtubeChannelImage: String, // Channel thumbnail

  
  // Role & Timestamps
  role: { type: String, enum: ["superAdmin", "admin", "agent", "user"], default: "user" },
  createdAt: { type: Date, default: Date.now },
  
   linkedin: {
    accessToken: String,      // encrypted
    userId: String,           // LinkedIn member id (sub)
    name: String,
    email: String,
    picture: String,
    connected: { type: Boolean, default: false },
    tokenExpiry: Date
  },
  
  // Connected Pages (only if Facebook connected)
  pages: [{
    pageId: String,
    pageName: String,
    pageAccessToken: String,
    instagramBusinessId: String,
    instagramUsername: String,
    instagramProfilePicture: String, 
  }],
});

const User = mongoose.model("User", UserSchema);
export default User;
