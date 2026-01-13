// controller/youtubeController.js

import { google } from 'googleapis';
import User from '../models/User.js';
import fs from 'fs';

// ✅ Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI,
);

// ========================================
// 1. Initiate YouTube Authentication
// ========================================
export const initiateYouTubeAuth = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ From ensureAuth() middleware

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly'
      ],
      state: userId,
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
      prompt: 'consent'
    });

    console.log('🔗 Generated YouTube auth URL for user:', userId);

    res.json({ authUrl });

  } catch (error) {
    console.error('❌ Error initiating YouTube auth:', error);
    res.status(500).json({ error: 'Failed to initiate YouTube authentication' });
  }
};
// ========================================
// 2. Handle YouTube OAuth Callback
// ========================================  

export const youtubeCallback = async (req, res) => {
  console.log('🎯 YouTube callback API called');
  
  const { code, userId } = req.body;

  if (!code || !userId) {
    console.error('❌ Missing code or userId');
    return res.status(400).json({ 
      success: false, 
      error: 'Missing authorization code or user ID' 
    });
  }

  try {
    
    console.log('📡 Exchanging code for tokens...');
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('✅ Got access token');
    console.log('✅ Refresh token:', tokens.refresh_token ? 'Present' : 'Missing');

    // Get YouTube channel information
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    const channelResponse = await youtube.channels.list({
      part: 'snippet,contentDetails,statistics',
      mine: true
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      console.error('❌ No YouTube channel found');
      return res.status(400).json({ 
        success: false, 
        error: 'No YouTube channel found for this account' 
      });
    }

    const channel = channelResponse.data.items[0];
    const channelId = channel.id;
    const channelName = channel.snippet.title;
    const channelImage = channel.snippet.thumbnails?.default?.url || null;

    console.log('📺 Channel found:', channelName);
    console.log('📺 Channel ID:', channelId);

    // Find user and update YouTube credentials
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // ✅ Update user with YouTube credentials (matching your model)
    user.youtubeConnected = true;
    user.youtubeAccessToken = tokens.access_token;
    user.youtubeRefreshToken = tokens.refresh_token;
    user.youtubeTokenExpiry = new Date(tokens.expiry_date);
    user.youtubeId = channelId;
    user.youtubeChannelId = channelId;
    user.youtubeChannelName = channelName;
    user.youtubeChannelImage = channelImage;

    await user.save();

    console.log('✅ YouTube connected successfully for user:', user.username);

    res.json({ 
      success: true, 
      channelName,
      channelId,
      channelImage 
    });

  } catch (error) {
    console.error('❌ YouTube callback error:', error.message);
    console.error('Error details:', error.response?.data || error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ========================================
// 3. Get YouTube Connection Status
// ========================================
export const getYouTubeStatus = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ From ensureAuth() middleware

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        connected: false, 
        error: 'User not found' 
      });
    }

    if (!user.youtubeConnected) {
      return res.json({ 
        connected: false,
        channelId: null,
        channelName: null,
        channelImage: null
      });
    }

    res.json({
      connected: true,
      channelId: user.youtubeChannelId,
      channelName: user.youtubeChannelName,
      channelImage: user.youtubeChannelImage
    });

  } catch (error) {
    console.error('❌ Error getting YouTube status:', error);
    res.status(500).json({ 
      connected: false, 
      error: error.message 
    });
  }
};

// ========================================
// 4. Disconnect YouTube
// ========================================
export const disconnectYouTube = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ From ensureAuth() middleware

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Clear YouTube credentials
    user.youtubeConnected = false;
    user.youtubeAccessToken = null;
    user.youtubeRefreshToken = null;
    user.youtubeTokenExpiry = null;
    user.youtubeId = null;
    user.youtubeChannelId = null;
    user.youtubeChannelName = null;
    user.youtubeChannelImage = null;

    await user.save();

    console.log('✅ YouTube disconnected for user:', user.username);

    res.json({ 
      success: true, 
      message: 'YouTube disconnected successfully' 
    });

  } catch (error) {
    console.error('❌ Error disconnecting YouTube:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
// ========================================
// 5. Refresh YouTube Access Token (Helper)
// ========================================
async function refreshYouTubeToken(user) {
  try {
    if (!user.youtubeRefreshToken) {
      throw new Error('No refresh token available');
    }

    oauth2Client.setCredentials({
      refresh_token: user.youtubeRefreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // ✅ Update user's tokens (matching your model)
    user.youtubeAccessToken = credentials.access_token;
    user.youtubeTokenExpiry = new Date(credentials.expiry_date);
    
    await user.save();

    console.log('✅ YouTube token refreshed for user:', user.username);

    return credentials.access_token;
  } catch (error) {
    console.error('❌ Error refreshing YouTube token:', error);
    throw error;
  }
}

// ========================================
// 6. Upload Video to YouTube
// ========================================
export const uploadToYouTube = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, description, tags, privacyStatus } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ 
        success: false, 
        error: 'Video file is required' 
      });
    }

    if (!title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Video title is required' 
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.youtubeConnected) {
      return res.status(400).json({ 
        success: false, 
        error: 'YouTube not connected' 
      });
    }

    // Check if token needs refresh
    const now = new Date();
    if (user.youtubeTokenExpiry && user.youtubeTokenExpiry < now) {
      console.log('🔄 Token expired, refreshing...');
      await refreshYouTubeToken(user);
    }

    // Set credentials
    oauth2Client.setCredentials({
      access_token: user.youtubeAccessToken,
      refresh_token: user.youtubeRefreshToken
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Prepare video metadata
    const videoMetadata = {
      snippet: {
        title: title,
        description: description || '',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        categoryId: '22' // People & Blogs
      },
      status: {
        privacyStatus: privacyStatus || 'private'
      }
    };

    console.log('📤 Uploading video to YouTube...');
    console.log('Title:', title);
    console.log('Channel:', user.youtubeChannelName);
    console.log('File:', videoFile.originalname);

    // Upload video
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: videoMetadata,
      media: {
        body: fs.createReadStream(videoFile.path)
      }
    });

    // Delete temporary file
    fs.unlinkSync(videoFile.path);

    console.log('✅ Video uploaded successfully!');
    console.log('Video ID:', response.data.id);

    res.json({
      success: true,
      videoId: response.data.id,
      videoUrl: `https://www.youtube.com/watch?v=${response.data.id}`,
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Error uploading video:', error.message);
    console.error('Error details:', error.response?.data || error);
    
    // Clean up file if upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
