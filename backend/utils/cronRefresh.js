import cron from "node-cron";
import UserToken from "../models/UserToken.js";
import PageToken from "../models/PageToken.js";
import { debugToken, exchangeForLongLived, getPagesForUser } from "./tokenService.js";
import { encrypt } from "./cryptoStore.js";
import mongoose from "mongoose";

export function startTokenRefreshCron() {
  // run daily at 02:30
  cron.schedule("30 2 * * *", async () => {
    console.log("Token refresh cron running...");
    try {
      const all = await UserToken.find({});
      for (const t of all) {
        try {
          const info = await debugToken(t.longUserToken);
          if (!info.is_valid) {
            console.warn("token invalid for userToken id", t._id);
            continue;
          }
          const expiresAt = info.expires_at ? new Date(info.expires_at * 1000) : null;
          const daysLeft = expiresAt ? (expiresAt - Date.now()) / (1000*60*60*24) : null;
          if (daysLeft !== null && daysLeft < 5) {
            const newTok = await exchangeForLongLived(t.longUserToken);
            const newLong = newTok.access_token;
            t.longUserToken = encrypt(newLong);
            t.tokenObtainedAt = new Date();
            t.expiresAt = new Date(Date.now() + (newTok.expires_in*1000));
            await t.save();

            // refresh page tokens
            const pages = await getPagesForUser(newLong);
            for (const p of pages) {
              await PageToken.updateOne(
                { pageId: p.id },
                {
                  $set: {
                    pageId: p.id,
                    pageName: p.name,
                    pageAccessToken: encrypt(p.access_token || ""),
                    instagramBusinessId: p.instagram_business_account?.id || null,
                    obtainedAt: new Date(),
                  }
                },
                { upsert: true }
              );
            }
          }
        } catch (err) {
          console.error("refresh error", err.response?.data || err.message);
        }
      }
    } catch (err) {
      console.error("cron outer error", err);
    }
  });
}
