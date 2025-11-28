import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const KEY = process.env.ENCRYPTION_KEY || "01234567890123456789012345678901"; // 32 bytes

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(KEY.slice(0,32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(enc) {
  const [ivHex, dataHex] = enc.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(KEY.slice(0,32)), iv);
  let dec = decipher.update(encryptedText);
  dec = Buffer.concat([dec, decipher.final()]);
  return dec.toString();
}
