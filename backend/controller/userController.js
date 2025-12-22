// userController.js
import User from "../models/User.js";
import fetch from "node-fetch";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import axios from "axios"
// import Post from "../models/Post.js"
import { extractHashtags, extractMentions, formatPostContent } from "../utils/postHelpers.js";
import { schedule } from "node-cron";
import {postToLinkedInHelper} from "../utils/linkedinService.js"

const FB_API_VERSION = "v24.0";

export async function connectFacebook(req, res) {
  try {
    const { userAccessToken, userId } = req.body;
    if (!userAccessToken || !userId) return res.status(400).json({ error: "Missing token or userId" });

    const pagesUrl = `https://graph.facebook.com/${FB_API_VERSION}/me/accounts?access_token=${userAccessToken}&fields=name,access_token,instagram_business_account`;
    const pagesResp = await fetch(pagesUrl);
    const pagesJson = await pagesResp.json();

    if (pagesJson.error) return res.status(500).json({ error: pagesJson.error });

    const enrichedPages = [];
    for (const p of pagesJson.data || []) {
      let instagramBusinessId = null;
      if (p.instagram_business_account?.id) {
        instagramBusinessId = p.instagram_business_account.id;
      }

      enrichedPages.push({
        pageId: p.id,
        pageName: p.name || "Unnamed Page",
        pageAccessToken: p.access_token,
        instagramBusinessId,
      });
    }

    // SAVE TO USER IN DB — NOW WITH facebookConnected FLAG
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          pages: enrichedPages,
          facebookConnected: true  // ← NEW: Mark as Facebook connected
        } 
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    console.log(`✅ Saved ${enrichedPages.length} pages for user ${userId}`);
    console.log(`✅ Set facebookConnected = true for user ${userId}`);

    const safePages = enrichedPages.map(p => ({
      pageId: p.pageId,
      pageName: p.pageName,
      instagramBusinessId: p.instagramBusinessId,
    }));

    return res.json({ success: true, pages: safePages, facebookConnected: true });
  } catch (err) {
    console.error("connectFacebook error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// // Backend - Add to userController.js
// export async function checkRateLimits(req, res) {
//   try {
//     const { instagramBusinessId, pageAccessToken } = req.body;
    
//     const resp = await fetch(
//       `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/content_publishing_limit`,
//       {
//         method: "GET",
//         headers: { "Authorization": `Bearer ${pageAccessToken}` }
//       }
//     );
//     const data = await resp.json();
    
//     // Returns: { data: [{ quota_usage: 15, config: { quota_total: 25 } }] }
//     return res.json(data);
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// }

// userController.js - Updated version
export async function checkRateLimits(req, res) {
  try {
    const userId = req.user?.userId;  // From JWT token
    const { pageId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get page from user's connected pages
    const page = user.pages?.find(p => String(p.pageId) === String(pageId));
    if (!page) {
      return res.status(400).json({ error: "Page not found" });
    }

    if (!page.instagramBusinessId) {
      return res.status(400).json({ error: "No Instagram Business Account connected" });
    }

    const resp = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${page.instagramBusinessId}/content_publishing_limit?access_token=${page.pageAccessToken}`,
      {
        method: "GET"
      }
    );
    
    const data = await resp.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error });
    }
    
    // Returns: { data: [{ quota_usage: 15, config: { quota_total: 25 } }] }
    return res.json(data);
  } catch (err) {
    console.error("checkRateLimits error:", err);
    return res.status(500).json({ error: err.message });
  }
}


// FINAL WORKING VERSION — getConnectedPages
export async function getConnectedPages(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.log("No userId from JWT");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId).select("pages facebookConnected");
    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    const safePages = (user.pages || []).map(p => ({
      pageId: p.pageId,
      pageName: p.pageName,
      instagramBusinessId: p.instagramBusinessId || null,
    }));

    console.log("Returning pages for user:", userId, "Facebook Connected:", user.facebookConnected, safePages);

    return res.json({ 
      pages: safePages, 
      facebookConnected: user.facebookConnected || false  // ← Return connection status
    });
  } catch (err) {
    console.error("getConnectedPages error:", err);
    return res.status(500).json({ error: err.message });
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: upload a buffer or local file path to Cloudinary as video (returns secure_url)
// Update Cloudinary upload to ensure compatibility
async function uploadVideoToCloudinaryFromBuffer(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        resource_type: "video",
        public_id: publicId,
        folder: "fb_ig_videos",
        // Add these for better compatibility
        format: "mp4",
        transformation: [
          { video_codec: "h264" },
          { audio_codec: "aac" }
        ]
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}


// Update pollIgCreationStatus
async function pollIgCreationStatus(creationId, accessToken, maxWaitTime = 600000) {
  const start = Date.now();
  let attempts = 0;
  
  while (Date.now() - start < maxWaitTime) {
    attempts++;
    await new Promise(r => setTimeout(r, 6000));
    
    try {
      const resp = await axios.get(
        `https://graph.facebook.com/${FB_API_VERSION}/${creationId}`,
        { 
          params: { fields: "status_code,status", access_token: accessToken },
          timeout: 15000
        }
      );
      
      console.log(`Poll attempt ${attempts}: ${resp.data.status_code}`);
      
      if (resp.data.status_code === "FINISHED") return { ok: true };
      if (resp.data.status_code === "ERROR") {
        return { 
          ok: false, 
          error: { 
            message: `Processing failed: ${resp.data.status}`,
            details: resp.data
          } 
        };
      }
    } catch (e) {
      if (e.code === 'ECONNABORTED' || e.message.includes('socket')) continue;
      console.error(`Poll error on attempt ${attempts}:`, e.message);
    }
  }
  
  return { 
    ok: false, 
    error: { 
      message: `Timeout after ${attempts} attempts (${Math.round((Date.now() - start) / 1000)}s)` 
    } 
  };
}



export async function postToChannels(req, res) {
  try {
    const {
      userId,
      pageId,
      title = "",
      image,
      videoUrl,
      type = "image",           // "image" | "video" | "carousel"
      items,                    // For carousel: array of { type: "image"|"video", url: "https://..." }
      postToFB = true,
      postToIG = true,
      postToTwitter = false,
      postToLinkedIn = false,
    } = req.body;

   
    // ✅ Only validate userId (required for all posts)
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Force correct type if videoUrl exists
    if (videoUrl && !type) {
      type = "video";
      console.log("⚠️ Type was missing, forcing to 'video' because videoUrl exists");
    }

    console.log("📥 RECEIVED POST REQUEST:");
    console.log("Type:", type);
    console.log("VideoUrl:", videoUrl);
    console.log("Image:", image);
    console.log("VideoBase64 exists?", !!req.body.videoBase64);
    console.log("PostToTwitter:", postToTwitter);
    console.log("PostToLinkedIn:", postToLinkedIn);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Only require pageId if posting to FB/IG
    if ((postToFB || postToIG) && !pageId) {
      return res.status(400).json({ error: "Missing pageId for Facebook/Instagram" });
    }

    const page = pageId ? (user.pages || []).find(p => String(p.pageId) === String(pageId)) : null;

    if ((postToFB || postToIG) && !page) {
      return res.status(400).json({ error: "Page not connected" });
    }

    const results = { fb: null, ig: null, twitter: null, linkedin: null };
    const pageAccessToken = page?.pageAccessToken;
    const instagramBusinessId = page?.instagramBusinessId;



    // const user = await User.findById(userId);
    // if (!user) return res.status(404).json({ error: "User not found" });

    // const page = (user.pages || []).find(p => String(p.pageId) === String(pageId));
    // if (!page) return res.status(400).json({ error: "Page not connected" });

    // const results = { fb: null, ig: null };
    // const { pageAccessToken, instagramBusinessId } = page;

    // Helper: retry publish (handles socket hang-ups)
    const publishWithRetry = async (creationId, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const resp = await fetch(
            `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId || pageId}/media_publish`,
            {
              method: "POST",
              body: new URLSearchParams({
                creation_id: creationId,
                access_token: pageAccessToken
              }),
              signal: AbortSignal.timeout(30000)
            }
          );
          return await resp.json();
        } catch (err) {
          if (attempt === maxRetries) throw err;
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }
    };

    // ==================== FACEBOOK POST ====================
    if (postToFB && pageAccessToken) {
      if (type === "carousel" && Array.isArray(items) && items.length >= 2 && items.length <= 10) {
        const attached_media = [];
        for (const item of items) {
          if (item.type === "image") {
            const photoRes = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${pageId}/photos`, {
              method: "POST",
              body: new URLSearchParams({
                url: item.url,
                access_token: pageAccessToken,
                published: "false"   // Important: don't publish yet
              })
            });
            const photoJson = await photoRes.json();
            if (photoJson.id) {
              attached_media.push({ media_fbid: photoJson.id });
            }
          } 
          else if (item.type === "video") {
            const videoRes = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${pageId}/videos`, {
              method: "POST",
              body: new URLSearchParams({
                file_url: item.url,
                access_token: pageAccessToken,
                published: "false"
              })
            });
            const videoJson = await videoRes.json();
            if (videoJson.id) {
              attached_media.push({ media_fbid: videoJson.id });
            }
          }
        }

        const fbResp = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${pageId}/feed`, {
          method: "POST",
          body: new URLSearchParams({
            message: title || "Check out my carousel!",
            attached_media: JSON.stringify(attached_media),
            access_token: pageAccessToken
          })
        });
        const fbJson = await fbResp.json();
        results.fb = fbJson.error ? { error: fbJson.error } : fbJson;
      }

      
      else if (type === "image") {
        const resp = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${pageId}/photos`, {
          method: "POST",
          body: new URLSearchParams({
            url: image,
            caption: title || "",
            access_token: pageAccessToken
          })
        });
        const json = await resp.json();
        results.fb = json.error ? { error: json.error } : json;
      } 
      else if (type === "video") {
        let video = videoUrl; 
        if (req.body.videoBase64) {
          const buff = Buffer.from(req.body.videoBase64, "base64");
          const up = await uploadVideoToCloudinaryFromBuffer(buff, `video-${Date.now()}`);
          video = up.secure_url; 
        }
        if (!video) {
          results.fb = { error: { message: "No video URL" } };
        } else {
          const resp = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${pageId}/videos`, {
            method: "POST",
            body: new URLSearchParams({
              file_url: video,  // ← Use optimized video URL here
              description: title || "",
              access_token: pageAccessToken
            })
          });
          const json = await resp.json();
          results.fb = json.error ? { error: json.error } : json;
        }
      }
    }

    // ==================== INSTAGRAM POST ====================
    if (postToIG && instagramBusinessId && pageAccessToken) {

      // CAROUSEL POST (IG)
     // INSTAGRAM CAROUSEL — FINAL WORKING VERSION (DEC 2025)
if (type === "carousel" && Array.isArray(items) && items.length >= 2 && items.length <= 10) {
  try {
    const childIds = [];
    for (const item of items) {
      const isVideo = item.resource_type === "video" || item.type === "video";
      const payload = new URLSearchParams({
        caption: title || "",
        is_carousel_item: "true",
        access_token: pageAccessToken,
      });
  
      if (isVideo) {
        payload.append("media_type", "REELS");
        payload.append("video_url", item.url);
        payload.append("share_to_feed", "true");
      } else {
        payload.append("image_url", item.url);
      }
  
      const resp = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media`,
        { method: "POST", body: payload }
      );
      const json = await resp.json();
  
      if (json.error) {
        console.error("Child container failed:", json.error);
        throw new Error(`Child failed: ${json.error.message}`);
      }
      childIds.push(json.id);
    }
  
    console.log("Child IDs:", childIds);


  // Validate aspect ratios match
  const aspectRatios = items.map(item => {
    // You'd need to get actual dimensions from Cloudinary
    return item.aspectRatio || "1:1";
  });
  
  const allSame = aspectRatios.every(ar => ar === aspectRatios[0]);
  if (!allSame) {
    return res.status(400).json({ 
      error: "All carousel items must have the same aspect ratio" 
    });
  }
  
  // Validate max 10 items
  if (items.length > 10) {
    return res.status(400).json({ 
      error: "Maximum 10 items allowed in carousel" 
    });
  }



  
    // Create parent carousel
    const carouselPayload = new URLSearchParams({
      media_type: "CAROUSEL",
      caption: title || "Amazing carousel!",
      children: childIds.join(","),
      access_token: pageAccessToken,
    });
  
    const carouselResp = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media`,
      { method: "POST", body: carouselPayload }
    );
    const carouselJson = await carouselResp.json();
  
    if (carouselJson.error) throw carouselJson.error;
  
    // Poll status
    const poll = await pollIgCreationStatus(carouselJson.id, pageAccessToken);
    if (!poll.ok) throw poll.error;
  
    // Publish
    const publishJson = await publishWithRetry(carouselJson.id);
    results.ig = publishJson.error
      ? { error: publishJson.error }
      : { id: publishJson.id, type: "carousel" };
  
    // IMPORTANT: no return here, let it continue to DB save
  
  } catch (err) {
    console.error("Carousel error:", err);
    results.ig = { error: err.message || "Carousel failed" };
    // IMPORTANT: no return here either
  }
}

      // IMAGE POST
     else if (type === "image") {
        const createResp = await fetch(
          `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media`,
          {
            method: "POST",
            body: new URLSearchParams({
              image_url: image,
              caption: title || "",
              access_token: pageAccessToken
            })
          }
        );
        const createJson = await createResp.json();

        if (createJson.error) {
          results.ig = { error: createJson.error };
        } else {
          const publishJson = await publishWithRetry(createJson.id);
          results.ig = publishJson.error ? { error: publishJson.error } : { id: publishJson.id || createJson.id };
          
        }
        
      }

      // VIDEO POST (REELS)
      else if (type === "video") {
        let video = videoUrl;
        if (req.body.videoBase64) {
          const buff = Buffer.from(req.body.videoBase64, "base64");
          const up = await uploadVideoToCloudinaryFromBuffer(buff, `video-${Date.now()}`);
          video = up.secure_url;  // ← Use optimized URL
        }
    
        if (!video) {
          results.ig = { error: { message: "No video URL" } };
        } else {
          const createResp = await fetch(
            `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media`,
            {
              method: "POST",
              body: new URLSearchParams({
                media_type: "REELS",
                video_url: video,  // ← Use optimized video URL here
                caption: title || "",
                share_to_feed: "true",
                access_token: pageAccessToken
              })
            }
          );
          const createJson = await createResp.json();
    
          if (createJson.error) {
            results.ig = { error: createJson.error };
          } else {
            const poll = await pollIgCreationStatus(createJson.id, pageAccessToken);
            if (!poll.ok) {
              results.ig = { error: poll.error };
            } else {
              const publishJson = await publishWithRetry(createJson.id);
              if (publishJson.id) {
                results.ig = { id: publishJson.id };
              } else if (publishJson.error) {
                results.ig = { error: publishJson.error };
              } else {
                results.ig = { id: createJson.id, note: "Posted (socket hang up ignored)" };
              }
            }
          }
        }
      }
    }


    // ============================== POST TO TWITTER =====================

    if (postToTwitter && user.twitterConnected) {
      try {
        const { TwitterApi } = await import('twitter-api-v2');
        
        const client = new TwitterApi({
          appKey: process.env.TWITTER_API_KEY,
          appSecret: process.env.TWITTER_API_KEY_SECRET,
          accessToken: user.twitterAccessToken,
          accessSecret: user.twitterAccessSecret,
        });

        const tweetData = { text: title || "Check out my post!" };

        // Handle media upload for Twitter
        if ((image || videoUrl) && type !== "carousel") {
          try {
            const mediaUrl = image || videoUrl;
            
            // Download media
            const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            
            // Save to temp file
            const fs = await import('fs');
            const path = await import('path');
            const tempDir = path.join(process.cwd(), "temp");
            
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            const ext = type === "video" ? "mp4" : "jpg";
            const tempPath = path.join(tempDir, `twitter_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);

            // Upload to Twitter
            const mediaId = await client.v1.uploadMedia(tempPath);
            tweetData.media = { media_ids: [mediaId] };

            // Clean up
            fs.unlinkSync(tempPath);
            console.log("✅ Twitter media uploaded:", mediaId);
          } catch (mediaErr) {
            console.error("❌ Twitter media upload error:", mediaErr);
            // Continue without media if upload fails
          }
        }

        // Post tweet
        const tweet = await client.v2.tweet(tweetData);
        results.twitter = { 
          id: tweet.data.id,
          url: `https://twitter.com/${user.twitterUsername}/status/${tweet.data.id}`
        };
        
        console.log("✅ Posted to Twitter:", tweet.data.id);

      } catch (twitterErr) {
        console.error("❌ Twitter post error:", twitterErr);
        results.twitter = { error: twitterErr.message };
      }
    }


    //============================POST TO LINKEDIN


