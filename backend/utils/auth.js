import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export function signJwt(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function ensureAuth(role = null) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No auth token" });
    const token = auth.split(" ")[1];
    const payload = verifyJwt(token);
    if (!payload) return res.status(401).json({ error: "Invalid token" });
    if (role && payload.role !== role && payload.role !== "superAdmin") {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    req.user = payload;
    next();
  };
}
