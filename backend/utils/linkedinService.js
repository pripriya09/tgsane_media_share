// backend/service/linkedinService.js

import axios from "axios";
import User from "../models/User.js";
import crypto from "crypto";

const LINKEDIN_API_URL = "https://api.linkedin.com/v2";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-cbc";

function decrypt(text) {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedText = parts.join(":");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ✅ Upload image to LinkedIn
async function uploadImageToLinkedIn(imageUrl, accessToken, memberUrn) {
  try {
    console.log("📤 Starting LinkedIn image upload...");
    console.log("Image URL:", imageUrl);

    // Step 1: Register the upload
    const registerPayload = {
      registerUploadRequest: {
        owner: memberUrn,
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        serviceRelationships: [
          {
            identifier: "urn:li:userGeneratedContent",
            relationshipType: "OWNER"
          }
        ]
      }
    };

    console.log("📝 Registering image upload with LinkedIn...");
    const registerResponse = await axios.post(
      `${LINKEDIN_API_URL}/assets?action=registerUpload`,
      registerPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    const uploadUrl = registerResponse.data.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl;
    
    const assetUrn = registerResponse.data.value.asset;

    console.log("✅ LinkedIn image registered:", assetUrn);

    // Step 2: Download image from Cloudinary
    console.log("⬇️ Downloading image from Cloudinary...");
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    console.log("✅ Image downloaded, size:", imageBuffer.length, "bytes");

    // Step 3: Upload image binary to LinkedIn
    console.log("📤 Uploading image to LinkedIn...");
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": imageBuffer.length
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000
    });

    console.log("✅ LinkedIn image uploaded successfully!");
    return assetUrn;

  } catch (err) {
    console.error("❌ LinkedIn image upload error:");
    console.error("Error:", err.response?.data || err.message);
    throw new Error(`LinkedIn image upload failed: ${err.response?.data?.message || err.message}`);
  }
}

