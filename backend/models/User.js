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
  
  // Role & Timestamps
  role: { type: String, enum: ["superAdmin", "admin", "agent", "user"], default: "user" },
  createdAt: { type: Date, default: Date.now },
  
  // Connected Pages (only if Facebook connected)
  pages: [{
    pageId: String,
    pageName: String,
    pageAccessToken: String,
    instagramBusinessId: String,
  }],
});

const User = mongoose.model("User", UserSchema);
export default User;