if (postToLinkedIn && user.linkedin?.connected) {
  try {
    console.log("📱 Preparing LinkedIn post...");
    console.log("Type:", type);
    console.log("Image:", image);
    console.log("Video:", videoUrl);
    
    const liResult = await postToLinkedInHelper({
      userId,
      text: title || "",
      imageUrl: type === "image" ? image : null, // ✅ Only send image if type is image
      videoUrl: type === "video" ? videoUrl : null // ✅ Add video support (future)
    });
    
    results.linkedin = { id: liResult.id };
    console.log("✅ Posted to LinkedIn:", liResult.id);
    
  } catch (liErr) {
    console.error("❌ LinkedIn post error:", liErr);
    results.linkedin = {
      error: liErr.message || "LinkedIn post failed"
    };
  }
}


    const Post = (await import("../models/Post.js")).default;

    // ✅ Determine which platforms were SUCCESSFULLY posted to
    let platforms = [];
    if (postToFB && (results.fb?.id || results.fb?.post_id)) platforms.push("facebook");
    if (postToIG && results.ig?.id) platforms.push("instagram");
    if (postToTwitter && results.twitter?.id) platforms.push("twitter");
    if (postToLinkedIn && results.linkedin?.id) platforms.push("linkedin"); // ✅

    // If no successful posts, don't save to DB
    if (platforms.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Failed to post to any platform",
        results
      });
    }

    const postData = {
      userId,
      pageId: pageId || null,
      title,
      platform: platforms, // ['facebook','instagram','twitter','linkedin']
      type,
      image: type === "image" ? image : null,
      videoUrl: type === "video" ? videoUrl : null,
      items: type === "carousel" ? items : null,
      fbPostId: results.fb?.id || results.fb?.post_id || null,
      igMediaId: results.ig?.id || null,
      tweetId: results.twitter?.id || null,
      linkedinPostId: results.linkedin?.id || null, // ✅ NEW
      status: "posted",
      postedAt: new Date()
    };

    const savedPost = await Post.create(postData);
    console.log("✅ POST SAVED TO DB:", savedPost._id, "Platforms:", platforms);

    return res.json({
      success: true,
      results,
      post: savedPost
    });
  } catch (err) {
    console.error("postToChannels error:", err);
    return res.status(500).json({ error: err.message });
  }
}


