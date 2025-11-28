// userRoute.js
import express from "express";
import { connectFacebook, getConnectedPages, postToChannels } from "../controller/userController.js";
import { ensureAuth } from "../utils/auth.js";

const router = express.Router();

router.post("/connect/facebook", ensureAuth(), connectFacebook);
router.get("/pages", ensureAuth(), getConnectedPages);  // ← EXACTLY THIS
router.post("/post", ensureAuth(), postToChannels);

export default router;