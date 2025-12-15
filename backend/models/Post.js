// models/Post.js - UPDATED VERSION
import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pageId: { type: String }, // Optional for Twitter
  title: { type: String },
  caption: { type: String }, // Caption for all platforms
  type: {
    type: String,
    enum: ["image", "video", "carousel", "story", "tweet"],
    required: true
  },
  
  platform: {
    type: [String],
    enum: ["facebook", "instagram", "twitter"],
    required: true,
    default: []
  },
  
  // ✅ NEW: Hashtags and Mentions
  hashtags: [{
    type: String,
    trim: true
  }],
  mentions: [{
    platform: String,
    username: String
  }],
  
  // For carousel posts (FB/IG)
  items: [{
    type: { type: String, enum: ["image", "video"] },
    url: { type: String, required: true }
  }],
  
  // Single media
  image: String,
  videoUrl: String,
  
  // Platform-specific IDs
  fbPostId: String,
  igMediaId: String,
  tweetId: String,
  
  // ✅ NEW: Scheduling fields
  status: { 
    type: String, 
    enum: ["draft", "scheduled", "posted", "failed", "deleted"],
    default: "posted" 
  },
  scheduledFor: { 
    type: Date,
    index: true // For faster scheduler queries
  },
  
  // ✅ NEW: Platform-specific results
  platformResults: [{
    platform: String,
    success: Boolean,
    postId: String,
    error: String,
    publishedAt: Date
  }],
  
  // ✅ NEW: Retry logic
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  
  postedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ✅ Index for scheduler to find due posts quickly
PostSchema.index({ scheduledFor: 1, status: 1 });

export default mongoose.model("Post", PostSchema);
