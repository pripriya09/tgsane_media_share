import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import adminRoute from "./route/adminRoute.js";
import userRoute from "./route/userRoute.js";
import { startTokenRefreshCron } from "./utils/cronRefresh.js";
import { uploadLocalToCloudinary } from "./utils/cloudinaryHelper.js";

import multer from "multer";

import path from "path";
import fs from "fs";



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


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.get("/upload", (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).map(fname => ({ title: fname, image: `/uploads/${fname}` }));
    return res.json({ data: files });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded; field name must be 'image'" });
    const localPath = req.file.path;
    const secureUrl = await uploadLocalToCloudinary(localPath);
    fs.unlinkSync(localPath);
    return res.status(201).json({ title: req.body.title || "", image: secureUrl });
  } catch (err) {
    console.error("upload error", err);
    return res.status(500).json({ error: err.message });
  }
});




// start cron if you want (uncomment in production)
startTokenRefreshCron();

const port = process.env.PORT || 8006;
app.listen(port, ()=>console.log("Server listening", port));
