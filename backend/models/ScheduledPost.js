// models/ScheduledPost.js
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
    enum: ["facebook", "instagram", "twitter", "linkedin"],
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
  results: {
    type: Object,
    default: {},
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

    // ✅ ADD THESE:
    retryCount: {
        type: Number,
        default: 0
      },
      maxRetries: {
        type: Number,
        default: 3
      },
      results: {
        type: Object,
        default: {}
      }

});

// Index for efficient querying
scheduledPostSchema.index({ userId: 1, scheduledFor: 1 });
scheduledPostSchema.index({ status: 1, scheduledFor: 1 });

const ScheduledPost = mongoose.model("ScheduledPost", scheduledPostSchema);

export default ScheduledPost;
