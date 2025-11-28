import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pageId: String,
  title: String,
  image: String,
  fbPostId: String,
  igMediaId: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Post", PostSchema);
