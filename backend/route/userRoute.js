// userRoute.js
import express from "express";
import multer from "multer"; // ✅ ADD THIS
import { 
  connectFacebook, 
  getConnectedPages, 
  postToChannels,
  checkRateLimits,
  getPostStats,  
  postStory,
  createScheduledPost, 
  getScheduledPosts, 
  updateScheduledPost, 
  deleteScheduledPost,
} from "../controller/userController.js";
import { ensureAuth } from "../utils/auth.js";
import Post from "../models/Post.js";

// Import Twitter controller ✅
import {
  requestTwitterAuth,
  handleTwitterCallback,
  disconnectTwitter,
  getTwitterStatus,
  // postToTwitter,
  deleteTwitterPost,
  getTwitterPosts
} from '../controller/twitterController.js';



const router = express.Router();

// ✅ ADD: Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Facebook routes
router.post("/connect/facebook", ensureAuth(), connectFacebook);
router.get("/pages", ensureAuth(), getConnectedPages);
router.post("/post", ensureAuth(), postToChannels);
router.get("/post-stats", ensureAuth(), getPostStats);

// Get all posts
router.get("/posts", ensureAuth(), async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.userId })
      .sort({ postedAt: -1 })
      .limit(50)
      .select("-__v");

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

// Instagram rate limits and story
router.post("/rate-limits", ensureAuth(), checkRateLimits); 
router.post("/story", ensureAuth(), postStory);

// === TWITTER ROUTES ✅ ===
// Authentication
router.post('/twitter/auth/request', ensureAuth(), requestTwitterAuth);
router.post('/twitter/auth/callback', ensureAuth(), handleTwitterCallback);
router.post('/twitter/disconnect', ensureAuth(), disconnectTwitter);
router.get('/twitter/status', ensureAuth(), getTwitterStatus);

// Posting
// router.post('/twitter/post', ensureAuth(), upload.single('media'), postToTwitter);
router.delete('/twitter/post/:tweetId', ensureAuth(), deleteTwitterPost);
router.get('/twitter/posts', ensureAuth(), getTwitterPosts);

// post schedule
router.post("/schedule-post", ensureAuth(), createScheduledPost);
router.get("/scheduled-posts", ensureAuth(), getScheduledPosts);
router.put("/schedule-post/:postId", ensureAuth(), updateScheduledPost);
router.delete("/schedule-post/:postId", ensureAuth(), deleteScheduledPost);

export default router;













//   // In your user routes file
// router.patch("/posts/:id", ensureAuth(), async (req, res) => {
//   try {
//     const post = await Post.findByIdAndUpdate(
//       req.params.id,
//       { $set: req.body },
//       { new: true }
//     );
//     res.json({ success: true, post });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
  




// // userRoute.js
// import express from "express";
// import { connectFacebook, getConnectedPages, postToChannels,getPostStats } from "../controller/userController.js";
// import { ensureAuth } from "../utils/auth.js";
// import Post from "../models/Post.js";  // ← Already imported — perfect!

// const router = express.Router();

// router.post("/connect/facebook", ensureAuth(), connectFacebook);
// router.get("/pages", ensureAuth(), getConnectedPages);
// router.post("/post", ensureAuth(), postToChannels);
// // userRoute.js - ADD THIS LINE
// router.get("/post-stats", ensureAuth(), getPostStats);

// // ADD THIS NEW ROUTE — RIGHT HERE!
// router.get("/posts", ensureAuth(), async (req, res) => {
//   try {
//     const posts = await Post.find({ userId: req.user.userId })
//       .sort({ postedAt: -1 })
//       .limit(50)
//       .select("-__v"); // optional: hide MongoDB version field

//     return res.json({ posts });
//   } catch (err) {
//     console.error("Get posts error:", err);
//     return res.status(500).json({ error: "Failed to fetch posts" });
//   }
// });



// // DELETE a specific post
// router.delete("/posts/:postId", ensureAuth(), async (req, res) => {
//     try {
//       const { postId } = req.params;
//       const post = await Post.findById(postId);
  
//       if (!post) {
//         return res.status(404).json({ error: "Post not found" });
//       }
  
//       // Ensure user owns this post
//       if (String(post.userId) !== String(req.user.userId)) {
//         return res.status(403).json({ error: "Not authorized to delete this post" });
//       }
  
//       await Post.findByIdAndDelete(postId);
//       console.log(`Deleted post ${postId} for user ${req.user.userId}`);
  
//       return res.json({ success: true, message: "Post deleted" });
//     } catch (err) {
//       console.error("Delete post error:", err);
//       return res.status(500).json({ error: "Failed to delete post" });
//     }
//   });
  
// export default router;