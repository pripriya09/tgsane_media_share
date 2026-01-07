// userRoute.js
import express from "express";

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
  uploadMediaToGallery,
  getMediaGallery,
  deleteMediaGallery,
  disconnectFacebook,
  getUserProfile,
} from "../controller/userController.js";

import { ensureAuth } from "../utils/auth.js";
import Post from "../models/Post.js";
import ScheduledPost from "../models/ScheduledPost.js";
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


// ✅ LinkedIn controller
import {
  initiateLinkedInAuth,
  exchangeLinkedInCode, 
  getLinkedInStatus,
  disconnectLinkedIn,
  // postToLinkedIn
} from "../controller/linkedinController.js";


// ✅ Youtube controller
import {
  initiateYouTubeAuth,
  youtubeCallback,
  disconnectYouTube,
  getYouTubeStatus,
  uploadToYouTube
} from "../controller/youtubeController.js";


// ✅ Import upload from middleware (not app.js)
import { upload } from "../middleware/upload.js";

const router = express.Router();


router.get('/profile', ensureAuth(), getUserProfile);
// Facebook routes
router.post("/connect/facebook", ensureAuth(), connectFacebook);
router.get("/pages", ensureAuth(), getConnectedPages);
router.post("/post", ensureAuth(), postToChannels);
router.get("/post-stats", ensureAuth(), getPostStats);
router.post("/facebook/disconnectFB", ensureAuth(), disconnectFacebook);

// Get all posts
router.get("/posts", ensureAuth(), async (req, res) => {
  try {
    // Get immediate posts from Post model
    const immediatePosts = await Post.find({ userId: req.user.userId })
      .sort({ postedAt: -1 })
      .select("-__v")
      .lean();

    // Get scheduled/posted posts from ScheduledPost model
    const scheduledPosts = await ScheduledPost.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    // Combine both arrays
    const allPosts = [...immediatePosts, ...scheduledPosts];
    
    // Sort by most recent first
    allPosts.sort((a, b) => {
      const dateA = a.postedAt || a.scheduledFor || a.createdAt;
      const dateB = b.postedAt || b.scheduledFor || b.createdAt;
      return new Date(dateB) - new Date(dateA);
    });

    return res.json({ posts: allPosts });
  } catch (err) {
    console.error("Get posts error:", err);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ✅ MEDIA GALLERY ROUTES
router.get('/media-gallery', ensureAuth(), getMediaGallery);
router.post('/media-gallery/upload', ensureAuth(), upload.single('media'), uploadMediaToGallery);
router.delete('/media-gallery/:id', ensureAuth(), deleteMediaGallery);
// DELETE a specific post
router.delete("/posts/:postId", ensureAuth(), async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Try to find in Post model first
    let post = await Post.findById(postId);
    let modelName = "Post";
    
    // If not found, try ScheduledPost model
    if (!post) {
      post = await ScheduledPost.findById(postId);
      modelName = "ScheduledPost";
    }

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Ensure user owns this post
    if (String(post.userId) !== String(req.user.userId)) {
      return res.status(403).json({ error: "Not authorized to delete this post" });
    }

    // Delete from correct model
    if (modelName === "Post") {
      await Post.findByIdAndDelete(postId);
    } else {
      await ScheduledPost.findByIdAndDelete(postId);
    }

    console.log(`✅ Deleted ${modelName} ${postId} for user ${req.user.userId}`);

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
router.post('/twitter/auth/callback', handleTwitterCallback);
router.post('/twitter/disconnectX', ensureAuth(), disconnectTwitter);
router.get('/twitter/status', ensureAuth(), getTwitterStatus);

// Posting
// router.post('/twitter/post', ensureAuth(), upload.single('media'), postToTwitter);
router.delete('/twitter/post/:tweetId', ensureAuth(), deleteTwitterPost);
router.get('/twitter/posts', ensureAuth(), getTwitterPosts);




// ✅ LinkedIn routes
router.get("/linkedin/auth", ensureAuth(), initiateLinkedInAuth);
router.post("/linkedin/callback", ensureAuth(), exchangeLinkedInCode); // ✅ Changed to POST
router.get("/linkedin/status", ensureAuth(), getLinkedInStatus);
router.post("/linkedin/disconnectLD", ensureAuth(), disconnectLinkedIn);


// post schedule
router.post("/schedule-post", ensureAuth(), createScheduledPost);
router.get("/scheduled-posts", ensureAuth(), getScheduledPosts);
router.put("/schedule-post/:postId", ensureAuth(), updateScheduledPost);
router.delete("/schedule-post/:postId", ensureAuth(), deleteScheduledPost);





// ✅ YouTube routes

router.get("/youtube/auth", ensureAuth(), initiateYouTubeAuth);
router.post("/youtube/callback", youtubeCallback);
router.get("/youtube/status", ensureAuth(), getYouTubeStatus);
router.post("/youtube/disconnectYT", ensureAuth(), disconnectYouTube);
router.post("/youtube/upload", ensureAuth(), upload.single('video'), uploadToYouTube);



// 4. Disconnect YouTube


// 5. Upload video to YouTube


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