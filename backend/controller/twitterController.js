// controllers/twitterController.js
import { TwitterApi } from 'twitter-api-v2';
import User from '../models/User.js';
import Post from '../models/Post.js';
import fs from 'fs';

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
    const userId = req.user.userId;
    const twitterClient = getAppClient();

    // Generate OAuth 1.0a authorization link
    const authLink = await twitterClient.generateAuthLink(
      process.env.TWITTER_CALLBACK_URL || 'http://localhost:5174/auth/twitter/callback',
      { linkMode: 'authorize' }
    );

    // Save oauth_token_secret temporarily
    await User.findByIdAndUpdate(userId, {
      twitterOauthTokenSecret: authLink.oauth_token_secret
    });

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
    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user || !user.twitterOauthTokenSecret) {
      return res.status(400).json({
        success: false,
        message: 'OAuth session not found. Please try again.'
      });
    }

    // Create client with temporary tokens
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_KEY_SECRET,
      accessToken: oauth_token,
      accessSecret: user.twitterOauthTokenSecret,
    });

    // Exchange for permanent access tokens
    const { client: loggedClient, accessToken, accessSecret } = 
      await client.login(oauth_verifier);

    // Get Twitter user info
    const twitterUser = await loggedClient.v2.me({
      'user.fields': ['username', 'name', 'profile_image_url']
    });

    // Update user with Twitter connection (matches your schema) ✅
    user.twitterConnected = true;
    user.twitterId = twitterUser.data.id;
    user.twitterAccessToken = accessToken;
    user.twitterAccessSecret = accessSecret;
    user.twitterUsername = twitterUser.data.username;
    user.twitterName = twitterUser.data.name;
    user.twitterOauthTokenSecret = undefined; // Clear temporary secret
    await user.save();

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
    const userId = req.user.userId;

    await User.findByIdAndUpdate(userId, {
      twitterConnected: false,
      twitterId: undefined,
      twitterAccessToken: undefined,
      twitterAccessSecret: undefined,
      twitterUsername: undefined,
      twitterName: undefined,
      twitterOauthTokenSecret: undefined
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
    const userId = req.user.userId;
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

// Post to Twitter (matches your Post schema) ✅
export const postToTwitter = async (req, res) => {
  try {
    const { caption, title } = req.body; // Use caption instead of text
    const userId = req.user.userId;
    const mediaFile = req.file;

    const user = await User.findById(userId);

    if (!user.twitterConnected) {
      return res.status(400).json({
        success: false,
        message: 'Twitter account not connected'
      });
    }

    // Create user's Twitter client
    const client = getUserClient(user);

    const tweetText = caption || title || 'Posted via Social Media Manager';
    let tweetData = { text: tweetText };

    // Upload media if provided
    let mediaUrl = null;
    if (mediaFile) {
      try {
        const mediaId = await client.v1.uploadMedia(mediaFile.path);
        tweetData.media = { media_ids: [mediaId] };
        mediaUrl = mediaFile.filename; // Store filename
      } catch (uploadError) {
        console.error('Twitter Media Upload Error:', uploadError);
      } finally {
        // Clean up uploaded file
        if (fs.existsSync(mediaFile.path)) {
          fs.unlinkSync(mediaFile.path);
        }
      }
    }

    // Post tweet
    const tweet = await client.v2.tweet(tweetData);

    // Save to database (matches your Post schema) ✅
    // const post = new Post({
    //   userId: userId,
    //   platform: 'twitter',
    //   type: mediaFile ? 'image' : 'tweet', // Set type based on media
    //   caption: tweetText,
    //   title: title || null,
    //   image: mediaUrl,
    //   tweetId: tweet.data.id, // Twitter-specific ID
    //   status: 'posted',
    //   postedAt: new Date()
    // });

    const post = new Post({
        userId: userId,
        title: caption.substring(0, 100),
        platform: ['twitter'], // ✅ Array
        type: mediaFile ? (mediaFile.mimetype.startsWith('video') ? 'video' : 'image') : 'text',
        image: mediaFile && !mediaFile.mimetype.startsWith('video') ? mediaFile.path : null,
        videoUrl: mediaFile && mediaFile.mimetype.startsWith('video') ? mediaFile.path : null,
        tweetId: tweet.data.id,
        status: 'posted',
        postedAt: new Date(),
      });
      

    await post.save();

    res.json({
      success: true,
      message: 'Posted to Twitter successfully',
      data: {
        tweetId: tweet.data.id,
        text: tweet.data.text,
        url: `https://twitter.com/${user.twitterUsername}/status/${tweet.data.id}`,
        postDbId: post._id
      }
    });

  } catch (error) {
    console.error('Twitter Post Error:', error);

    // Clean up file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.data?.detail || 'Failed to post to Twitter',
      error: error.message
    });
  }
};

// Delete tweet
export const deleteTwitterPost = async (req, res) => {
  try {
    const { tweetId } = req.params;
    const userId = req.user.userId;

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
      { userId, tweetId: tweetId, platform: 'twitter' },
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

// Get user's Twitter posts
export const getTwitterPosts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const posts = await Post.find({
      userId,
      platform: 'twitter',
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
