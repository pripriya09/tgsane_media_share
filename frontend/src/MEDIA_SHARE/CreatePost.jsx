import React, { useEffect, useState } from "react";
import api from "./api"; // adjust path if your api file lives elsewhere

function CreatePost() {
  const [contentData, setContentData] = useState([]);
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Helper to build full image URLs if backend returns relative paths
  const buildImageUrl = (img) => {
    if (!img) return "";
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    // If VITE_API_URL points to your backend, use it as prefix; else return as-is
    const base = import.meta.env.VITE_API_URL || "";
    return base ? `${base.replace(/\/$/, "")}/${img.replace(/^\/+/, "")}` : img;
  };

  useEffect(() => {
    fetchContent();
    loadPagesForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// try to initialize pages from localStorage if empty (race condition fix)
useEffect(() => {
  try {
    const stored = JSON.parse(localStorage.getItem("ms_pages") || "null");
    if (Array.isArray(stored) && stored.length) {
      console.debug("Initializing pages from localStorage ms_pages:", stored);
      setPages(stored);
      const firstId = stored[0].pageId || stored[0].id;
      if (firstId) setSelectedPage(firstId);
      return;
    }
  } catch (err) {
    // ignore parse errors
  }
  // otherwise fallback to fetching from backend
  loadPagesForUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  useEffect(() => {
    function onPagesUpdated(e) {
      const pagesFromEvent = e?.detail?.pages;
      if (Array.isArray(pagesFromEvent) && pagesFromEvent.length) {
        console.debug("pagesUpdated event received, using event pages:", pagesFromEvent);
        setPages(pagesFromEvent);
        const firstId = pagesFromEvent[0].pageId || pagesFromEvent[0].id;
        setSelectedPage(firstId || "");
        return;
      }
      // fallback: reload from backend
      console.debug("pagesUpdated event but no pages in event; reloading from backend");
      loadPagesForUser();
    }
  
    window.addEventListener("pagesUpdated", onPagesUpdated);
    return () => window.removeEventListener("pagesUpdated", onPagesUpdated);
  }, []);
  
  // Improved loadPagesForUser
  async function loadPagesForUser() {
    try {
      setErrorMsg("");
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!user?._id) {
        console.warn("No logged in user");
        setPages([]);
        setSelectedPage("");
        return;
      }

      const res = await api.get("/user/pages");  // ← MUST BE THIS
    const pagesList = res.data?.pages || [];
    console.log("Loaded pages from /user/pages:", pagesList);
    
    setPages(pagesList);
    if (pagesList.length > 0) {
      setSelectedPage(pagesList[0].pageId);
    }
  } catch (err) {
    console.error("Failed to load pages:", err.response?.data || err);
    setErrorMsg("Failed to load pages. Reconnect Facebook.");
  }
  }


  async function fetchContent() {
    try {
      setErrorMsg("");
      const res = await api.get("/upload");
      const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setContentData(arr);
    } catch (err) {
      console.error("Error fetching content:", err);
      setErrorMsg(buildErrorMessage(err, "fetching content"));
      setContentData([]);
    }
  }

  // async function loadPagesForUser() {
  //   try {
  //     setErrorMsg("");
  //     const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
  //     if (!user || !user._id) {
  //       console.warn("No local ms_user found; skipping pages load.");
  //       setPages([]);
  //       return;
  //     }
  //     const res = await api.get(`/user/pages/${user._id}`);
  //     const pagesList = res.data?.pages || res.data || [];
  //     setPages(pagesList);
  //     if (pagesList.length) {
  //       // auto-select the first page (so UI doesn't require the select)
  //       const firstId = pagesList[0].pageId || pagesList[0].id || pagesList[0].pageId;
  //       setSelectedPage(firstId || "");
  //     } else {
  //       setSelectedPage("");
  //     }
  //   } catch (err) {
  //     console.warn("Could not load pages:", err);
  //     setErrorMsg(buildErrorMessage(err, "loading pages"));
  //     setPages([]);
  //   }
  // }

  // Utility to show helpful error strings
  function buildErrorMessage(err, when = "") {
    if (!err) return when ? `Error ${when}` : "Unknown error";
    if (err.response) {
      return `${when ? when + ": " : ""}HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`;
    }
    return `${when ? when + ": " : ""}${err.message || String(err)}`;
  }
  async function handleUpload(e) {
    e.preventDefault();
    if (!imageFile) {
      alert("Please choose an image OR video to upload.");
      return;
    }
  
    setLoading(true);
    try {
      setErrorMsg("");
      const fd = new FormData();
      fd.append("title", title || "");
      // Use single generic field name "file" (server should accept upload.single("file") or upload.any())
      fd.append("file", imageFile);
  
      const isVideo = imageFile.type.startsWith("video/");
      fd.append("type", isVideo ? "video" : "image");
  
      const res = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      const uploaded = res.data;
      if (!uploaded) {
        await fetchContent();
        return;
      }
  
      const returnedUrl = uploaded.url || uploaded.image || uploaded.videoUrl || "";
      const item = {
        ...uploaded,
        title: uploaded.title || title,
        type: isVideo ? "video" : "image",
        image: isVideo ? null : returnedUrl,
        videoUrl: isVideo ? returnedUrl : null,
      };
  
      setContentData(prev => [item, ...prev]);
      setTitle("");
      setImageFile(null);
  
    } catch (err) {
      console.error("Upload failed:", err);
      setErrorMsg(buildErrorMessage(err, "uploading file"));
      alert("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }
  
  // Post to backend to publish to FB/IG
  async function handlePost(cont, options = { postToFB: true, postToIG: true, pageId: null }) {
    try {
      setErrorMsg("");
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!user || !user._id) {
        alert("You must be logged in to post. Please login.");
        return;
      }
  
      // const pageId = options.pageId || selectedPage || cont.pageId || (pages[0] && (pages[0].pageId || pages[0].id));
      // console.debug("Attempting post, resolved pageId:", pageId, "selectedPage:", selectedPage, "cont.pageId:", cont.pageId, "pages:", pages)


      const resolvedPageId = (() => {
        // 1) explicit passed option
        if (options.pageId) return options.pageId;
        // 2) selected state in UI
        if (selectedPage) return selectedPage;
        // 3) the content item may already include a pageId
        if (cont?.pageId) return cont.pageId;
        // 4) pages state (first)
        if (pages && pages.length) return pages[0].pageId || pages[0].id;
        // 5) fallback: try localStorage stored pages
        try {
          const stored = JSON.parse(localStorage.getItem("ms_pages") || "null");
          if (Array.isArray(stored) && stored.length) return stored[0].pageId || stored[0].id;
        } catch (err) {}
        return null;
      })();
      console.debug("Resolved pageId for posting:", resolvedPageId);
      if (!resolvedPageId) {
        alert("No Page available. Connect Facebook first (LogMedia).");
        return;
      }

      // use appropriate url validation depending on content type
if (cont.type === "video") {
  const url = cont.videoUrl || cont.image || "";
  if (!url || !url.startsWith("https://")) {
    alert("Video must be a public HTTPS URL (Cloudinary or CDN). Please upload or re-upload the video.");
    return;
  }
} else {
  const url = cont.image || "";
  if (!url || !url.startsWith("https://")) {
    alert("Image must be a public HTTPS URL (Cloudinary or CDN). Please upload or re-upload the image.");
    return;
  }
}

      const body = {
        userId: user._id,
        pageId: resolvedPageId,
        title: cont.title,
        type: cont.type || "image",                 // "image" or "video"
        image: cont.type === "image" ? cont.image : null,
        videoUrl: cont.type === "video" ? (cont.videoUrl || cont.image) : null,
        postToFB: !!options.postToFB,
        postToIG: !!options.postToIG,
      };
      
  
      console.debug("POST /user/post body:", body);
      const res = await api.post("/user/post", body);
      alert("Posted: " + (res.data?.message || JSON.stringify(res.data)));
    } catch (err) {
      console.error("Post failed:", err);
      setErrorMsg(buildErrorMessage(err, "posting"));
      alert("Post failed: " + (err.response?.data?.error || err.message));
    }
  }
  
  return (
    <div className="share-container" style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Create / Upload</h2>

      {errorMsg && (
        <div style={{ background: "#ffe6e6", color: "#900", padding: 8, marginBottom: 12, borderRadius: 6 }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <form onSubmit={handleUpload} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Enter your title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
    <input
  type="file"
  accept="image/*,video/*"
  onChange={(e) => setImageFile(e.target.files[0])}
/>

        <div style={{ marginTop: 8, marginBottom: 8 }}>
          {/* If you want to hide the select and always use the first available page, comment out the select element */}
          {pages.length > 1 ? (
            <>
              <label style={{ marginRight: 8 }}>Select Page:</label>
              <select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}>
                <option value="">-- choose page --</option>
                {pages.map((p, idx) => (
                  <option key={p.pageId || p.id || idx} value={p.pageId || p.id}>
                    {p.pageName || p.name || p.pageName || p.id}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div style={{ color: "#666", fontSize: 13 }}>
              {pages.length === 1
                ? `Posting will use page: ${pages[0].pageName || pages[0].name || pages[0].id}`
                : "No connected pages found. Connect Facebook (LogMedia) first."}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <div style={{ marginTop: 20 }}>
        <h3>Posts</h3>
        {contentData.length === 0 ? (
          <div style={{ color: "#666" }}>No uploaded posts yet.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {contentData.map((cont, idx) => (
              <div key={idx} style={{ border: "1px solid #ddd", padding: 8, width: 260, borderRadius: 6 }}>
                <div style={{ width: "100%", height: 150, overflow: "hidden", borderRadius: 6 }}>
  {cont.type === "video" ? (
    <video
      controls
      src={buildImageUrl(cont.videoUrl || cont.image)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      onError={(e) => { e.currentTarget.src = ""; }}
    />
  ) : (
    <img
      src={buildImageUrl(cont.image)}
      alt={cont.title || "image"}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      onError={(e) => { e.currentTarget.src = ""; }}
    />
  )}
</div>




                <div style={{ marginTop: 8, minHeight: 36 }}>{cont.title || "(no title)"}</div>

                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button onClick={() => handlePost(cont, { postToFB: true, postToIG: false })}>
                    Post to FB
                  </button>
                  <button onClick={() => handlePost(cont, { postToFB: false, postToIG: true })}>
                    Post to IG
                  </button>
                  <button onClick={() => handlePost(cont, { postToFB: true, postToIG: true })}>
                    Post FB+IG
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreatePost;
