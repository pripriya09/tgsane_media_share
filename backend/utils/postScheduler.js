// utils/postScheduler.js - COMPLETE FIXED VERSION
import cron from "node-cron";
import User from "../models/User.js";
import ScheduledPost from "../models/ScheduledPost.js";
import { TwitterApi } from "twitter-api-v2";
import fetch from "node-fetch";
import { formatPostContent } from "./postHelpers.js";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

// Import LinkedIn helper
import { postToLinkedInHelper } from "./linkedinService.js";

const FB_API_VERSION = "v24.0";

export const startPostScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      console.log("⏰ Checking for scheduled posts...");
      await processScheduledPosts();
    } catch (error) {
      console.error("Scheduler Error:", error);
    }
  });
  console.log("✅ Post scheduler started - checking every minute");
};

async function processScheduledPosts() {
  try {
    const dueDate = new Date();
    
    const scheduledPosts = await ScheduledPost.find({
      status: "scheduled",
      scheduledFor: { $lte: dueDate }
    }).limit(10);

    if (scheduledPosts.length === 0) {
      console.log("✅ No posts due for publishing");
      return;
    }

    console.log(`📤 Publishing ${scheduledPosts.length} scheduled posts...`);

    for (const post of scheduledPosts) {
      await publishPost(post);
    }
  } catch (error) {
    console.error("Process Scheduled Posts Error:", error);
  }
}

async function publishPost(post) {
  try {
    const user = await User.findById(post.userId);
    
    if (!user) {
      console.error(`❌ User not found for post ${post._id}`);
      
      // ✅ Use findByIdAndUpdate to avoid version conflicts
      await ScheduledPost.findByIdAndUpdate(post._id, {
        status: "failed",
        error: "User not found"
      });
      return;
    }

    console.log(`🚀 Publishing post ${post._id} for user ${user.email}`);
    console.log(`📝 Post type: ${post.type}`);
    console.log(`🎬 Media: ${post.image || post.videoUrl || 'No media'}`);

    const platformResults = [];

    for (const platform of post.platform) {
      const formattedContent = formatPostContent(
        post.caption || post.title,
        post.hashtags,
        platform
      );

      try {
        let result = null;

        if (platform === "twitter" && user.twitterConnected) {
          console.log("📱 Publishing to Twitter...");
          result = await publishToTwitter(user, post, formattedContent);
        } else if (platform === "facebook" && user.facebookConnected) {
          console.log("📘 Publishing to Facebook...");
          result = await publishToFacebook(user, post, formattedContent);
        } else if (platform === "instagram" && user.facebookConnected) {
          console.log("📸 Publishing to Instagram...");
          result = await publishToInstagram(user, post, formattedContent);
        } else if (platform === "linkedin" && user.linkedin?.connected) {
          console.log("💼 Publishing to LinkedIn...");
          result = await publishToLinkedIn(user, post, formattedContent);
        } else if (platform === "youtube" && user.youtubeConnected) {
          console.log("📺 Publishing to YouTube...");
          result = await publishToYouTube(user, post, formattedContent);
        } else {
          console.log(`⚠️ Platform ${platform} not connected`);
        }

        if (result && result.success) {
          platformResults.push({
            platform,
            success: true,
            postId: result.postId,
            url: result.url || null,
            publishedAt: new Date()
          });
          console.log(`✅ ${platform} success: ${result.postId}`);
        } else {
          platformResults.push({
            platform,
            success: false,
            error: result?.error || "Platform not connected",
            publishedAt: new Date()
          });
          console.log(`❌ ${platform} failed: ${result?.error || "Not connected"}`);
        }
      } catch (platformError) {
        console.error(`❌ Error publishing to ${platform}:`, platformError);
        platformResults.push({
          platform,
          success: false,
          error: platformError.message,
          publishedAt: new Date()
        });
      }
    }

    const allSuccess = platformResults.every(r => r.success);
    const anySuccess = platformResults.some(r => r.success);

    // ✅ Use findByIdAndUpdate instead of post.save() to avoid version conflicts
    const updateData = {
      results: platformResults,
      updatedAt: new Date()
    };

    if (!anySuccess && (!post.retryCount || post.retryCount < 3)) {
      // Retry logic
      updateData.retryCount = (post.retryCount || 0) + 1;
      updateData.scheduledFor = new Date(Date.now() + 5 * 60 * 1000);
      updateData.status = "scheduled";
      updateData.error = "All platforms failed - will retry";
      console.log(`🔄 Will retry post ${post._id} (attempt ${updateData.retryCount}/3)`);
    } else {
      if (anySuccess) {
        updateData.status = "posted";
        updateData.postedAt = new Date();
        updateData.error = allSuccess ? null : "Posted to some platforms only";
        console.log(`✅ Post ${post._id} successfully posted`);
        
        // Save to gallery
        await saveToGallery(post, user);
      } else {
        updateData.status = "failed";
        updateData.error = "Failed after 3 attempts";
        console.log(`❌ Post ${post._id} failed permanently`);
      }
    }

    // ✅ Update using findByIdAndUpdate (no version conflict)
    await ScheduledPost.findByIdAndUpdate(post._id, updateData, { new: true });
    console.log(`✅ Post ${post._id} processing complete - Status: ${updateData.status}`);

  } catch (error) {
    console.error(`❌ Failed to publish post ${post._id}:`, error);
    
    // ✅ Use findByIdAndUpdate for error updates too
    await ScheduledPost.findByIdAndUpdate(post._id, {
      status: "failed",
      error: error.message,
      updatedAt: new Date()
    });
  }
}

