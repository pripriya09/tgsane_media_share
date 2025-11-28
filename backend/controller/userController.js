// userController.js
import User from "../models/User.js";
import fetch from "node-fetch";

const FB_API_VERSION = "v24.0";

export async function connectFacebook(req, res) {
  try {
    const { userAccessToken, userId } = req.body;
    if (!userAccessToken || !userId) return res.status(400).json({ error: "Missing userAccessToken or userId" });

    const pagesUrl = `https://graph.facebook.com/${FB_API_VERSION}/me/accounts?access_token=${userAccessToken}`;
    const pagesResp = await fetch(pagesUrl);
    const pagesJson = await pagesResp.json();
    if (pagesJson.error) {
      console.error("FB /me/accounts error", pagesJson.error);
      return res.status(500).json({ error: pagesJson.error });
    }

    const pages = pagesJson.data || [];
    const enrichedPages = [];

    for (const p of pages) {
      const pageId = p.id;
      const pageName = p.name || "";
      const pageAccessToken = p.access_token;
      let instagramBusinessId = null;

      if (pageAccessToken) {
        try {
          const igUrl = `https://graph.facebook.com/${FB_API_VERSION}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`;
          const igResp = await fetch(igUrl);
          const igJson = await igResp.json();
          if (!igJson.error && igJson.instagram_business_account?.id) {
            instagramBusinessId = igJson.instagram_business_account.id;
          }
        } catch (err) {
          console.warn("IG check failed for page", pageId, err.message);
        }
      }

      enrichedPages.push({
        pageId,
        pageName,
        pageAccessToken,
        instagramBusinessId,
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.pages = enrichedPages;  // This is where we save
    await user.save();
    console.log("Saved pages to user:", user.pages.map(p => ({ 
      pageId: p.pageId, 
      type: typeof p.pageId 
    })));
    // Return safe version (no token exposed)
    const safePages = enrichedPages.map(p => ({
      pageId: p.pageId,
      pageName: p.pageName,
      instagramBusinessId: p.instagramBusinessId,
    }));

    return res.json({ success: true, pages: safePages });
  } catch (err) {
    console.error("connectFacebook error", err);
    return res.status(500).json({ error: err.message });
  }
}

// FINAL WORKING VERSION — getConnectedPages
export async function getConnectedPages(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.log("No userId from JWT");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId).select("pages");
    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    const safePages = (user.pages || []).map(p => ({
      pageId: p.pageId,
      pageName: p.pageName,
      instagramBusinessId: p.instagramBusinessId || null,
    }));

    console.log("Returning pages for user:", userId, safePages); // ← THIS WILL SHOW IN LOGS

    return res.json({ pages: safePages });
  } catch (err) {
    console.error("getConnectedPages error:", err);
    return res.status(500).json({ error: err.message });
  }
}
// postToChannels — unchanged, already correct
export async function postToChannels(req, res) {
  try {
    const { userId, pageId, title, image, postToFB = true, postToIG = true } = req.body;
    if (!userId || !pageId) return res.status(400).json({ error: "Missing userId or pageId" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

   // NEW — works whether pageId is string or number
const page = (user.pages || []).find(p => 
  String(p.pageId) === String(pageId) || p.id === pageId
);
if (!page) {
  console.error("Page not found! Available pageIds:", user.pages?.map(p => ({ id: p.pageId, type: typeof p.pageId })));
  return res.status(400).json({ error: "Page not connected for this user" });
}

    const results = { fb: null, ig: null };
    const { pageAccessToken, instagramBusinessId } = page;

    if (postToFB && pageAccessToken) {
      const fbUrl = `https://graph.facebook.com/${FB_API_VERSION}/${pageId}/photos`;
      const params = new URLSearchParams();
      params.append("url", image);
      params.append("caption", title || "");
      params.append("access_token", pageAccessToken);

      const fbResp = await fetch(fbUrl, { method: "POST", body: params });
      const fbJson = await fbResp.json();
      results.fb = fbJson.error ? { error: fbJson.error } : fbJson;
    }

    if (postToIG && instagramBusinessId && pageAccessToken) {
      const createUrl = `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media`;
      const createParams = new URLSearchParams();
      createParams.append("image_url", image);
      createParams.append("caption", title || "");
      createParams.append("access_token", pageAccessToken);

      const createResp = await fetch(createUrl, { method: "POST", body: createParams });
      const createJson = await createResp.json();

      if (!createJson.error) {
        const publishUrl = `https://graph.facebook.com/${FB_API_VERSION}/${instagramBusinessId}/media_publish`;
        const publishParams = new URLSearchParams();
        publishParams.append("creation_id", createJson.id);
        publishParams.append("access_token", pageAccessToken);

        const publishResp = await fetch(publishUrl, { method: "POST", body: publishParams });
        const publishJson = await publishResp.json();
        results.ig = publishJson.error ? { error: publishJson.error } : publishJson;
      } else {
        results.ig = { error: createJson.error };
      }
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error("postToChannels error", err);
    return res.status(500).json({ error: err.message });
  }
}