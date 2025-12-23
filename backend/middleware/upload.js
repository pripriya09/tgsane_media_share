// backend/middleware/upload.js
import multer from "multer";

// ✅ Single multer instance for entire app
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});