// ========== TWITTER PUBLISHING ========== ✅ ALREADY WORKING
async function publishToTwitter(user, post, content) {
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_KEY_SECRET,
      accessToken: user.twitterAccessToken,
      accessSecret: user.twitterAccessSecret,
    });

    const tweetData = { text: content };

    if (post.image || post.videoUrl) {
      try {
        const mediaUrl = post.image || post.videoUrl;
        console.log(`📥 Downloading media from: ${mediaUrl}`);

        const tempDir = path.join(process.cwd(), "temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const response = await axios.get(mediaUrl, {
          responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(response.data);
        const isVideo = post.type === "video" || post.videoUrl;
        const ext = isVideo ? "mp4" : "jpg";
        const tempPath = path.join(tempDir, `twitter_${Date.now()}.${ext}`);
        
        fs.writeFileSync(tempPath, buffer);
        console.log(`💾 Saved to: ${tempPath}`);

        const mediaId = await client.v1.uploadMedia(tempPath);
        tweetData.media = { media_ids: [mediaId] };

        fs.unlinkSync(tempPath);
        console.log(`✅ Twitter media uploaded: ${mediaId}`);
      } catch (mediaErr) {
        console.error("❌ Twitter media upload error:", mediaErr);
      }
    }

    const tweet = await client.v2.tweet(tweetData);
    console.log(`✅ Tweet posted: ${tweet.data.id}`);

    return {
      success: true,
      postId: tweet.data.id,
      url: `https://twitter.com/${user.twitterUsername}/status/${tweet.data.id}`
    };
  } catch (error) {
    console.error("❌ Twitter publish error:", error);
    return {
      success: false,
      error: error.message || "Failed to post to Twitter"
    };
  }
}

