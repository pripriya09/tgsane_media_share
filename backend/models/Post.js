// models/Post.js - ADD YOUTUBE SUPPORT

import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pageId: { type: String },
  title: { type: String },
  caption: { type: String },
  
  type: {
    type: String,
    enum: ["image", "video", "carousel", "story", "tweet", "youtube"], // ✅ ADD "youtube"
    required: true
  },
  
  platform: {
    type: [String],
    enum: ["facebook", "instagram", "twitter", "linkedin", "youtube"], // ✅ ADD "youtube"
    required: true,
    default: []
  },

  // Hashtags and Mentions
  hashtags: [{
    type: String,
    trim: true
  }],
  
  mentions: [{
    platform: String,
    username: String
  }],

  // For carousel posts
  items: [{
    type: { type: String, enum: ["image", "video"] },
    url: { type: String, required: true }
  }],

  // Single media
  image: String,
  videoUrl: String,

  // ✅ YouTube-specific fields
  youtubeVideoId: String, // YouTube video ID
  youtubeTitle: String, // Video title (required for YouTube)
  youtubeDescription: String, // Video description
  youtubeTags: [String], // Video tags
  youtubePrivacy: { type: String, enum: ["public", "private", "unlisted"], default: "public" },
  youtubeCategory: { type: String, default: "22" }, // 22 = People & Blogs

  // Platform-specific IDs
  fbPostId: String,
  igMediaId: String,
  tweetId: String,
  linkedinPostId: String,

  // Scheduling fields
  status: {
    type: String,
    enum: ["draft", "scheduled", "posted", "failed", "deleted"],
    default: "posted"
  },
  
  scheduledFor: {
    type: Date,
    index: true
  },

  // Platform-specific results
  platformResults: [{
    platform: String,
    success: Boolean,
    postId: String,
    error: String,
    publishedAt: Date
  }],

  // Retry logic
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  postedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PostSchema.index({ scheduledFor: 1, status: 1 });

export default mongoose.model("Post", PostSchema);
