import express from "express";
import cors from "cors";
import mongoose from "mongoose";



import adminRoute from "./route/adminRoute.js";
import userRoute from "./route/userRoute.js";
import { startTokenRefreshCron } from "./utils/cronRefresh.js";
import { uploadLocalToCloudinary } from "./utils/cloudinaryHelper.js";
import { startPostScheduler } from "./utils/postScheduler.js";


import path from "path";
import fs from "fs";


import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import streamifier from "streamifier";
import dotenv from "dotenv";
dotenv.config();


// connect db
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=>console.log("MongoDB connected"))
  .catch(err=>console.error("MongoDB err", err));

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: 
  [process.env.FRONTEND_URL, "http://localhost:5173", 'http://localhost:5174',"http://localhost:8006",'https://fdacf6eb3103.ngrok-free.app',"https://localhost:5174"] 
,credentials: true
}));

// plug routers
app.use("/admin", adminRoute);
app.use("/user", userRoute);


const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// serve uploaded files (so frontend can access them)
app.use('/uploads', express.static(UPLOAD_DIR));
// serve uploads statically (so buildImageUrl works)
// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));




cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });





// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//   filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
// });
// const upload = multer({ storage });

app.get("/upload", (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).map(fname => ({ title: fname, image: `/uploads/${fname}` }));
    return res.json({ data: files });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


app.post("/upload", upload.array("file", 12), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadPromises = req.files.map(async (file) => {
      const isVideo = file.mimetype.startsWith("video/");
      const resource_type = isVideo ? "video" : "image";

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            resource_type, 
            folder: "fb_ig_uploads",
            timeout: 120000 // 2 min for videos
          },
          (err, r) => (err ? reject(err) : resolve(r))
        );
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });

      return {
        url: result.secure_url,
        resource_type: resource_type
      };
    });

    const uploaded = await Promise.all(uploadPromises);

    // If only one file, return single object (for backward compatibility)
    if (uploaded.length === 1) {
      return res.status(201).json(uploaded[0]);
    }

    // Multiple files → return array
    return res.status(201).json(uploaded);

  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});




// start cron if you want (uncomment in production)
startTokenRefreshCron();
startPostScheduler()
const port = process.env.PORT || 8006;
app.listen(port, ()=>console.log("Server listening", port));
