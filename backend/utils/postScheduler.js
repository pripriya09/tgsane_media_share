// utils/postScheduler.js - FIXED VERSION
import cron from "node-cron";
import User from "../models/User.js";
import ScheduledPost from "../models/ScheduledPost.js"; // ✅ CHANGED FROM Post to ScheduledPost
import { TwitterApi } from "twitter-api-v2";
import fetch from "node-fetch";
import { formatPostContent } from "./postHelpers.js";
import fs from "fs";
import path from "path";
import axios from "axios";

// ✅ Import LinkedIn helper
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
    
    // ✅ CHANGED: Use ScheduledPost model instead of Post
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
      post.status = "failed";
      post.error = "User not found";
      await post.save();
      return;
    }

    console.log(`🚀 Publishing post ${post._id} for user ${user.email}`);

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

    // ✅ FIXED: Determine final status
    const allSuccess = platformResults.every(r => r.success);
    const anySuccess = platformResults.some(r => r.success);

    post.results = platformResults;

    // ✅ FIXED: Only retry if COMPLETELY failed (no platforms succeeded)
    if (!anySuccess && (!post.retryCount || post.retryCount < 3)) {
      // Total failure - retry
      post.retryCount = (post.retryCount || 0) + 1;
      post.scheduledFor = new Date(Date.now() + 5 * 60 * 1000);
      post.status = "scheduled";
      post.error = "All platforms failed - will retry";
      console.log(`🔄 Total failure - Will retry post ${post._id} (attempt ${post.retryCount}/3)`);
    } else {
      // ✅ At least one platform succeeded OR max retries reached
      if (anySuccess) {
        post.status = "posted"; // ✅ Mark as posted
        post.postedAt = new Date();
        post.error = allSuccess ? null : "Posted to some platforms only";
        console.log(`✅ Post ${post._id} successfully posted`);
        
        // Save media to gallery
        await saveToGallery(post, user);
      } else {
        // Max retries reached
        post.status = "failed";
        post.error = "Failed after 3 attempts";
        console.log(`❌ Post ${post._id} failed permanently`);
      }
    }

    await post.save();
    console.log(`✅ Post ${post._id} processing complete - Status: ${post.status}`);

  } catch (error) {
    console.error(`❌ Failed to publish post ${post._id}:`, error);
    post.status = "failed";
    post.error = error.message;
    await post.save();
  }
}
// Twitter publishing
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

// Facebook publishing
async function publishToFacebook(user, post, content) {
  try {
    const page = user.pages?.find(p => String(p.pageId) === String(post.pageId));
    if (!page) throw new Error("Page not found");

    const endpoint = `https://graph.facebook.com/${FB_API_VERSION}/${page.pageId}/feed`;
    const params = new URLSearchParams({
      message: content,
      access_token: page.pageAccessToken
    });

    if (post.image) {
      params.set("link", post.image);
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      body: params
    });

    const json = await resp.json();
    if (json.error) throw new Error(json.error.message);

    console.log(`✅ Facebook post created: ${json.id}`);
    return {
      success: true,
      postId: json.id
    };
  } catch (error) {
    console.error("❌ Facebook error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Instagram publishing
async function publishToInstagram(user, post, content) {
  try {
    const page = user.pages?.find(p => String(p.pageId) === String(post.pageId));
    if (!page || !page.instagramBusinessId) {
      throw new Error("Instagram not connected");
    }

    // Create container
    const createResp = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${page.instagramBusinessId}/media`,
      {
        method: "POST",
        body: new URLSearchParams({
          image_url: post.image,
          caption: content,
          access_token: page.pageAccessToken
        })
      }
    );

    const createJson = await createResp.json();
    if (createJson.error) throw new Error(createJson.error.message);

    // Publish container
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
    if (publishJson.error) throw new Error(publishJson.error.message);

    console.log(`✅ Instagram post created: ${publishJson.id}`);
    return {
      success: true,
      postId: publishJson.id
    };
  } catch (error) {
    console.error("❌ Instagram error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ✅ LinkedIn publishing
async function publishToLinkedIn(user, post, content) {
  try {
    console.log(`📤 Publishing to LinkedIn for user: ${user._id}`);

    const result = await postToLinkedInHelper({
      userId: user._id,
      text: content,
      imageUrl: post.image || null
    });

    console.log(`✅ LinkedIn post created: ${result.id}`);

    return {
      success: true,
      postId: result.id
    };
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
    // Only save if post was successful
    if (post.status !== "posted") return;

    const MediaGallery = (await import("../models/MediaGallery.js")).default;

    // Check if media already exists in gallery
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

    // Create new gallery entry
    const newMedia = new MediaGallery({
      userId: user._id,
      url: mediaUrl,
      type: post.type === "video" ? "video" : "image",
      originalName: post.title || post.caption || "Scheduled Post Media",
      size: 0, // Unknown size
      format: post.type === "video" ? "mp4" : "jpg",
      uploadedAt: new Date()
    });

    await newMedia.save();
    console.log(`✅ Media saved to gallery: ${mediaUrl}`);

  } catch (error) {
    console.error("❌ Failed to save to gallery:", error);
    // Don't throw - gallery save is not critical
  }
}