import mongoose from "mongoose";

const UserTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  longUserToken: String, // encrypted
  tokenObtainedAt: Date,
  expiresAt: Date,
});

export default mongoose.model("UserToken", UserTokenSchema);
