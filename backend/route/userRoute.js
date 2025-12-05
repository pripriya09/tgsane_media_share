// userRoute.js
import express from "express";
import { connectFacebook, getConnectedPages, postToChannels,getPostStats } from "../controller/userController.js";
import { ensureAuth } from "../utils/auth.js";
import Post from "../models/Post.js";  // ← Already imported — perfect!

const router = express.Router();

router.post("/connect/facebook", ensureAuth(), connectFacebook);
router.get("/pages", ensureAuth(), getConnectedPages);
router.post("/post", ensureAuth(), postToChannels);
// userRoute.js - ADD THIS LINE
router.get("/post-stats", ensureAuth(), getPostStats);

// ADD THIS NEW ROUTE — RIGHT HERE!
router.get("/posts", ensureAuth(), async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.userId })
      .sort({ postedAt: -1 })
      .limit(50)
      .select("-__v"); // optional: hide MongoDB version field

    return res.json({ posts });
  } catch (err) {
    console.error("Get posts error:", err);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});



// DELETE a specific post
router.delete("/posts/:postId", ensureAuth(), async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await Post.findById(postId);
  
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
  
      // Ensure user owns this post
      if (String(post.userId) !== String(req.user.userId)) {
        return res.status(403).json({ error: "Not authorized to delete this post" });
      }
  
      await Post.findByIdAndDelete(postId);
      console.log(`Deleted post ${postId} for user ${req.user.userId}`);
  
      return res.json({ success: true, message: "Post deleted" });
    } catch (err) {
      console.error("Delete post error:", err);
      return res.status(500).json({ error: "Failed to delete post" });
    }
  });
  
export default router;