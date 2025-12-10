import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pageId: { type: String, required: true },
  title: { type: String },
  type: { type: String, enum: ["image", "video", "carousel","story"], required: true },
  
  // CORRECT WAY — ARRAY OF OBJECTS
  items: [
    {
      type: { type: String, enum: ["image", "video"] },
      url: { type: String, required: true }
    }
  ],
  
  image: String,
  videoUrl: String,
  fbPostId: String,
  igMediaId: String,
  status: { type: String, default: "posted" },
  postedAt: { type: Date, default: Date.now },
  expiresAt: {type: Date,default: null}

});

export default mongoose.model("Post", PostSchema);