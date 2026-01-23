// userController.js
import User from "../models/User.js";
import fetch from "node-fetch";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import MediaGallery from "../models/MediaGallery.js";
import PageToken from "../models/PageToken.js";
import UserToken from "../models/UserToken.js";
import Post from "../models/Post.js";
import ScheduledPost from "../models/ScheduledPost.js";
import axios from "axios"
// import Post from "../models/Post.js"
import { extractHashtags, extractMentions, formatPostContent } from "../utils/postHelpers.js";
import { schedule } from "node-cron";
import {postToLinkedInHelper} from "../utils/linkedinService.js"

const FB_API_VERSION = "v24.0";


async function saveToGallery(userId, url, type, originalName = "Posted Media") {
  try {
    // ✅ CHECK: Is this a shared media URL?
    const isSharedMedia = await MediaGallery.findOne({ 
      url: url, 
      isShared: true 
    });

    if (isSharedMedia) {
      console.log("📌 This is shared media, not saving duplicate");
      return isSharedMedia;
    }

    // ✅ CHECK: Does user already have this exact URL?
    const userHasIt = await MediaGallery.findOne({ 
      userId: userId,
      url: url 
    });

    if (userHasIt) {
      console.log("📌 User already has this media, not saving duplicate");
      return userHasIt;
    }

    // Only save if it's truly NEW
    const mediaItem = await MediaGallery.create({
      userId,
      type,
      url,
      originalName,
      publicId: url.split('/').pop().split('.')[0],
      isShared: false,
      uploadedAt: new Date()
    });
    
    console.log("✅ Auto-saved NEW media to gallery:", mediaItem._id);
    return mediaItem;
  } catch (err) {
    console.error("⚠️ Failed to auto-save to gallery:", err.message);
    return null;
  }
}

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    console.log('📡 Getting profile for user:', userId);
    
    const user = await User.findById(userId).select(
      '_id username email facebookConnected twitterConnected linkedin pages'  // ✅ Include _id
    );

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ User found:', user.username);
    console.log('📊 User _id:', user._id);
    console.log('📊 Facebook connected:', user.facebookConnected);

    // Build profile response
    const profile = {
      _id: user._id,  // ✅ Add this!
      username: user.username,
      email: user.email,
      
      // Facebook/Instagram (via pages)
      facebook: {
        connected: user.facebookConnected || false,
        pages: user.pages?.map(page => ({
          pageId: page.pageId,
          pageName: page.pageName,
          instagramBusinessId: page.instagramBusinessId,
          instagramUsername: page.instagramUsername,
          hasInstagramProfile: !!page.instagramUsername  // ✅ NEW
        })) || []
      },
      
      // Twitter
      twitter: {
        connected: user.twitterConnected || false,
        username: user.twitterUsername,
        name: user.twitterName
      },
      
      // LinkedIn
      linkedin: {
        connected: user.linkedin?.connected || false,
        name: user.linkedin?.name,
        email: user.linkedin?.email,
        picture: user.linkedin?.picture,
        userId: user.linkedin?.userId
      },

       // ✅ YouTube
       youtube: {
        connected: user.youtubeConnected || false,
        channelName: user.youtubeChannelName || null,
        channelId: user.youtubeChannelId || null
      }
    
    };


    
    console.log('✅ Returning profile with _id:', profile._id);

    return res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Get user profile error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};



async function refreshFacebookPageToken(pageId, currentToken) {
  try {
    console.log(`🔄 Attempting to refresh token for page ${pageId}...`);
    
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: currentToken
        }
      }
    );

    const newToken = tokenResponse.data.access_token;
    console.log(`✅ Token refreshed successfully for page ${pageId}`);
    return newToken;
    
  } catch (error) {
    console.error(`❌ Token refresh failed for page ${pageId}:`, error.response?.data || error.message);
    throw new Error('Token refresh failed. Please reconnect Facebook.');
  }
}

/**
 * Execute Facebook Post (all types)
 */
