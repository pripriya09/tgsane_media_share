import User from "../models/User.js";
import UserToken from "../models/UserToken.js";
import PageToken from "../models/PageToken.js";
import bcrypt from "bcrypt";
import { signJwt } from "../utils/auth.js";
import axios from "axios";
import { exchangeForLongLived, getPagesForUser } from "../utils/tokenService.js";
import { encrypt } from "../utils/cryptoStore.js";
import Post from "../models/Post.js";  // ← ADD THIS LINE
// Existing admin login — return user._id consistently
export async function adminLogin(req, res) {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });
    const token = signJwt({ userId: user._id, username: user.username, role: user.role }, "7d");
    return res.json({ token, user: { _id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createUser(req, res) {
  try {
    const { name, username, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = new User({ name, username, passwordHash: hash, role: role || "user" });
    await user.save();
    return res.json({ success: true, userId: user._id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// UPDATED: Facebook login - ONLY for admin-approved users
export async function loginWithFacebook(req, res) {
  try {
    const { userAccessToken } = req.body;
    if (!userAccessToken) return res.status(400).json({ error: "userAccessToken required" });

    // 1) Exchange short-lived → long-lived user token
    const longTok = await exchangeForLongLived(userAccessToken);
    const longUserToken = longTok.access_token;
    const expiresIn = longTok.expires_in;

    console.log("Token exchange result:", { 
      hasToken: !!longUserToken, 
      expiresIn 
    });

    // 2) Validate token & fetch basic profile
    const fbResp = await axios.get("https://graph.facebook.com/v24.0/me", {
      params: { access_token: longUserToken, fields: "id,name,email" },
    });
    const fbData = fbResp.data;
    if (!fbData || !fbData.id) return res.status(400).json({ error: "Invalid Facebook token" });

    const facebookId = fbData.id;

    // 3) CRITICAL SECURITY FIX: Check if user already exists in DB
    //    Only admin-approved users can login via Facebook
    let user = await User.findOne({ facebookId });

    if (!user) {
      // Try to find by username pattern (if admin created them manually)
      const desiredUsername = `fb_${facebookId}`;
      user = await User.findOne({ username: desiredUsername });
      
      if (!user) {
        // ❌ User not in DB - reject
        console.log(`❌ FB login attempt for unapproved user: ${facebookId}`);
        return res.status(403).json({
          error: "❌ Account not found. Please ask your administrator to create an account for you first.",
          fbId: facebookId,
          suggestion: "Contact your admin and provide them this Facebook ID"
        });
      }
      // User found by username, update facebookId
      user.facebookId = facebookId;
    }

    // 4) Update user info from Facebook (only if empty)
    const name = fbData.name || user.name || `fb_${facebookId}`;
    const email = fbData.email || user.email || null;

    if (!user.name && fbData.name) user.name = fbData.name;
    if (!user.email && fbData.email) user.email = fbData.email;

    console.log(`✅ FB login approved for user: ${user.username}`);

    // 5) Save UserToken (encrypted long-lived token)
    const now = new Date();
    const expiresInSec = expiresIn && !isNaN(expiresIn) ? expiresIn : (60 * 24 * 60 * 60);
    const expiresAt = new Date(now.getTime() + expiresInSec * 1000);

    await UserToken.findOneAndUpdate(
      { userId: user._id },
      {
        longUserToken: encrypt(longUserToken),
        tokenObtainedAt: now,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    console.log("✅ Saved UserToken for user:", user._id, "Expires:", expiresAt);

    // 6) Get pages for this user and save PageToken + User.pages
    const pages = await getPagesForUser(longUserToken);
    const userPages = [];

    for (const p of pages || []) {
      const instagramBusinessId = p.instagram_business_account?.id || null;

      await PageToken.updateOne(
        { userId: user._id, pageId: p.id },
        {
          $set: {
            pageId: p.id,
            pageName: p.name,
            pageAccessToken: encrypt(p.access_token || ""),
            instagramBusinessId,
            obtainedAt: new Date(),
          },
        },
        { upsert: true }
      );

      userPages.push({
        pageId: p.id,
        pageName: p.name,
        pageAccessToken: p.access_token,
        instagramBusinessId,
      });
    }

    if (userPages.length) {
      user.pages = userPages;
      await user.save();
      console.log(`✅ Saved ${userPages.length} pages for user:`, user._id);
    }

    // 7) Sign JWT and return
    const token = signJwt(
      { userId: user._id, username: user.username, role: user.role },
      "7d"
    );

    return res.json({
      token,
      user: { _id: user._id, username: user.username, role: user.role },
    });

  } catch (err) {
    console.error("loginWithFacebook error:", err.response?.data || err.message || err);
    const msg = err.response?.data || err.message || "Facebook login error";
    return res.status(500).json({ error: msg });
  }
}

export async function adminRegister(req, res) {
  try {
    const { name, username, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = new User({ name, username, passwordHash: hash, role: role || "admin" });
    await user.save();
    return res.json({ success: true, id: user._id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Get all users (admin only)
// export async function getAllUsers(req, res) {
//   try {
//     if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     const users = await User.find()
//       .select("-passwordHash")
//       .sort({ createdAt: -1 });

//     return res.json({ users });
//   } catch (err) {
//     console.error("getAllUsers error:", err);
//     return res.status(500).json({ error: err.message });
//   }
// }

// Get user activity/stats
export async function getUserStats(req, res) {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const Post = (await import("../models/Post.js")).default;
    
    // Get all users with their post counts
    const users = await User.find().select("-passwordHash");
    const userStats = await Promise.all(
      users.map(async (user) => {
        const postCount = await Post.countDocuments({ userId: user._id });
        const lastPost = await Post.findOne({ userId: user._id })
          .sort({ postedAt: -1 })
          .select("postedAt");

        return {
          _id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          facebookId: user.facebookId,
          pagesCount: user.pages?.length || 0,
          postsCount: postCount,
          lastPostAt: lastPost?.postedAt || null,
          createdAt: user.createdAt
        };
      })
    );

    return res.json({ users: userStats });
  } catch (err) {
    console.error("getUserStats error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// Delete user (admin only)
export async function deleteUser(req, res) {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { userId } = req.params;

    // Don't allow deleting yourself
    if (String(userId) === String(req.user.userId)) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    await User.findByIdAndDelete(userId);
    
    // Also delete user's tokens
    const UserTokenModel = (await import("../models/UserToken.js")).default;
    const PageTokenModel = (await import("../models/PageToken.js")).default;
    await UserTokenModel.deleteMany({ userId });
    await PageTokenModel.deleteMany({ userId });

    return res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ error: err.message });
  }
}


// Update user (admin only)
export async function updateUser(req, res) {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { userId } = req.params;
    const { name, username, password, role } = req.body;

    // Don't allow changing your own role
    if (String(userId) === String(req.user.userId) && role && role !== req.user.role) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    const updateData = { name, username, role };

    // If password provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      updateData.passwordHash = hash;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ success: true, user: { _id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ error: err.message });
  }
}






// Get all users with stats
export async function getAllUsers(req, res) {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    // Get post counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const postsCount = await Post.countDocuments({ userId: user._id });
        const lastPost = await Post.findOne({ userId: user._id })
          .sort({ postedAt: -1 })
          .select("postedAt");

        return {
          ...user.toObject(),
          postsCount,
          lastPostAt: lastPost?.postedAt || null,
          pagesCount: user.pages?.length || 0
        };
      })
    );

    return res.json({ users: usersWithStats });
  } catch (err) {
    console.error("getAllUsers error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// Get all posts (admin only)
export async function getAllPosts(req, res) {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const posts = await Post.find()
      .populate("userId", "username name")
      .sort({ postedAt: -1 });

    return res.json({ posts });
  } catch (err) {
    console.error("getAllPosts error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// Get admin stats
export async function getAdminStats(req, res) {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalPosts,
      adminUsers,
      fbConnected,
      igConnected,
      postsToday,
      postsThisWeek
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 
        _id: { $in: await Post.distinct("userId", { postedAt: { $gte: weekAgo } }) }
      }),
      Post.countDocuments(),
      User.countDocuments({ role: { $in: ["admin", "superAdmin"] } }),
      User.countDocuments({ facebookId: { $exists: true, $ne: null } }),
      User.countDocuments({ "pages.instagramBusinessId": { $exists: true } }),
      Post.countDocuments({ postedAt: { $gte: today } }),
      Post.countDocuments({ postedAt: { $gte: weekAgo } })
    ]);

    return res.json({
      totalUsers,
      activeUsers,
      totalPosts,
      adminUsers,
      fbConnected,
      igConnected,
      postsToday,
      postsThisWeek
    });
  } catch (err) {
    console.error("getAdminStats error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// Delete post (admin only)
export async function deletePost(req, res) {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { postId } = req.params;
    await Post.findByIdAndDelete(postId);

    return res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    console.error("deletePost error:", err);
    return res.status(500).json({ error: err.message });
  }
}
