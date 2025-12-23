import mongoose from "mongoose";

const mediaGallerySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    index: true 
  },
  type: { 
    type: String, 
    enum: ["image", "video"], 
    required: true 
  },
  url: { type: String, required: true },
  originalName: String,
  cloudinaryId: String,
}, { 
  timestamps: true 
});

export default mongoose.model("MediaGallery", mediaGallerySchema);
