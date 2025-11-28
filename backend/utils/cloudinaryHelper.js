import cloudinary from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadLocalToCloudinary(localPath) {
  if (!localPath) throw new Error("localPath required");
  if (localPath.startsWith("http")) return localPath;
  const result = await cloudinary.v2.uploader.upload(localPath, { resource_type: "auto" });
  return result.secure_url;
}
