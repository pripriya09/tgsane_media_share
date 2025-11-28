// models/User.js  ← THIS MUST BE EXACTLY LIKE THIS
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true },
  passwordHash: String,
  role: { type: String, enum: ["superAdmin", "admin", "agent", "user"], default: "user" },
  createdAt: { type: Date, default: Date.now },

  // THIS WAS MISSING — NOW ADDED
  pages: [{
    pageId: String,
    pageName: String,
    pageAccessToken: String,
    instagramBusinessId: String,
  }],
});

// THIS LINE MUST BE "export default mongoose.model..."
const User = mongoose.model("User", UserSchema);
export default User;   // ← THIS IS CORRECT