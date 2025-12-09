
// adminRoute.js
import express from "express";
import { 
  loginWithFacebook, 
  adminRegister, 
  adminLogin, 
  createUser,
  getAllUsers,
  getUserStats,
  deleteUser,
  updateUser,
} from "../controller/adminController.js";
import { ensureAuth } from "../utils/auth.js";

const router = express.Router();

router.post("/register", adminRegister);
router.post("/login", adminLogin);
router.post("/login-with-facebook", loginWithFacebook);

// Admin-only routes
router.post("/create-user", ensureAuth("admin"), createUser);
router.get("/users", ensureAuth("admin"), getAllUsers);
router.get("/user-stats", ensureAuth("admin"), getUserStats);
router.delete("/users/:userId", ensureAuth("admin"), deleteUser);
router.put("/users/:userId", ensureAuth("admin"), updateUser);

export default router;







// // adminRoute.js
// import express from "express";
// import { 
//   loginWithFacebook, 
//   adminRegister, 
//   adminLogin, 
//   createUser,
//   getAllUsers,
//   getUserStats,
//   deleteUser,
//   updateUser,
//   getAllPosts,
//   getAdminStats,
//   deletePost,

// } from "../controller/adminController.js";
// import { ensureAuth } from "../utils/auth.js";

// const router = express.Router();

// router.post("/register", adminRegister);
// router.post("/login", adminLogin);
// router.post("/login-with-facebook", loginWithFacebook);

// // Admin-only routes
// router.post("/create-user", ensureAuth("admin"), createUser);
// router.get("/users", ensureAuth("admin"), getAllUsers);
// router.get("/all-posts", ensureAuth(), getAllPosts);
// router.get("/stats", ensureAuth(), getAdminStats);
// router.get("/user-stats", ensureAuth("admin"), getUserStats);
// router.delete("/users/:userId", ensureAuth("admin"), deleteUser);
// router.delete("/posts/:postId", ensureAuth(), deletePost);
// router.put("/users/:userId", ensureAuth("admin"), updateUser);

// export default router;



