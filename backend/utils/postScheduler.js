// utils/postScheduler.js - ADD LinkedIn support
import cron from "node-cron";
import User from "../models/User.js";
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
    const Post = (await import("../models/Post.js")).default;
    const dueDate = new Date();
    
    const scheduledPosts = await Post.find({
      status: "scheduled",
      scheduledFor: { $lte: dueDate }
    }).limit(10);

    if (scheduledPosts.length === 0) return;

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
      console.error(`User not found for post ${post._id}`);
      post.status = "failed";
      await post.save();
      return;
    }

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
          result = await publishToTwitter(user, post, formattedContent);
        } else if (platform === "facebook" && user.facebookConnected) {
          result = await publishToFacebook(user, post, formattedContent);
        } else if (platform === "instagram" && user.facebookConnected) {
          result = await publishToInstagram(user, post, formattedContent);
        } else if (platform === "linkedin" && user.linkedin?.connected) {
          // ✅ ADD LINKEDIN SUPPORT
          result = await publishToLinkedIn(user, post, formattedContent);
        }

        if (result && result.success) {
          platformResults.push({
            platform,
            success: true,
            postId: result.postId,
            publishedAt: new Date()
          });
        } else {
          platformResults.push({
            platform,
            success: false,
            error: result?.error || "Platform not connected",
            publishedAt: new Date()
          });
        }
      } catch (platformError) {
        console.error(`Error publishing to ${platform}:`, platformError);
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

    post.platformResults = platformResults;
    post.status = allSuccess ? "posted" : (anySuccess ? "posted" : "failed");
    post.postedAt = anySuccess ? new Date() : null;

    if (!allSuccess && post.retryCount < post.maxRetries) {
      post.retryCount += 1;
      post.scheduledFor = new Date(Date.now() + 5 * 60 * 1000);
      post.status = "scheduled";
    }

    await post.save();
    console.log(`✅ Post ${post._id} published - Success: ${allSuccess}`);
  } catch (error) {
    console.error(`Failed to publish post ${post._id}:`, error);
    post.status = "failed";
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
    post.tweetId = tweet.data.id;
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

    post.fbPostId = json.id;
    return {
      success: true,
      postId: json.id
    };
  } catch (error) {
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

    post.igMediaId = publishJson.id;
    return {
      success: true,
      postId: publishJson.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ✅ NEW: LinkedIn publishing
async function publishToLinkedIn(user, post, content) {
  try {
    console.log(`📤 Publishing to LinkedIn for user: ${user._id}`);

    const result = await postToLinkedInHelper({
      userId: user._id,
      text: content,
      imageUrl: post.image || null
    });

    post.linkedinPostId = result.id;
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
