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

// ✅ Helper: Register and upload image to LinkedIn
async function uploadImageToLinkedIn(imageUrl, accessToken, memberUrn) {
  try {
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
        ],
        // ✅ Use synchronous upload to ensure image is ready before posting
        supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"]
      }
    };

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
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Step 3: Upload image binary to LinkedIn
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream"
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    console.log("✅ LinkedIn image uploaded successfully");

    return assetUrn;
  } catch (err) {
    console.error("❌ LinkedIn image upload error:", err.response?.data || err.message);
    throw err;
  }
}

export async function postToLinkedInHelper({ userId, text, imageUrl }) {
  const user = await User.findById(userId);

  if (!user?.linkedin?.accessToken || !user.linkedin.userId) {
    throw new Error("LinkedIn not connected for this user");
  }

  const accessToken = decrypt(user.linkedin.accessToken);
  const memberUrn = `urn:li:person:${user.linkedin.userId}`;

  // ✅ Upload image if provided
  let media = null;
  if (imageUrl) {
    try {
      const assetUrn = await uploadImageToLinkedIn(imageUrl, accessToken, memberUrn);
      media = [
        {
          status: "READY",
          description: {
            text: text || ""
          },
          media: assetUrn,
          title: {
            text: "Image"
          }
        }
      ];
    } catch (uploadErr) {
      console.error("Failed to upload image, posting text only:", uploadErr.message);
      // Continue without image if upload fails
    }
  }

  // ✅ Build payload with or without media
  const payload = {
    author: memberUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: text || "Check out my post!" },
        shareMediaCategory: media ? "IMAGE" : "NONE",
        ...(media && { media })
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  console.log("📤 LinkedIn payload:", JSON.stringify(payload, null, 2));

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

  return { id: postRes.data.id };
}
