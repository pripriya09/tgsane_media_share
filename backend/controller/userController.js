// userController.js
import User from "../models/User.js";
import fetch from "node-fetch";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import axios from "axios"
// import Post from "../models/Post.js"
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
async function uploadVideoToCloudinaryFromBuffer(buffer, publicId = `video-${Date.now()}`) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "video", public_id: publicId, folder: "fb_ig_videos" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// Helper: poll IG creation container until FINISHED or ERROR
async function pollIgCreationStatus(creationId, accessToken) {
  const start = Date.now();
  while (Date.now() - start < 600000) {
    await new Promise(r => setTimeout(r, 6000));
    try {
      const resp = await axios.get(
        `https://graph.facebook.com/${FB_API_VERSION}/${creationId}`,
        { 
          params: { fields: "status_code", access_token: accessToken }, 
          timeout: 15000  // Increased for stability
        }
      );
      if (resp.data.status_code === "FINISHED") return { ok: true };
      if (resp.data.status_code === "ERROR") return { ok: false, error: resp.data };
    } catch (e) {
      if (e.code === 'ECONNABORTED' || e.message.includes('socket')) continue; // Ignore hang ups
    }
  }
  return { ok: false, error: { message: "Timeout" } };
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
      postToIG = true
    } = req.body;

    if (!userId || !pageId) return res.status(400).json({ error: "Missing userId or pageId" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const page = (user.pages || []).find(p => String(p.pageId) === String(pageId));
    if (!page) return res.status(400).json({ error: "Page not connected" });

    const results = { fb: null, ig: null };
    const { pageAccessToken, instagramBusinessId } = page;

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
          const up = await uploadVideoToCloudinaryFromBuffer(buff);
          video = up.secure_url;
        }
        if (!video) {
          results.fb = { error: { message: "No video URL" } };
        } else {
          const resp = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${pageId}/videos`, {
            method: "POST",
            body: new URLSearchParams({
              file_url: video,
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
          const up = await uploadVideoToCloudinaryFromBuffer(buff);
          video = up.secure_url;
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
                video_url: video,
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
                // Post succeeded even if response hung up
                results.ig = { id: createJson.id, note: "Posted (socket hang up ignored)" };
              }
            }
          }
        }
      }
    }

    const Post = (await import("../models/Post.js")).default;

    const postData = {
      userId,
      pageId,
      title,
      type,
      image: type === "image" ? image : null,
      videoUrl: type === "video" ? videoUrl : null,
      items: type === "carousel" ? items : null,  // ← Now saved correctly!
      fbPostId: results.fb?.id || results.fb?.post_id || null,
      igMediaId: results.ig?.id || null,
      postedAt: new Date()
    };

    const savedPost = await Post.create(postData);
    console.log("FINAL POST SAVED TO DB:", savedPost._id, "Type:", type, "Items:", savedPost.items?.length || 0);


    return res.json({ success: true, results });

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
