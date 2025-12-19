// controllers/twitterController.js
import { TwitterApi } from 'twitter-api-v2';
import User from '../models/User.js';
import Post from '../models/Post.js';
import fs from 'fs';

// ✅ In-memory store for OAuth sessions (use Redis in production)
const oauthSessions = new Map();

// Initialize Twitter client with app credentials
const getAppClient = () => {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_KEY_SECRET,
  });
};

// Get user's Twitter client
const getUserClient = (user) => {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_KEY_SECRET,
    accessToken: user.twitterAccessToken,
    accessSecret: user.twitterAccessSecret,
  });
};

// Request Twitter OAuth token
export const requestTwitterAuth = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const twitterClient = getAppClient();

    // Generate OAuth 1.0a authorization link
    const authLink = await twitterClient.generateAuthLink(
      process.env.TWITTER_CALLBACK_URL || 'https://localhost:5174/auth/twitter/callback',
      { linkMode: 'authorize' }
    );

    // ✅ Store session data with oauth_token as key
    oauthSessions.set(authLink.oauth_token, {
      userId: userId,
      oauth_token_secret: authLink.oauth_token_secret,
      timestamp: Date.now()
    });

    // Clean up old sessions (older than 10 minutes)
    for (const [token, data] of oauthSessions.entries()) {
      if (Date.now() - data.timestamp > 10 * 60 * 1000) {
        oauthSessions.delete(token);
      }
    }

    console.log('✅ Twitter auth session created:', authLink.oauth_token);

    res.json({
      success: true,
      authUrl: authLink.url,
      oauth_token: authLink.oauth_token
    });

  } catch (error) {
    console.error('Twitter OAuth Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Twitter authentication',
      error: error.message
    });
  }
};

// Handle Twitter OAuth callback
export const handleTwitterCallback = async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.body;

    if (!oauth_token || !oauth_verifier) {
      return res.status(400).json({
        success: false,
        message: 'Missing OAuth parameters'
      });
    }

    // ✅ Retrieve session data using oauth_token
    const session = oauthSessions.get(oauth_token);

    if (!session) {
      console.error('❌ OAuth session not found:', oauth_token);
      return res.status(400).json({
        success: false,
        message: 'OAuth session expired or invalid. Please try connecting again.'
      });
    }

    const { userId, oauth_token_secret } = session;

    // Clean up - remove used session
    oauthSessions.delete(oauth_token);

    // Create client with temporary tokens
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_KEY_SECRET,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });

    // Exchange for permanent access tokens
    const { client: loggedClient, accessToken, accessSecret } = 
      await client.login(oauth_verifier);

    // Get Twitter user info
    const twitterUser = await loggedClient.v2.me({
      'user.fields': ['username', 'name', 'profile_image_url']
    });

    // Update user with Twitter connection
    await User.findByIdAndUpdate(userId, {
      twitterConnected: true,
      twitterId: twitterUser.data.id,
      twitterAccessToken: accessToken,
      twitterAccessSecret: accessSecret,
      twitterUsername: twitterUser.data.username,
      twitterName: twitterUser.data.name,
    });

    console.log('✅ Twitter connected for user:', userId, 'as @' + twitterUser.data.username);

    res.json({
      success: true,
      message: 'Twitter connected successfully',
      data: {
        username: twitterUser.data.username,
        name: twitterUser.data.name,
        id: twitterUser.data.id
      }
    });

  } catch (error) {
    console.error('Twitter OAuth Callback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Twitter account',
      error: error.message
    });
  }
};

// Disconnect Twitter account
export const disconnectTwitter = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    await User.findByIdAndUpdate(userId, {
      twitterConnected: false,
      twitterId: undefined,
      twitterAccessToken: undefined,
      twitterAccessSecret: undefined,
      twitterUsername: undefined,
      twitterName: undefined,
    });

    res.json({
      success: true,
      message: 'Twitter disconnected successfully'
    });

  } catch (error) {
    console.error('Twitter Disconnect Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Twitter',
      error: error.message
    });
  }
};

// Get Twitter connection status
export const getTwitterStatus = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('twitterConnected twitterUsername twitterName');

    res.json({
      success: true,
      connected: user.twitterConnected || false,
      username: user.twitterUsername || null,
      name: user.twitterName || null
    });

  } catch (error) {
    console.error('Twitter Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Twitter status',
      error: error.message
    });
  }
};

// Delete tweet
export const deleteTwitterPost = async (req, res) => {
  try {
    const { tweetId } = req.params;
    const userId = req.user.userId || req.user._id;

    const user = await User.findById(userId);

    if (!user.twitterConnected) {
      return res.status(400).json({
        success: false,
        message: 'Twitter account not connected'
      });
    }

    const client = getUserClient(user);

    // Delete tweet from Twitter
    await client.v2.deleteTweet(tweetId);

    // Update database
    await Post.findOneAndUpdate(
      { 
        userId, 
        tweetId: tweetId, 
        platform: { $in: ['twitter'] }
      },
      { status: 'deleted' }
    );

    res.json({
      success: true,
      message: 'Tweet deleted successfully'
    });

  } catch (error) {
    console.error('Delete Tweet Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tweet',
      error: error.message
    });
  }
};

// Get Twitter posts
export const getTwitterPosts = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const posts = await Post.find({
      userId,
      platform: { $in: ['twitter'] },
      status: 'posted'
    }).sort({ postedAt: -1 });

    res.json({
      success: true,
      count: posts.length,
      data: posts
    });

  } catch (error) {
    console.error('Get Twitter Posts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Twitter posts',
      error: error.message
    });
  }
};