// ========== FACEBOOK PUBLISHING ========== 🔧 FIXED FOR VIDEO
async function publishToFacebook(user, post, content) {
  try {
    const page = user.pages?.find(p => String(p.pageId) === String(post.pageId));
    if (!page) throw new Error("Page not found");

    const isVideo = post.type === "video" || post.videoUrl;
    const mediaUrl = post.videoUrl || post.image;

    console.log(`📘 Facebook - Type: ${post.type}, HasVideo: ${!!post.videoUrl}, HasImage: ${!!post.image}`);

    if (isVideo && mediaUrl) {
      // ✅ VIDEO POST
      console.log(`🎬 Posting VIDEO to Facebook: ${mediaUrl}`);

      const endpoint = `https://graph.facebook.com/${FB_API_VERSION}/${page.pageId}/videos`;
      
      const params = new URLSearchParams({
        description: content,
        file_url: mediaUrl,  // ✅ Use file_url for videos
        access_token: page.pageAccessToken
      });

      const resp = await fetch(endpoint, {
        method: "POST",
        body: params
      });

      const json = await resp.json();
      
      if (json.error) {
        console.error("❌ Facebook video error:", json.error);
        throw new Error(json.error.message);
      }

      console.log(`✅ Facebook video posted: ${json.id}`);
      return {
        success: true,
        postId: json.id
      };

    } else if (post.image) {
      // ✅ IMAGE POST
      console.log(`🖼️ Posting IMAGE to Facebook: ${post.image}`);

      const endpoint = `https://graph.facebook.com/${FB_API_VERSION}/${page.pageId}/photos`;
      
      const params = new URLSearchParams({
        message: content,
        url: post.image,  // ✅ Use url parameter for images
        access_token: page.pageAccessToken
      });

      const resp = await fetch(endpoint, {
        method: "POST",
        body: params
      });

      const json = await resp.json();
      
      if (json.error) {
        console.error("❌ Facebook image error:", json.error);
        throw new Error(json.error.message);
      }

      console.log(`✅ Facebook image posted: ${json.id}`);
      return {
        success: true,
        postId: json.id
      };

    } else {
      // ✅ TEXT POST (no media)
      console.log(`📝 Posting TEXT to Facebook`);

      const endpoint = `https://graph.facebook.com/${FB_API_VERSION}/${page.pageId}/feed`;
      
      const params = new URLSearchParams({
        message: content,
        access_token: page.pageAccessToken
      });

      const resp = await fetch(endpoint, {
        method: "POST",
        body: params
      });

      const json = await resp.json();
      
      if (json.error) {
        console.error("❌ Facebook text post error:", json.error);
        throw new Error(json.error.message);
      }

      console.log(`✅ Facebook text post created: ${json.id}`);
      return {
        success: true,
        postId: json.id
      };
    }

  } catch (error) {
    console.error("❌ Facebook error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ========== INSTAGRAM PUBLISHING ========== 🔧 FIXED FOR VIDEO
async function publishToInstagram(user, post, content) {
  try {
    const page = user.pages?.find(p => String(p.pageId) === String(post.pageId));
    if (!page || !page.instagramBusinessId) {
      throw new Error("Instagram not connected");
    }

    const isVideo = post.type === "video" || post.videoUrl;
    const mediaUrl = post.videoUrl || post.image;

    if (!mediaUrl) {
      throw new Error("No media URL provided");
    }

    console.log(`📸 Instagram - Type: ${post.type}, IsVideo: ${isVideo}, URL: ${mediaUrl}`);

    if (isVideo) {
      // ✅ VIDEO POST (REELS) - COMPLETELY REWRITTEN
      console.log(`🎬 Posting VIDEO to Instagram as Reel: ${mediaUrl}`);

      // Step 1: Create video container
      const createParams = new URLSearchParams({
        video_url: mediaUrl,
        caption: content,
        media_type: "REELS",
        share_to_feed: "true", // ✅ IMPORTANT: Share to feed too
        access_token: page.pageAccessToken
      });

      console.log(`📤 Creating Instagram Reel container...`);
      
      const createResp = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/${page.instagramBusinessId}/media`,
        {
          method: "POST",
          body: createParams
        }
      );

      const createJson = await createResp.json();
      
      if (createJson.error) {
        console.error("❌ Instagram video container error:", createJson.error);
        throw new Error(createJson.error.message);
      }

      const containerId = createJson.id;
      console.log(`✅ Instagram Reel container created: ${containerId}`);

      // ✅ Step 2: Poll status until FINISHED (critical!)
      console.log(`⏳ Waiting for Instagram to process video...`);
      
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 5 seconds = 2.5 minutes max
      let lastStatus = "UNKNOWN";
      
      while (!isReady && attempts < maxAttempts) {
        attempts++;
        
        // Wait 5 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          const statusResp = await fetch(
            `https://graph.facebook.com/${FB_API_VERSION}/${containerId}?fields=status_code,status&access_token=${page.pageAccessToken}`
          );
          
          const statusJson = await statusResp.json();
          lastStatus = statusJson.status_code || statusJson.status || "UNKNOWN";
          
          console.log(`🔍 Attempt ${attempts}/${maxAttempts} - Status: ${lastStatus}`);
          
          if (lastStatus === "FINISHED") {
            isReady = true;
            console.log(`✅ Video processing complete!`);
            break;
          } else if (lastStatus === "ERROR" || lastStatus === "FAILED") {
            throw new Error(`Video processing failed with status: ${lastStatus}`);
          } else {
            console.log(`⏳ Still processing (${lastStatus})... waiting 5 more seconds`);
          }
        } catch (statusErr) {
          console.warn(`⚠️ Status check error (attempt ${attempts}): ${statusErr.message}`);
          
          // If we can't check status after many attempts, try publishing anyway
          if (attempts >= 15) {
            console.warn(`⚠️ Cannot verify status after ${attempts} attempts, will try to publish...`);
            isReady = true;
            break;
          }
        }
      }
      
      if (!isReady) {
        throw new Error(`Video processing timeout after ${attempts} attempts (last status: ${lastStatus}). Try a shorter video or wait and retry.`);
      }

      // Step 3: Publish the video
      console.log(`📤 Publishing Reel to Instagram feed...`);
      
      const publishParams = new URLSearchParams({
        creation_id: containerId,
        access_token: page.pageAccessToken
      });
      
      const publishResp = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/${page.instagramBusinessId}/media_publish`,
        {
          method: "POST",
          body: publishParams
        }
      );

      const publishJson = await publishResp.json();
      
      if (publishJson.error) {
        console.error("❌ Instagram Reel publish error:", publishJson.error);
        throw new Error(publishJson.error.message || "Failed to publish Reel");
      }

      console.log(`✅ Instagram Reel posted successfully: ${publishJson.id}`);
      return {
        success: true,
        postId: publishJson.id
      };

    } else {
      // ✅ IMAGE POST (unchanged - already working)
      console.log(`🖼️ Posting IMAGE to Instagram: ${mediaUrl}`);

      // Create image container
      const createResp = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/${page.instagramBusinessId}/media`,
        {
          method: "POST",
          body: new URLSearchParams({
            image_url: mediaUrl,
            caption: content,
            access_token: page.pageAccessToken
          })
        }
      );

      const createJson = await createResp.json();
      
      if (createJson.error) {
        console.error("❌ Instagram image container error:", createJson.error);
        throw new Error(createJson.error.message);
      }

      console.log(`✅ Instagram image container created: ${createJson.id}`);

      // Publish image
      const publishResp = await fetch(
        `https://graph.facebook.com/${FB_API_VERSION}/${page.instagramBusinessId}/media_publish`,
        {
          method: "POST",
          body: new URLSearchParams({
            creation_id: createJson.id,
            access_token: page.pageAccessToken
          })
        }
      );

      const publishJson = await publishResp.json();
      
      if (publishJson.error) {
        console.error("❌ Instagram image publish error:", publishJson.error);
        throw new Error(publishJson.error.message);
      }

      console.log(`✅ Instagram image posted: ${publishJson.id}`);
      return {
        success: true,
        postId: publishJson.id
      };
    }

  } catch (error) {
    console.error("❌ Instagram error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ========== LINKEDIN PUBLISHING ========== 🔧 FIXED FOR VIDEO
async function publishToLinkedIn(user, post, content) {
  try {
    console.log(`📤 Publishing to LinkedIn for user: ${user._id}`);
    console.log(`💼 LinkedIn - Type: ${post.type}, HasVideo: ${!!post.videoUrl}, HasImage: ${!!post.image}`);

    const isVideo = post.type === "video" || post.videoUrl;
    const mediaUrl = post.videoUrl || post.image;

    if (isVideo && mediaUrl) {
      // ✅ VIDEO POST
      console.log(`🎬 Posting VIDEO to LinkedIn: ${mediaUrl}`);

      const result = await postToLinkedInHelper({
        userId: user._id,
        text: content,
        videoUrl: mediaUrl  // ✅ Pass videoUrl for videos
      });

      console.log(`✅ LinkedIn video posted: ${result.id}`);
      return {
        success: true,
        postId: result.id
      };

    } else if (post.image) {
      // ✅ IMAGE POST
      console.log(`🖼️ Posting IMAGE to LinkedIn: ${post.image}`);

      const result = await postToLinkedInHelper({
        userId: user._id,
        text: content,
        imageUrl: post.image  // ✅ Pass imageUrl for images
      });

      console.log(`✅ LinkedIn image posted: ${result.id}`);
      return {
        success: true,
        postId: result.id
      };

    } else {
      // ✅ TEXT POST
      console.log(`📝 Posting TEXT to LinkedIn`);

      const result = await postToLinkedInHelper({
        userId: user._id,
        text: content
      });

      console.log(`✅ LinkedIn text post created: ${result.id}`);
      return {
        success: true,
        postId: result.id
      };
    }

  } catch (error) {
    console.error("❌ LinkedIn publish error:", error);
    return {
      success: false,
      error: error.message || "Failed to post to LinkedIn"
    };
  }
}

async function saveToGallery(post, user) {
  try {
    if (post.status !== "posted") return;

    const MediaGallery = (await import("../models/MediaGallery.js")).default;

    const mediaUrl = post.image || post.videoUrl;
    if (!mediaUrl) return;

    const existingMedia = await MediaGallery.findOne({
      userId: user._id,
      url: mediaUrl
    });

    if (existingMedia) {
      console.log("✅ Media already in gallery");
      return;
    }

    const newMedia = new MediaGallery({
      userId: user._id,
      url: mediaUrl,
      type: post.type === "video" ? "video" : "image",
      originalName: post.title || post.caption || "Scheduled Post Media",
      size: 0,
      format: post.type === "video" ? "mp4" : "jpg",
      uploadedAt: new Date()
    });

    await newMedia.save();
    console.log(`✅ Media saved to gallery: ${mediaUrl}`);

  } catch (error) {
    console.error("❌ Failed to save to gallery:", error);
  }
}





// youtube service
import { refreshYouTubeToken, uploadVideoToYouTube } from "./youtubeService.js";

async function publishToYouTube(user, post, content) {
  try {
    console.log(`📺 Publishing to YouTube...`);

    if (!user.youtubeConnected || !user.youtubeAccessToken) {
      throw new Error("YouTube not connected");
    }

    // Check if token expired, refresh if needed
    if (user.youtubeTokenExpiry && new Date() >= user.youtubeTokenExpiry) {
      console.log(`🔄 Refreshing YouTube token...`);
      const { accessToken, expiresIn } = await refreshYouTubeToken(user.youtubeRefreshToken);
      user.youtubeAccessToken = accessToken;
      user.youtubeTokenExpiry = new Date(Date.now() + expiresIn * 1000);
      await user.save();
      console.log(`✅ YouTube token refreshed`);
    }

    // YouTube requires video
    if (!post.videoUrl) {
      throw new Error("Video is required for YouTube");
    }

    // Upload video
    const result = await uploadVideoToYouTube({
      accessToken: user.youtubeAccessToken,
      videoUrl: post.videoUrl,
      title: post.youtubeTitle || post.title || "Untitled Video",
      description: post.youtubeDescription || content,
      tags: post.youtubeTags || post.hashtags || [],
      privacy: post.youtubePrivacy || "public",
      category: post.youtubeCategory || "22"
    });

    console.log(`✅ YouTube video published: ${result.videoId}`);
    
    return {
      success: true,
      postId: result.videoId,
      url: result.videoUrl
    };

  } catch (error) {
    console.error("❌ YouTube publish error:", error);
    return {
      success: false,
      error: error.message || "Failed to post to YouTube"
    };
  }
}
