// /mnt/data/PageToken.js
import mongoose from "mongoose";

const PageTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pageId: { type: String, required: true },
  pageName: { type: String },
  pageAccessToken: { type: String }, // encrypted value
  instagramBusinessId: { type: String, default: null },
  obtainedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("PageToken", PageTokenSchema);
