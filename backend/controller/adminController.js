import User from "../models/User.js";
import bcrypt from "bcrypt";
import { signJwt } from "../utils/auth.js";
import axios from "axios";

// existing admin login — return user._id consistently
export async function adminLogin(req, res) {
    try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });
    const token = signJwt({ userId: user._id, username: user.username, role: user.role }, "7d");
    // return _id (not id) to match frontend expectations
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

    // Validate token & fetch basic profile
    const fbResp = await axios.get("https://graph.facebook.com/v24.0/me", {
      params: { access_token: userAccessToken, fields: "id,name,email" },
    });
    const fbData = fbResp.data;
    if (!fbData || !fbData.id) return res.status(400).json({ error: "Invalid Facebook token" });

    const facebookId = fbData.id;
    const name = fbData.name || `fb_${facebookId}`;
    const email = fbData.email || null;
    const desiredUsername = `fb_${facebookId}`;

    // 1) try find by facebookId
    let user = await User.findOne({ facebookId });

    // 2) if not found, try find by username (old-style records)
    if (!user) {
      user = await User.findOne({ username: desiredUsername });
      if (user) {
        // attach facebookId to the existing user account
        user.facebookId = facebookId;
        if (!user.name && name) user.name = name;
        if (!user.email && email) user.email = email;
        await user.save();
      }
    }

    // 3) if still not found, create a new user ensuring username uniqueness
    if (!user) {
      let uname = desiredUsername;
      let attempt = 0;
      while (await User.findOne({ username: uname })) {
        attempt += 1;
        // append small random string to avoid collision
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
        // handle rare race condition duplicate key
        if (err.code === 11000) {
          // find the existing user and attach facebookId
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

    // 4) sign JWT and return
    const token = signJwt({ userId: user._id, username: user.username, role: user.role }, "7d");
    return res.json({ token, user: { _id: user._id, username: user.username, role: user.role } });
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