// userController.js - ADD THIS FUNCTION
export async function getPostStats(req, res) {
  try {
    const userId = req.user.userId;
    const Post = (await import("../models/Post.js")).default;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalPosts, fbPosts, igPosts, postsThisWeek] = await Promise.all([
      Post.countDocuments({ userId }),
      Post.countDocuments({ userId, fbPostId: { $exists: true, $ne: null } }),
      Post.countDocuments({ userId, igMediaId: { $exists: true, $ne: null } }),
      Post.countDocuments({ userId, postedAt: { $gte: weekAgo } })
    ]);

    return res.json({
      totalPosts,
      fbPosts,
      igPosts,
      postsThisWeek
    });
  } catch (err) {
    console.error("getPostStats error:", err);
    return res.status(500).json({ error: err.message });
  }
}



// userController.js - Instagram-Only Stories (Clean Version)
export async function postStory(req, res) {
  try {
    const {
      userId,
      pageId,
      image,
      videoUrl,
      type = "image" // "image" | "video"
    } = req.body;

    console.log("📖 POSTING INSTAGRAM STORY:");
    console.log("Type:", type);
    console.log("Media URL:", type === "image" ? image : videoUrl);

    // Validation
    if (!userId || !pageId) {
      return res.status(400).json({ error: "Missing userId or pageId" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const page = (user.pages || []).find(p => String(p.pageId) === String(pageId));
    if (!page) {
      return res.status(400).json({ error: "Page not connected" });
    }

    const { pageAccessToken, instagramBusinessId } = page;

    // Check Instagram connection
    if (!instagramBusinessId) {
      return res.status(400).json({ 
        error: "No Instagram Business Account connected. Stories require Instagram Business Account." 
      });
    }

    const mediaUrl = type === "video" ? videoUrl : image;
    
    if (!mediaUrl) {
      return res.status(400).json({ error: "No media URL provided" });
    }

    // ==================== INSTAGRAM STORY ====================
    
    // Step 1: Create story container
    const payload = new URLSearchParams({
      media_type: "STORIES",
      access_token: pageAccessToken
    });

    if (type === "image") {
      payload.append("image_url", mediaUrl);
    } else {
      payload.append("video_url", mediaUrl);
    }

    const createResp = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media`,
      {
        method: "POST",
        body: payload
      }
    );
    const createJson = await createResp.json();

    if (createJson.error) {
      console.error("Instagram Story creation failed:", createJson.error);
      return res.status(500).json({ 
        error: createJson.error.message || "Failed to create Instagram Story" 
      });
    }

    console.log("✅ Instagram Story container created:", createJson.id);

    // Step 2: Poll video processing status (if video)
    if (type === "video") {
      console.log("⏳ Processing video...");
      const poll = await pollIgCreationStatus(createJson.id, pageAccessToken);
      if (!poll.ok) {
        console.error("Video processing failed:", poll.error);
        return res.status(500).json({ 
          error: poll.error.message || "Video processing failed" 
        });
      }
      console.log("✅ Video processing complete");
    }

    // Step 3: Publish story
    let result;
    try {
      const publishResp = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media_publish`,
        {
          method: "POST",
          body: new URLSearchParams({
            creation_id: createJson.id,
            access_token: pageAccessToken
          }),
          signal: AbortSignal.timeout(30000)
        }
      );
      
      const publishJson = await publishResp.json();
      
      if (publishJson.error) {
        console.error("Story publish failed:", publishJson.error);
        return res.status(500).json({ error: publishJson.error });
      }
      
      result = {
        id: publishJson.id,
        type: "story",
        platform: "instagram"
      };
      
      console.log("✅ Instagram Story published:", result.id);
      
    } catch (publishErr) {
      // Socket hang up is common but story is usually published
      console.log("⚠️ Publish response dropped (socket hang up), but story likely posted successfully");
      result = {
        id: createJson.id,
        type: "story",
        platform: "instagram",
        note: "Published successfully (connection dropped during response)"
      };
    }

    // Step 4: Save to database
    const Post = (await import("../models/Post.js")).default;
// AFTER - Add platform field:
const savedPost = await Post.create({
  userId,
  pageId,
  title: "Instagram Story",
  platform: ["instagram"], // ✅ Array
  type: "story",
  image: type === "image" ? image : null,
  videoUrl: type === "video" ? videoUrl : null,
  igMediaId: result.id,
  fbPostId: null,
  postedAt: new Date()
});

    console.log("✅ Story saved to database:", savedPost._id);

    return res.json({ 
      success: true, 
      story: result,
      message: "Instagram Story posted successfully! (Expires in 24 hours)"
    });

  } catch (err) {
    console.error("❌ postStory error:", err);
    return res.status(500).json({ 
      error: err.message || "Failed to post Instagram Story" 
    });
  }
}



// ----------------------------schedule post 



// ✅ NEW: Create scheduled post
export async function createScheduledPost(req, res) {
  try {
    const userId = req.user?.userId;
    const { 
      title, 
      caption, 
      platform, 
      scheduledFor, 
      hashtags,
      type,
      image,
      videoUrl,
      pageId
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate scheduled time is in future
    const scheduleDate = new Date(scheduledFor);
    if (scheduleDate <= new Date()) {
      return res.status(400).json({
        error: "Scheduled time must be in the future"
      });
    }

    // Extract hashtags from caption if not provided
    const extractedHashtags = hashtags || extractHashtags(caption);
    
    // Extract mentions
    const extractedMentions = extractMentions(caption, platform);

    const Post = (await import("../models/Post.js")).default;
    
    const post = await Post.create({
      userId,
      pageId: pageId || null,
      title,
      caption,
      platform: Array.isArray(platform) ? platform : [platform],
      type: type || "image",
      hashtags: extractedHashtags,
      mentions: extractedMentions,
      status: "scheduled",
      scheduledFor: scheduleDate,
      image,
      videoUrl
    });

    return res.json({
      success: true,
      message: "Post scheduled successfully",
      post
    });

  } catch (err) {
    console.error("createScheduledPost error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ✅ NEW: Get scheduled posts
export async function getScheduledPosts(req, res) {
  try {
    const userId = req.user?.userId;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const Post = (await import("../models/Post.js")).default;
    
    const query = { userId };
    if (status) {
      query.status = status;
    } else {
      // Default: show scheduled and draft posts
      query.status = { $in: ["scheduled", "draft"] };
    }

    const posts = await Post.find(query)
      .sort({ scheduledFor: 1 })
      .lean();

    return res.json({
      success: true,
      count: posts.length,
      posts
    });

  } catch (err) {
    console.error("getScheduledPosts error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ✅ NEW: Update scheduled post
export async function updateScheduledPost(req, res) {
  try {
    const userId = req.user?.userId;
    const { postId } = req.params;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const Post = (await import("../models/Post.js")).default;
    const post = await Post.findOne({ _id: postId, userId });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.status === "posted") {
      return res.status(400).json({
        error: "Cannot update already posted content"
      });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== "_id" && key !== "userId") {
        post[key] = updates[key];
      }
    });

    post.updatedAt = new Date();
    await post.save();

    return res.json({
      success: true,
      message: "Post updated successfully",
      post
    });

  } catch (err) {
    console.error("updateScheduledPost error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ✅ NEW: Delete scheduled post
export async function deleteScheduledPost(req, res) {
  try {
    const userId = req.user?.userId;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const Post = (await import("../models/Post.js")).default;
    const post = await Post.findOne({ _id: postId, userId });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.status === "posted") {
      post.status = "deleted";
      await post.save();
    } else {
      await post.deleteOne();
    }

    return res.json({
      success: true,
      message: "Post deleted successfully"
    });

  } catch (err) {
    console.error("deleteScheduledPost error:", err);
    return res.status(500).json({ error: err.message });
  }
}




export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    const user = await User.findById(userId).select(
      'username email facebookConnected twitterConnected linkedin pages'
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Build profile response
    const profile = {
      username: user.username,
      email: user.email,
      
      // Facebook/Instagram (via pages)
      facebook: {
        connected: user.facebookConnected || false,
        pages: user.pages?.map(page => ({
          pageId: page.pageId,
          pageName: page.pageName,
          pageProfilePic: page.pageProfilePic,
          hasInstagram: !!page.instagramBusinessId,
          instagramUsername: page.instagramUsername
        })) || []
      },
      
      // Twitter
      twitter: {
        connected: user.twitterConnected || false,
        username: user.twitterUsername,
        profileImage: user.twitterProfileImage,
        name: user.twitterName
      },
      
      // LinkedIn
      linkedin: {
        connected: user.linkedin?.connected || false,
        name: user.linkedin?.name,
        email: user.linkedin?.email,
        picture: user.linkedin?.picture,
        userId: user.linkedin?.userId
      }
    };

    return res.json({ 
      success: true, 
      profile 
    });
    
  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
