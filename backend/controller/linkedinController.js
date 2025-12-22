// backend/controller/linkedinController.js
import axios from "axios";
import User from "../models/User.js";
import crypto from "crypto";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_URL = "https://api.linkedin.com/v2";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-cbc";

// ==================== ENCRYPTION FUNCTIONS ====================
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

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

// ==================== AUTH FLOW ====================

// ✅ Step 1: Generate LinkedIn authorization URL
export const initiateLinkedInAuth = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    
    const scopes = [
      "openid",
      "profile",
      "email",
      "w_member_social"
    ];

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      scope: scopes.join(" "),
      state: `${userId}_${state}` // Encode userId in state
    });

    const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;
    
    console.log('✅ LinkedIn auth URL generated for user:', userId);
    
    return res.json({ authUrl });
  } catch (err) {
    console.error("LinkedIn auth init error:", err);
    return res.status(500).json({ error: "Failed to start LinkedIn auth" });
  }
};

// ✅ Step 2: Exchange authorization code for access token
export const exchangeLinkedInCode = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ 
        success: false,
        error: "Missing code or state" 
      });
    }

    // Extract userId from state
    const userId = state.split('_')[0];

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid state parameter" 
      });
    }

    console.log('🔄 Exchanging LinkedIn code for user:', userId);

    // Exchange authorization code for access token
    const tokenRes = await axios.post(
      LINKEDIN_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    const accessToken = tokenRes.data.access_token;
    const expiresIn = tokenRes.data.expires_in || 5184000; // 60 days default

    // Get LinkedIn user profile
    const meRes = await axios.get(`${LINKEDIN_API_URL}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const profile = meRes.data;
    
    // Encrypt access token before storing
    const encrypted = encrypt(accessToken);

    // Save to database
    await User.findByIdAndUpdate(
      userId,
      {
        linkedin: {
          accessToken: encrypted,
          userId: profile.sub,
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          connected: true,
          tokenExpiry: new Date(Date.now() + expiresIn * 1000)
        }
      },
      { new: true }
    );

    console.log("✅ LinkedIn connected for user:", userId, "Name:", profile.name);

    return res.json({
      success: true,
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
      userId: profile.sub
    });

  } catch (err) {
    console.error("LinkedIn token exchange error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      error: err.response?.data?.error_description || 
             err.response?.data?.error || 
             "Failed to connect LinkedIn"
    });
  }
};

// ==================== STATUS & DISCONNECT ====================

// Get LinkedIn connection status
export const getLinkedInStatus = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select("linkedin");
    
    if (!user || !user.linkedin || !user.linkedin.connected) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      name: user.linkedin.name,
      email: user.linkedin.email,
      picture: user.linkedin.picture,
      userId: user.linkedin.userId,
      tokenExpiry: user.linkedin.tokenExpiry
    });
  } catch (err) {
    console.error("Get LinkedIn status error:", err);
    return res.status(500).json({ 
      connected: false,
      error: "Failed to get LinkedIn status" 
    });
  }
};

// Disconnect LinkedIn account
export const disconnectLinkedIn = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    await User.findByIdAndUpdate(userId, {
      $unset: { linkedin: "" }
    });
    
    console.log("✅ LinkedIn disconnected for user:", userId);
    
    return res.json({ success: true });
  } catch (err) {
    console.error("Disconnect LinkedIn error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to disconnect LinkedIn" 
    });
  }
};

// ==================== POSTING TO LINKEDIN ====================



// // Legacy route for direct posting (optional)
// export const postToLinkedIn = async (req, res) => {
//   try {
//     const { text, imageUrl } = req.body;
//     const userId = req.user.userId || req.user._id;

//     const result = await postToLinkedInHelper({ userId, text, imageUrl });

//     return res.json({
//       success: true,
//       linkedinPostId: result.id
//     });
//   } catch (err) {
//     console.error("LinkedIn post error:", err);
//     return res.status(500).json({
//       success: false,
//       error: err.message || "Failed to post to LinkedIn"
//     });
//   }
// };
