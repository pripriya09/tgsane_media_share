// models/MediaGallery.js
import mongoose from "mongoose";

const mediaGallerySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    enum: ["image", "video"],
    required: true,
  },
  originalName: {
    type: String,
    default: "",
  },
  size: {
    type: Number,
    default: 0,
  },
  format: {
    type: String,
    default: "",
  },
  isShared: {
    type: Boolean,
    default: false,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
mediaGallerySchema.index({ userId: 1, uploadedAt: -1 });
mediaGallerySchema.index({ userId: 1, url: 1 });
mediaGallerySchema.index({ isShared: 1, uploadedAt: -1 }); // ✅ NEW INDEX

const MediaGallery = mongoose.model("MediaGallery", mediaGallerySchema);

export default MediaGallery;
