import User from "../models/User.js";
import UserToken from "../models/UserToken.js";
import PageToken from "../models/PageToken.js";
import bcrypt from "bcrypt";
import { signJwt } from "../utils/auth.js";
import axios from "axios";
import { exchangeForLongLived, getPagesForUser } from "../utils/tokenService.js";
import { encrypt } from "../utils/cryptoStore.js";

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

export async function loginWithFacebook(req, res) {
  try {
    const { userAccessToken } = req.body;
    if (!userAccessToken) return res.status(400).json({ error: "userAccessToken required" });

    // 1) Exchange short-lived → long-lived user token
    const longTok = await exchangeForLongLived(userAccessToken);
    const longUserToken = longTok.access_token;
    const expiresIn = longTok.expires_in; // might be undefined

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
    const name = fbData.name || `fb_${facebookId}`;
    const email = fbData.email || null;
    const desiredUsername = `fb_${facebookId}`;

    // 3) Find or create User
    let user = await User.findOne({ facebookId });
    if (!user) {
      user = await User.findOne({ username: desiredUsername });
      if (user) {
        user.facebookId = facebookId;
        if (!user.name && name) user.name = name;
        if (!user.email && email) user.email = email;
        await user.save();
      }
    }

    if (!user) {
      let uname = desiredUsername;
      let attempt = 0;
      while (await User.findOne({ username: uname })) {
        attempt += 1;
        const suffix = Math.random().toString(36).slice(2, 6);
        uname = `${desiredUsername}_${suffix}`;
        if (attempt > 5) break;
      }

      user = new User({
        name,
        username: uname,
        email,
        facebookId,
        role: "user",
      });

      try {
        await user.save();
      } catch (err) {
        if (err.code === 11000) {
          const existing = await User.findOne({ username: user.username });
          if (existing) {
            existing.facebookId = facebookId;
            if (!existing.name && name) existing.name = name;
            if (!existing.email && email) existing.email = email;
            await existing.save();
            user = existing;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    // 4) Save UserToken (encrypted long-lived token) - FIXED
    const now = new Date();
    // Default to 60 days if expiresIn is missing or invalid
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

    // 5) Get pages for this user and save PageToken + User.pages
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

    // 6) Sign your app JWT and return
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
