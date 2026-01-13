// backend/models/ScheduledPost.js
import mongoose from "mongoose";

const scheduledPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
  caption: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["image", "video", "carousel", "text", "story"],
    required: true,
  },
  image: {
    type: String,
    default: null,
  },
  videoUrl: {
    type: String,
    default: null,
  },
  items: {
    type: Array,
    default: [],
  },
  platform: {
    type: [String],
    enum: ["facebook", "instagram", "twitter", "linkedin", "youtube"], // ✅ YouTube added
    required: true,
  },
  selectedPages: {
    type: [String],
    default: [],
  },
  pageId: {
    type: String,
    default: null,
  },
  scheduledFor: {
    type: Date,
    required: true,
  },
  hashtags: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ["scheduled", "posted", "failed"],
    default: "scheduled",
  },
  
  // ✅ YouTube-specific fields (NEW)
  youtubeTitle: {
    type: String,
    default: null,
  },
  youtubeDescription: {
    type: String,
    default: null,
  },
  youtubeTags: {
    type: [String],
    default: [],
  },
  youtubePrivacy: {
    type: String,
    enum: ["public", "private", "unlisted"],
    default: "public",
  },
  youtubeCategory: {
    type: String,
    default: "22", // People & Blogs
  },
  
  // Results and retry logic
  results: {
    type: Array, // ✅ Changed from Object to Array to match platformResults structure
    default: [],
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
  
  error: {
    type: String,
    default: null,
  },
  postedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient querying
scheduledPostSchema.index({ userId: 1, scheduledFor: 1 });
scheduledPostSchema.index({ status: 1, scheduledFor: 1 });

const ScheduledPost = mongoose.model("ScheduledPost", scheduledPostSchema);

export default ScheduledPost;
