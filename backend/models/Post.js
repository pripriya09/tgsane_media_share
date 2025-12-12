// models/Post.js
import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pageId: { type: String }, // Optional for Twitter (Twitter doesn't use pageId)
  title: { type: String },
  caption: { type: String }, // Add caption field for Twitter text
  
  type: { 
    type: String, 
    enum: ["image", "video", "carousel", "story", "tweet"],
    required: true 
  },
  
  // ✅ CHANGED: platform is now an array
  platform: { 
    type: [String], // Array of strings
    enum: ["facebook", "instagram", "twitter"],
    required: true,
    default: []
  },
  
  // For carousel posts (FB/IG)
  items: [
    {
      type: { type: String, enum: ["image", "video"] },
      url: { type: String, required: true }
    }
  ],
  
  // Single media (all platforms)
  image: String,
  videoUrl: String,
  
  // Platform-specific IDs
  fbPostId: String, // Facebook post ID
  igMediaId: String, // Instagram media ID
  tweetId: String, // Twitter tweet ID
  
  // Status & timestamps
  status: { type: String, default: "posted" },
  postedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null }
});

export default mongoose.model("Post", PostSchema);