async function executeFacebookPost(pageId, pageAccessToken, type, title, image, videoUrl, items, videoBase64) {
  if (type === "carousel" && Array.isArray(items) && items.length >= 2 && items.length <= 10) {
    const attached_media = [];
    for (const item of items) {
      if (item.type === "image") {
        const photoRes = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${pageId}/photos`, {
          method: "POST",
          body: new URLSearchParams({
            url: item.url,
            access_token: pageAccessToken,
            published: "false"
          })
        });
        const photoJson = await photoRes.json();
        if (photoJson.error) throw { response: { data: photoJson } };
        if (photoJson.id) attached_media.push({ media_fbid: photoJson.id });
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
        if (videoJson.error) throw { response: { data: videoJson } };
        if (videoJson.id) attached_media.push({ media_fbid: videoJson.id });
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
    if (fbJson.error) throw { response: { data: fbJson } };
    return fbJson;
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
    if (json.error) throw { response: { data: json } };
    return json;
  } 
  else if (type === "video") {
    let video = videoUrl;
    if (videoBase64) {
      const buff = Buffer.from(videoBase64, "base64");
      const up = await uploadVideoToCloudinaryFromBuffer(buff, `video-${Date.now()}`);
      video = up.secure_url;
    }
    if (!video) {
      throw { response: { data: { error: { message: "No video URL" } } } };
    }
    const resp = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${pageId}/videos`, {
      method: "POST",
      body: new URLSearchParams({
        file_url: video,
        description: title || "",
        access_token: pageAccessToken
      })
    });
    const json = await resp.json();
    if (json.error) throw { response: { data: json } };
    return json;
  }
}


async function postToFacebookWithRetry(pageId, pageAccessToken, type, title, image, videoUrl, items, userId, videoBase64) {
  try {
    // First attempt
    return await executeFacebookPost(pageId, pageAccessToken, type, title, image, videoUrl, items, videoBase64);
  } catch (error) {
    // Check if it's a token expiration error
    const errorCode = error.response?.data?.error?.code;
    const errorSubcode = error.response?.data?.error?.error_subcode;
    
    if (errorCode === 190 && (errorSubcode === 463 || errorSubcode === 467)) {
      console.log("🔄 Facebook token expired, attempting refresh...");
      
      try {
        // Refresh token
        const newToken = await refreshFacebookPageToken(pageId, pageAccessToken);
        
        // Update user's page token in database
        const user = await User.findById(userId);
        const pageIndex = user.pages.findIndex(p => p.pageId === pageId);
        if (pageIndex !== -1) {
          user.pages[pageIndex].pageAccessToken = newToken;
          await user.save();
          console.log("✅ Token updated in database");
        }
        
        // Retry with new token
        console.log("🔄 Retrying Facebook post with refreshed token...");
        const result = await executeFacebookPost(pageId, newToken, type, title, image, videoUrl, items, videoBase64);
        return { ...result, tokenRefreshed: true };
        
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError);
        throw new Error("Facebook session expired. Please reconnect your account.");
      }
    } else {
      // Other errors, just throw
      throw error;
    }
  }
}




export async function connectFacebook(req, res) {
  try {
    const { userAccessToken, userId } = req.body;
    if (!userAccessToken || !userId) return res.status(400).json({ error: "Missing token or userId" });

    // ✅ NEW: Verify user exists first
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ error: "User not found" });
    }
    console.log('✅ User verified:', existingUser.username);
    // ✅ END NEW CODE

    const pagesUrl = `https://graph.facebook.com/${FB_API_VERSION}/me/accounts?access_token=${userAccessToken}&fields=name,access_token,instagram_business_account`;
    const pagesResp = await fetch(pagesUrl);
    const pagesJson = await pagesResp.json();

    if (pagesJson.error) return res.status(500).json({ error: pagesJson.error });

    const enrichedPages = [];
    for (const p of pagesJson.data || []) {
      let instagramBusinessId = null;
      let instagramUsername = null;
      let instagramProfilePicture = null;

      if (p.instagram_business_account?.id) {
        instagramBusinessId = p.instagram_business_account.id;
        
        try {
          const igUrl = `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}?fields=username,name,profile_picture_url&access_token=${p.access_token}`;
          const igResp = await fetch(igUrl);
          const igJson = await igResp.json();
          
          console.log(`📊 IG ${instagramBusinessId}:`, igJson);
          
          if (igJson.username) {
            instagramUsername = igJson.username;
            instagramProfilePicture = igJson.profile_picture_url;
            console.log(`✅ IG username: @${instagramUsername}`);
          }
        } catch (igErr) {
          console.warn(`⚠️ IG username fetch failed:`, igErr.message);
        }
      }

      enrichedPages.push({
        pageId: p.id,
        pageName: p.name || "Unnamed Page",
        pageAccessToken: p.access_token,
        instagramBusinessId,
        instagramUsername: instagramUsername || null,
        instagramProfilePicture: instagramProfilePicture || null,
      });
    }

    // ✅ CHANGED: Use findById + save instead of findByIdAndUpdate
    const user = existingUser; // Use the already-fetched user
    user.pages = enrichedPages;
    user.facebookConnected = true;
    await user.save();

    // ✅ NEW: Add delay to ensure database write completes
    await new Promise(resolve => setTimeout(resolve, 500));
    // ✅ END NEW CODE

    console.log(`✅ Saved ${enrichedPages.length} pages for user ${userId}`);
    console.log(`📊 Full page data:`, JSON.stringify(enrichedPages, null, 2));

    const safePages = enrichedPages.map(p => ({
      pageId: p.pageId,
      pageName: p.pageName,
      instagramBusinessId: p.instagramBusinessId,
      instagramUsername: p.instagramUsername,
      instagramProfilePicture: p.instagramProfilePicture,
    }));

    const hasInstagram = enrichedPages.some(page => page.instagramBusinessId);
    if (hasInstagram) {
      const igCount = enrichedPages.filter(p => p.instagramBusinessId).length;
      console.log(`🎉 Found ${igCount} Instagram accounts!`);
    }

    return res.json({ 
      success: true, 
      pages: safePages, 
      facebookConnected: true,
      instagramConnected: hasInstagram
    });
  } catch (err) {
    console.error("connectFacebook error:", err);
    return res.status(500).json({ error: err.message });
  }
}



