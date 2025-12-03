import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true },
  passwordHash: String,
  facebookId: { type: String, unique: true, sparse: true }, // ← ADD THIS
  role: { type: String, enum: ["superAdmin", "admin", "agent", "user"], default: "user" },
  createdAt: { type: Date, default: Date.now },
  
  pages: [{
    pageId: String,
    pageName: String,
    pageAccessToken: String,
    instagramBusinessId: String,
  }],
});

const User = mongoose.model("User", UserSchema);
export default User;
