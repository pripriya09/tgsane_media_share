// userController.js
import User from "../models/User.js";
import fetch from "node-fetch";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import axios from "axios"
const FB_API_VERSION = "v24.0";

export async function connectFacebook(req, res) {
  try {
    const { userAccessToken, userId } = req.body;
    if (!userAccessToken || !userId) return res.status(400).json({ error: "Missing userAccessToken or userId" });

    const pagesUrl = `https://graph.facebook.com/${FB_API_VERSION}/me/accounts?access_token=${userAccessToken}`;
    const pagesResp = await fetch(pagesUrl);
    const pagesJson = await pagesResp.json();
    if (pagesJson.error) {
      console.error("FB /me/accounts error", pagesJson.error);
      return res.status(500).json({ error: pagesJson.error });
    }

    const pages = pagesJson.data || [];
    const enrichedPages = [];

    for (const p of pages) {
      const pageId = p.id;
      const pageName = p.name || "";
      const pageAccessToken = p.access_token;
      let instagramBusinessId = null;

      if (pageAccessToken) {
        try {
          const igUrl = `https://graph.facebook.com/${FB_API_VERSION}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`;
          const igResp = await fetch(igUrl);
          const igJson = await igResp.json();
          if (!igJson.error && igJson.instagram_business_account?.id) {
            instagramBusinessId = igJson.instagram_business_account.id;
          }
        } catch (err) {
          console.warn("IG check failed for page", pageId, err.message);
        }
      }

      enrichedPages.push({
        pageId,
        pageName,
        pageAccessToken,
        instagramBusinessId,
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.pages = enrichedPages;  // This is where we save
    await user.save();
    console.log("Saved pages to user:", user.pages.map(p => ({ 
      pageId: p.pageId, 
      type: typeof p.pageId 
    })));
    // Return safe version (no token exposed)
    const safePages = enrichedPages.map(p => ({
      pageId: p.pageId,
      pageName: p.pageName,
      instagramBusinessId: p.instagramBusinessId,
    }));

    return res.json({ success: true, pages: safePages });
  } catch (err) {
    console.error("connectFacebook error", err);
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

    const user = await User.findById(userId).select("pages");
    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    const safePages = (user.pages || []).map(p => ({
      pageId: p.pageId,
      pageName: p.pageName,
      instagramBusinessId: p.instagramBusinessId || null,
    }));

    console.log("Returning pages for user:", userId, safePages); // ← THIS WILL SHOW IN LOGS

    return res.json({ pages: safePages });
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
      title,
      image,
      videoUrl,
      type = "image",
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

    // ==================== FACEBOOK POST ====================
    if (postToFB && pageAccessToken) {
      if (type === "image") {
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

      // Helper: Retry publish with socket hang up handling
      const publishWithRetry = async (creationId, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const publishResp = await fetch(
              `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media_publish`,
              {
                method: "POST",
                body: new URLSearchParams({
                  creation_id: creationId,
                  access_token: pageAccessToken
                }),
                signal: AbortSignal.timeout(30000) // 30s timeout to avoid hang up
              }
            );
            const publishJson = await publishResp.json();
            return publishJson;
          } catch (err) {
            if (attempt === maxRetries) throw err;
            console.warn(`Publish retry ${attempt}/${maxRetries} (socket hang up):`, err.message);
            await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
          }
        }
      };

      // IMAGE POST
      if (type === "image") {
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

    return res.json({ success: true, results });

  } catch (err) {
    console.error("postToChannels error:", err);
    return res.status(500).json({ error: err.message });
  }
}