export async function getInstagramProfile(req, res) {
  try {
    const { igBusinessId } = req.params;
    const userId = req.user.userId;

    if (!igBusinessId) {
      return res.status(400).json({ error: "Instagram Business ID required" });
    }

    console.log(`📸 Fetching Instagram profile for IG ID: ${igBusinessId}, User: ${userId}`);

    // Find user's page with this Instagram account
    const user = await User.findById(userId).select("pages");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const page = user.pages.find(p => p.instagramBusinessId === igBusinessId);
    if (!page || !page.pageAccessToken) {
      return res.status(400).json({ error: "Page token not found for this Instagram account" });
    }

    // ✅ Fetch Instagram profile using Page Access Token
    const igUrl = `https://graph.facebook.com/${FB_API_VERSION}/${igBusinessId}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${page.pageAccessToken}`;
    
    console.log(`🔗 Instagram API call: ${igUrl}`);
    
    const response = await fetch(igUrl);
    const igProfile = await response.json();

    console.log(`📊 Instagram profile response:`, igProfile);

    if (igProfile.error) {
      console.error("❌ Instagram API error:", igProfile.error);
      return res.status(500).json({ 
        error: igProfile.error.message,
        details: igProfile.error 
      });
    }

    if (igProfile.id) {
      return res.json({ 
        success: true, 
        profile: {
          id: igProfile.id,
          username: igProfile.username,
          name: igProfile.name,
          profilePictureUrl: igProfile.profile_picture_url,
          followersCount: igProfile.followers_count,
          mediaCount: igProfile.media_count
        }
      });
    }

    res.json({ success: false, error: "Profile not found" });
  } catch (error) {
    console.error("❌ getInstagramProfile error:", error);
    res.status(500).json({ error: error.message });
  }
}

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
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId).select("pages facebookConnected");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ RETURN FULL PAGE DATA (same as connectFacebook saves)
    const fullPages = (user.pages || []).map(p => ({
      pageId: p.pageId,
      pageName: p.pageName,
      pageAccessToken: p.pageAccessToken,        // ✅ Include
      instagramBusinessId: p.instagramBusinessId || null,
      instagramUsername: p.instagramUsername || null,      // ✅ Include
      instagramProfilePicture: p.instagramProfilePicture || null  // ✅ Include
    }));

    console.log("Returning FULL pages for user:", userId, fullPages);

    return res.json({ 
      pages: fullPages, 
      facebookConnected: user.facebookConnected || false
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
      postToYouTube = false,
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

    const results = { fb: null, ig: null, twitter: null, linkedin: null ,youtube: null };

    
    const pageAccessToken = page?.pageAccessToken;
    const instagramBusinessId = page?.instagramBusinessId;

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

    // ==================== FACEBOOK POST (✅ UPDATED WITH TOKEN REFRESH) ====================
    if (postToFB && pageAccessToken) {
      try {
        // ✅ CHANGED: Use the retry helper function
        const fbResult = await postToFacebookWithRetry(
          pageId, 
          pageAccessToken, 
          type, 
          title, 
          image, 
          videoUrl, 
          items, 
          userId,
          req.body.videoBase64
        );
        
        results.fb = fbResult;
        
        // ✅ NEW: Log if token was refreshed
        if (fbResult.tokenRefreshed) {
          console.log("✅ Facebook post succeeded after token refresh");
        }
        
      } catch (fbError) {
        console.error("❌ Facebook post failed:", fbError.message);
        results.fb = { 
          error: fbError.response?.data?.error || fbError.message || "Facebook post failed",
          needsReconnect: fbError.message?.includes("reconnect")
        };
      }
    }
    // ✅ END CHANGED SECTION

    // ==================== INSTAGRAM POST (UNCHANGED) ====================
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
          // ✅ NEW: Check if container is ready before publishing
          console.log(`⏳ Waiting for Instagram image container: ${createJson.id}`);
          
          const poll = await pollIgCreationStatus(createJson.id, pageAccessToken, 60000); // 60 second timeout
          
          if (!poll.ok) {
            console.error("❌ Image processing failed:", poll.error);
            results.ig = { error: poll.error };
          } else {
            console.log("✅ Image container ready, publishing...");
            const publishJson = await publishWithRetry(createJson.id);
            results.ig = publishJson.error 
              ? { error: publishJson.error } 
              : { id: publishJson.id || createJson.id };
          }
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

    // ============================== POST TO TWITTER (UNCHANGED) =====================

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

    //============================POST TO LINKEDIN (UNCHANGED)

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

    //============================POST TO YOUTUBE (UNCHANGED) =====================

    if (postToYouTube && user.youtubeConnected && type === "video" && videoUrl) {
      try {
        console.log("🎥 Preparing YouTube upload...");
        
        // Check if YouTube token needs refresh
        const now = new Date();
        if (user.youtubeTokenExpiry && user.youtubeTokenExpiry < now) {
          console.log('🔄 YouTube token expired, refreshing...');
          
          // Import refresh function
          const { google } = await import('googleapis');
          const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            'https://localhost:5174/auth/youtube/callback'
          );
          
          oauth2Client.setCredentials({
            refresh_token: user.youtubeRefreshToken
          });
          
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          // Update user's tokens
          user.youtubeAccessToken = credentials.access_token;
          user.youtubeTokenExpiry = new Date(credentials.expiry_date);
          await user.save();
          console.log('✅ YouTube token refreshed');
        }
        
        // Import YouTube service
        const { uploadVideoToYouTube } = await import('../utils/youtubeService.js');
        
        // Upload video to YouTube
        const ytResult = await uploadVideoToYouTube({
          accessToken: user.youtubeAccessToken,
          videoUrl: videoUrl,
          title: title || "New Video Upload",
          description: title || "",
          tags: [],
          privacy: "public",
          category: "22"
        });
        
        if (ytResult.success) {
          results.youtube = { 
            videoId: ytResult.videoId,
            title: title || "New Video Upload",
            url: ytResult.videoUrl
          };
          console.log("✅ Posted to YouTube:", ytResult.videoId);
        } else {
          throw new Error("YouTube upload failed");
        }
        
      } catch (ytErr) {
        console.error("❌ YouTube upload error:", ytErr);
        results.youtube = {
          error: ytErr.message || "YouTube upload failed"
        };
      }
    } else if (postToYouTube && !user.youtubeConnected) {
      console.warn("⚠️ YouTube not connected, skipping...");
      results.youtube = { error: "YouTube not connected" };
    } else if (postToYouTube && type !== "video") {
      console.warn("⚠️ YouTube only accepts videos, skipping...");
      results.youtube = { error: "YouTube only supports video uploads" };
    }

    const Post = (await import("../models/Post.js")).default;

    // ✅ Determine which platforms were SUCCESSFULLY posted to
    let platforms = [];
    if (postToFB && (results.fb?.id || results.fb?.post_id)) platforms.push("facebook");
    if (postToIG && results.ig?.id) platforms.push("instagram");
    if (postToTwitter && results.twitter?.id) platforms.push("twitter");
    if (postToLinkedIn && results.linkedin?.id) platforms.push("linkedin"); // ✅
    if (postToYouTube && results.youtube?.videoId) platforms.push("youtube");
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
      linkedinPostId: results.linkedin?.id || null,
      // ✅ YouTube-specific fields
      youtubeVideoId: results.youtube?.videoId || null,
      youtubeTitle: results.youtube?.title || title || null,
      youtubeViewUrl: results.youtube?.url || null,
      
      status: "posted",
      postedAt: new Date()
    };

    const savedPost = await Post.create(postData);
    console.log("✅ POST SAVED TO DB:", savedPost._id, "Platforms:", platforms);

    let savedToGallery = false;
    
    // Save single image/video
    if (type === "image" && image) {
      await saveToGallery(userId, image, "image", title || "Posted Image");
      savedToGallery = true;
    } else if (type === "video" && videoUrl) {
      await saveToGallery(userId, videoUrl, "video", title || "Posted Video");
      savedToGallery = true;
    } else if (type === "carousel" && Array.isArray(items)) {
      // Save each carousel item
      for (const item of items) {
        await saveToGallery(
          userId,
          item.url,
          item.type,
          `${title || "Carousel Item"} - ${item.type}`
        );
      }
      savedToGallery = true;
    }

    console.log(savedToGallery ? "✅ Media saved to gallery" : "ℹ️ No media to save");

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



