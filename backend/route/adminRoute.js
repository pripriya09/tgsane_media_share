import express from "express";
import { loginWithFacebook,adminRegister, adminLogin, createUser } from "../controller/adminController.js";
import { ensureAuth } from "../utils/auth.js";

const router = express.Router();
router.post("/register", adminRegister);
// then add:
router.post("/login-with-facebook", loginWithFacebook);
router.post("/login", adminLogin);
router.post("/create-user", ensureAuth("admin"), createUser);

export default router;