// ✅ NEW: Upload video to LinkedIn
// ✅ FIXED: Upload video to LinkedIn
async function uploadVideoToLinkedIn(videoUrl, accessToken, memberUrn, text) {
  try {
    console.log("📹 Starting LinkedIn video upload...");
    console.log("Video URL:", videoUrl);

    // Step 1: Download video to get file size
    console.log("⬇️ Downloading video from Cloudinary...");
    const videoResponse = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 120000
    });
    const videoBuffer = Buffer.from(videoResponse.data);
    const fileSize = videoBuffer.length;
    console.log("✅ Video downloaded, size:", fileSize, "bytes");

    // Step 2: Initialize video upload
    const initPayload = {
      initializeUploadRequest: {
        owner: memberUrn,
        fileSizeBytes: fileSize,
        uploadCaptions: false,
        uploadThumbnail: false
      }
    };

    console.log("📝 Initializing video upload with LinkedIn...");
    const initResponse = await axios.post(
      `${LINKEDIN_API_URL}/videos?action=initializeUpload`,
      initPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    const uploadInstructions = initResponse.data.value.uploadInstructions;
    const videoUrn = initResponse.data.value.video;
    const uploadToken = initResponse.data.value.uploadToken || "";
    
    console.log("✅ Video upload initialized:", videoUrn);
    console.log("Upload token:", uploadToken);
    console.log("Upload instructions:", uploadInstructions.length, "parts");

    // Step 3: Upload video in parts and collect ETags
    const uploadedPartIds = [];
    
    for (let instruction of uploadInstructions) {
      const { uploadUrl, firstByte, lastByte } = instruction;
      const chunk = videoBuffer.slice(firstByte, lastByte + 1);
      
      console.log(`📤 Uploading chunk: bytes ${firstByte}-${lastByte} (${chunk.length} bytes)`);
      
      const uploadResponse = await axios.put(uploadUrl, chunk, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": chunk.length
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000
      });
      
      // ✅ Get ETag from response headers (important!)
      const etag = uploadResponse.headers['etag'];
      if (etag) {
        uploadedPartIds.push(etag);
        console.log(`✅ Chunk uploaded with ETag: ${etag}`);
      } else {
        console.log(`✅ Chunk uploaded: ${firstByte}-${lastByte}`);
      }
    }

    // Step 4: Finalize upload with ETags
    console.log("🔄 Finalizing video upload...");
    const finalizePayload = {
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken: uploadToken,
        uploadedPartIds: uploadedPartIds.length > 0 ? uploadedPartIds : []
      }
    };

    console.log("Finalize payload:", JSON.stringify(finalizePayload, null, 2));

    await axios.post(
      `${LINKEDIN_API_URL}/videos?action=finalizeUpload`,
      finalizePayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    console.log("✅ Video finalized successfully!");

    // Step 5: Wait for LinkedIn to process the video
    console.log("⏳ Waiting for LinkedIn to process video...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 6: Check video status
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 12; // 12 attempts * 5 seconds = 1 minute max wait

    while (!processingComplete && attempts < maxAttempts) {
      attempts++;
      console.log(`🔍 Checking video status (attempt ${attempts}/${maxAttempts})...`);

      try {
        const statusResponse = await axios.get(
          `${LINKEDIN_API_URL}/videos/${encodeURIComponent(videoUrn)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-Restli-Protocol-Version": "2.0.0"
            }
          }
        );

        const status = statusResponse.data.status;
        console.log("📊 Video status:", status);

        if (status === "AVAILABLE" || status === "PROCESSING_SUCCEEDED") {
          processingComplete = true;
          console.log("✅ Video processing complete!");
        } else if (status === "PROCESSING_FAILED") {
          throw new Error("Video processing failed on LinkedIn");
        } else {
          console.log("⏳ Still processing, waiting 5 seconds...");
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (statusErr) {
        console.warn("⚠️ Could not check video status:", statusErr.message);
        // Continue anyway after some attempts
        if (attempts >= 6) {
          console.log("⚠️ Continuing without status confirmation...");
          processingComplete = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    if (!processingComplete) {
      console.warn("⚠️ Video may still be processing, but posting anyway...");
    }

    // ✅ CRITICAL FIX: Convert video URN to digitalmediaAsset URN
    const assetUrn = videoUrn.replace(':video:', ':digitalmediaAsset:');
    console.log("🔄 Original video URN:", videoUrn);
    console.log("✅ Converted asset URN:", assetUrn);

    return assetUrn; // ← Return digitalmediaAsset URN, not video URN!

  } catch (err) {
    console.error("❌ LinkedIn video upload error:");
    console.error("Error:", err.response?.data || err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Response:", JSON.stringify(err.response.data, null, 2));
    }
    throw new Error(`LinkedIn video upload failed: ${err.response?.data?.message || err.message}`);
  }
}


// ✅ Main posting function with video support
export async function postToLinkedInHelper({ userId, text, imageUrl, videoUrl }) {
  try {
    console.log("🔍 Looking up user:", userId);
    const user = await User.findById(userId);

    if (!user?.linkedin?.accessToken || !user.linkedin.userId) {
      throw new Error("LinkedIn not connected for this user");
    }

    console.log("✅ User found:", user.linkedin.name);
    console.log("🔓 Decrypting access token...");
    const accessToken = decrypt(user.linkedin.accessToken);
    const memberUrn = `urn:li:person:${user.linkedin.userId}`;
    console.log("✅ Member URN:", memberUrn);

    let media = null;
    let shareMediaCategory = "NONE";

    // ✅ Handle VIDEO upload
    if (videoUrl) {
      try {
        console.log("📹 Video detected, uploading to LinkedIn...");
        const videoAssetUrn = await uploadVideoToLinkedIn(videoUrl, accessToken, memberUrn, text);
        
        media = [
          {
            status: "READY",
            description: {
              text: text || ""
            },
            media: videoAssetUrn,
            title: {
              text: "Video"
            }
          }
        ];
        
        shareMediaCategory = "VIDEO";
        console.log("✅ Video media array created with asset:", videoAssetUrn);
        
      } catch (uploadErr) {
        console.error("⚠️ Video upload failed, posting text only:", uploadErr.message);
        // Continue without video if upload fails
      }
    }
    // ✅ Handle IMAGE upload
    else if (imageUrl) {
      try {
        console.log("📸 Image detected, uploading to LinkedIn...");
        const imageAssetUrn = await uploadImageToLinkedIn(imageUrl, accessToken, memberUrn);
        
        media = [
          {
            status: "READY",
            description: {
              text: text || ""
            },
            media: imageAssetUrn,
            title: {
              text: "Image"
            }
          }
        ];
        
        shareMediaCategory = "IMAGE";
        console.log("✅ Image media array created with asset:", imageAssetUrn);
        
      } catch (uploadErr) {
        console.error("⚠️ Image upload failed, posting text only:", uploadErr.message);
        // Continue without image if upload fails
      }
    }

    // ✅ Build payload
    const payload = {
      author: memberUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text || "Check out my post!"
          },
          shareMediaCategory: shareMediaCategory,
          ...(media && { media })
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    console.log("📤 Posting to LinkedIn...");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    // Post to LinkedIn
    const postRes = await axios.post(
      `${LINKEDIN_API_URL}/ugcPosts`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    const postId = postRes.headers['x-restli-id'] || postRes.data.id;
    console.log("✅ Posted to LinkedIn successfully! ID:", postId);

    return { id: postId };
    
  } catch (err) {
    console.error("❌ LinkedIn post error:");
    console.error("Error message:", err.message);
    console.error("Response data:", err.response?.data);
    console.error("Response status:", err.response?.status);
    
    throw new Error(
      err.response?.data?.message || 
      err.response?.data?.error || 
      err.message || 
      "LinkedIn post failed"
    );
  }
}