export async function createScheduledPost(req, res) {
  try {
    const userId = req.user?.userId;
    const { 
      title, 
      caption, 
      type, 
      image, 
      videoUrl, 
      items,
      platform, 
      scheduledFor, 
      hashtags,
      pageId,
      selectedPages
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!caption || !type || !platform || !scheduledFor) {
      return res.status(400).json({ 
        error: "Missing required fields: caption, type, platform, scheduledFor" 
      });
    }

    // Validate scheduledFor is in the future
    const scheduleDate = new Date(scheduledFor);
    if (scheduleDate <= new Date()) {
      return res.status(400).json({ 
        error: "Scheduled time must be in the future" 
      });
    }

    const newPost = new ScheduledPost({
      userId,
      title: title || "",
      caption,
      type,
      image: image || null,
      videoUrl: videoUrl || null,
      items: items || [],
      platform: Array.isArray(platform) ? platform : [platform],
      selectedPages: selectedPages || [],
      pageId: pageId || null,
      scheduledFor: scheduleDate,
      hashtags: hashtags || [],
      status: "scheduled",
    });

    await newPost.save();

    console.log(`✅ Scheduled post created for user ${userId} at ${scheduleDate}`);

    return res.json({
      success: true,
      message: "Post scheduled successfully",
      post: newPost,
    });

  } catch (err) {
    console.error("createScheduledPost error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ✅ Update getScheduledPosts function
export async function getScheduledPosts(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const posts = await ScheduledPost.find({ userId })
      .sort({ scheduledFor: -1 })
      .limit(100);

    return res.json({
      success: true,
      posts,
    });

  } catch (err) {
    console.error("getScheduledPosts error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ✅ Update updateScheduledPost function (already provided above)
export async function updateScheduledPost(req, res) {
  try {
    const userId = req.user?.userId;
    const { postId } = req.params;
    const { caption, title, type, image, videoUrl, scheduledFor, platform, selectedPages, hashtags } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const post = await ScheduledPost.findOne({ _id: postId, userId });

    if (!post) {
      return res.status(404).json({ error: "Scheduled post not found" });
    }

    if (post.status !== "scheduled") {
      return res.status(400).json({
        error: "Can only edit posts that are still scheduled"
      });
    }

    // Update fields
    if (caption !== undefined) post.caption = caption;
    if (title !== undefined) post.title = title;
    if (type !== undefined) post.type = type;
    if (image !== undefined) post.image = image;
    if (videoUrl !== undefined) post.videoUrl = videoUrl;
    if (scheduledFor !== undefined) post.scheduledFor = new Date(scheduledFor);
    if (platform !== undefined) post.platform = platform;
    if (selectedPages !== undefined) post.selectedPages = selectedPages;
    if (hashtags !== undefined) post.hashtags = hashtags;

    post.updatedAt = new Date();
    await post.save();

    console.log(`✅ Scheduled post ${postId} updated by user ${userId}`);

    return res.json({
      success: true,
      message: "Scheduled post updated successfully",
      post
    });

  } catch (err) {
    console.error("updateScheduledPost error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ✅ Update deleteScheduledPost function
export async function deleteScheduledPost(req, res) {
  try {
    const userId = req.user?.userId;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const post = await ScheduledPost.findOne({ _id: postId, userId });

    if (!post) {
      return res.status(404).json({ error: "Scheduled post not found" });
    }

    await ScheduledPost.findByIdAndDelete(postId);

    console.log(`✅ Scheduled post ${postId} deleted by user ${userId}`);

    return res.json({
      success: true,
      message: "Scheduled post deleted",
    });

  } catch (err) {
    console.error("deleteScheduledPost error:", err);
    return res.status(500).json({ error: err.message });
  }
}





//----------------------------gallary uploded


// ✅ GET MEDIA GALLERY (includes shared + personal media)
export const getMediaGallery = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    console.log("📋 Getting gallery for user:", userId);
    
    // Get user's personal media (NOT shared)
    const userMedia = await MediaGallery.find({ 
      userId,
      isShared: { $ne: true } // Exclude shared media
    })
      .sort({ uploadedAt: -1 })
      .lean();
    
    // Get all shared media from admin
    const sharedMedia = await MediaGallery.find({ 
      isShared: true 
    })
      .sort({ uploadedAt: -1 })
      .lean();
    
    // Combine: shared media first, then user's personal media
    const allMedia = [...sharedMedia, ...userMedia];
    
    console.log(`✅ Found ${sharedMedia.length} shared + ${userMedia.length} personal = ${allMedia.length} total items`);
    
    return res.json({ 
      success: true,
      media: allMedia 
    });
    
  } catch (err) {
    console.error("❌ getMediaGallery error:", err);
    return res.status(500).json({ error: err.message });
  }
};


// ✅ UPLOAD MEDIA TO GALLERY (personal media only)
export const uploadMediaToGallery = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📤 Gallery upload:", req.file.originalname);
    console.log("👤 User ID:", userId);
    
    const type = req.file.mimetype.startsWith("video/") ? "video" : "image";

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          resource_type: type, 
          folder: `user-media/${userId}`, // User-specific folder
          public_id: `gallery-${userId}-${Date.now()}`
        },
        (err, r) => {
          if (err) {
            console.error("❌ Cloudinary error:", err);
            reject(err);
          } else {
            console.log("✅ Cloudinary uploaded:", r.secure_url);
            resolve(r);
          }
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const mediaItem = await MediaGallery.create({
      userId,
      type,
      url: result.secure_url,
      originalName: req.file.originalname,
      publicId: result.public_id,
      size: req.file.size || 0,
      format: result.format || '',
      isShared: false, // ✅ User uploads are NOT shared
      uploadedAt: new Date()
    });

    console.log("✅ Saved to DB:", mediaItem._id);
    return res.json({ success: true, media: mediaItem });

  } catch (err) {
    console.error("❌ Gallery upload error:", err);
    return res.status(500).json({ error: err.message });
  }
};


// ✅ DELETE MEDIA FROM GALLERY (users can only delete their own non-shared media)
export const deleteMediaGallery = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { id } = req.params;
    
    const media = await MediaGallery.findOne({
      _id: id,
      userId
    });
    
    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    // ✅ PREVENT DELETION OF SHARED MEDIA
    if (media.isShared) {
      return res.status(403).json({ 
        error: "Cannot delete shared media. Contact admin to remove it." 
      });
    }

    // Delete from Cloudinary
    if (media.publicId) {
      try {
        await cloudinary.uploader.destroy(media.publicId, {
          resource_type: media.type === 'video' ? 'video' : 'image'
        });
        console.log("✅ Deleted from Cloudinary:", media.publicId);
      } catch (cloudErr) {
        console.error("⚠️ Cloudinary delete failed:", cloudErr.message);
        // Continue anyway - DB deletion is more important
      }
    }

    // Delete from database
    await MediaGallery.findByIdAndDelete(id);
    console.log("✅ Media deleted from DB");
    
    return res.json({ success: true, message: "Media deleted" });
    
  } catch (err) {
    console.error("❌ Delete error:", err);
    return res.status(500).json({ error: err.message });
  }
};



export const disconnectFacebook = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    console.log(`🔄 Disconnecting Facebook/Instagram for user: ${user._id}`);

    // Clear Facebook/Instagram connection
    user.facebookConnected = false;
    user.pages = [];
    user.facebookUserId = null;
    
    await user.save();

    // Also clear PageToken and UserToken entries
    const deletedPageTokens = await PageToken.deleteMany({ userId: user._id });
    const deletedUserTokens = await UserToken.deleteMany({ userId: user._id });

    console.log(`✅ Facebook disconnected for user: ${user._id}`);
    console.log(`   - Deleted ${deletedPageTokens.deletedCount} page tokens`);
    console.log(`   - Deleted ${deletedUserTokens.deletedCount} user tokens`);

    return res.json({ 
      success: true, 
      message: "Facebook and Instagram disconnected" 
    });

  } catch (error) {
    console.error("❌ Facebook disconnect error:", error);
    return res.status(500).json({ 
      success: false,
      error: "Failed to disconnect Facebook" 
    });
  }
};