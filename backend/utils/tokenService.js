import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const APP_TOKEN = `${APP_ID}|${APP_SECRET}`;

  export const generateAppSecretProof = (accessToken) =>
  crypto.createHmac("sha256", APP_SECRET).update(accessToken).digest("hex");



// debug token
export async function debugToken(inputToken) {
  const resp = await axios.get("https://graph.facebook.com/debug_token", {
    params: { input_token: inputToken, access_token: APP_TOKEN },
  });
  return resp.data.data;
}

// exchange short -> long (or refresh long)
export async function exchangeForLongLived(fbToken) {
  const resp = await axios.get("https://graph.facebook.com/v24.0/oauth/access_token", {
    params: {
      grant_type: "fb_exchange_token",
      client_id: APP_ID,
      client_secret: APP_SECRET,
      fb_exchange_token: fbToken,
    },
  });
  return resp.data; // { access_token, expires_in }
}

// get pages for a user (requires user token)
export async function getPagesForUser(userToken) {
  const appsecret_proof = generateAppSecretProof(userToken);
  const resp = await axios.get("https://graph.facebook.com/v24.0/me/accounts", {
    params: { access_token: userToken, appsecret_proof },
  });
  return resp.data.data;
}
