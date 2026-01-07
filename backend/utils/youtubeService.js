// utils/youtubeService.js
import axios from "axios";
import fs from "fs";
import path from "path";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3";

// Upload video to YouTube
export async function uploadVideoToYouTube({
  accessToken,
  videoUrl,
  title,
  description,
  tags = [],
  privacy = "public",
  category = "22"
}) {
  try {
    console.log(`🎬 Starting YouTube video upload...`);
    console.log(`📝 Title: ${title}`);
    console.log(`🔗 Video URL: ${videoUrl}`);

    // Step 1: Download video file from Cloudinary
    console.log(`📥 Downloading video from: ${videoUrl}`);
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoResponse = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 120000 // 2 minutes for download
    });
    
    const buffer = Buffer.from(videoResponse.data);
    const tempPath = path.join(tempDir, `youtube_${Date.now()}.mp4`);
    fs.writeFileSync(tempPath, buffer);
    console.log(`💾 Video saved to: ${tempPath}`);
    console.log(`📊 File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Step 2: Prepare metadata
    const metadata = {
      snippet: {
        title: title || "Untitled Video",
        description: description || "",
        tags: Array.isArray(tags) ? tags : [],
        categoryId: category
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false
      }
    };

    // Step 3: Initialize resumable upload
    console.log(`📤 Initializing YouTube upload...`);
    const initResponse = await axios.post(
      `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
      metadata,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/*"
        }
      }
    );

    const uploadUrl = initResponse.headers.location;
    if (!uploadUrl) {
      throw new Error("Failed to get upload URL from YouTube");
    }
    console.log(`✅ Got upload URL`);

    // Step 4: Upload video file
    console.log(`⬆️ Uploading video file to YouTube...`);
    const fileStats = fs.statSync(tempPath);
    const fileStream = fs.createReadStream(tempPath);

    const uploadResponse = await axios.put(uploadUrl, fileStream, {
      headers: {
        "Content-Type": "video/*",
        "Content-Length": fileStats.size
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 600000, // 10 minutes for upload
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / fileStats.size);
        console.log(`📊 Upload progress: ${percentCompleted}%`);
      }
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);
    console.log(`🗑️ Cleaned up temp file`);

    const videoId = uploadResponse.data.id;
    console.log(`✅ YouTube video uploaded successfully: ${videoId}`);

    return {
      success: true,
      videoId: videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: title
    };

  } catch (error) {
    console.error("❌ YouTube upload error:", error.response?.data || error.message);
    
    // Clean up temp file on error
    try {
      const tempDir = path.join(process.cwd(), "temp");
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir).filter(f => f.startsWith("youtube_"));
        files.forEach(f => {
          const filePath = path.join(tempDir, f);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
    } catch (cleanupErr) {
      console.error("Error cleaning up temp files:", cleanupErr);
    }

    throw new Error(
      error.response?.data?.error?.message ||
      error.message ||
      "Failed to upload video to YouTube"
    );
  }
}

// Refresh YouTube access token
export async function refreshYouTubeToken(refreshToken) {
  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      grant_type: "refresh_token"
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    console.error("YouTube token refresh error:", error.response?.data || error);
    throw new Error("Failed to refresh YouTube token");
  }
}
