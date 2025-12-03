import React, { useEffect, useState } from "react";
import api from "./api";

function CreatePost() {
  const [activeTab, setActiveTab] = useState("single"); // "single" | "carousel"
  const [contentData, setContentData] = useState([]);
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState([]);
  const [singleFile, setSingleFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [postToFB, setPostToFB] = useState(true);
  const [postToIG, setPostToIG] = useState(true);

  const buildImageUrl = (img) => {
    if (!img) return "";
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    const base = import.meta.env.VITE_API_URL || "";
    return base ? `${base.replace(/\/$/, "")}/${img.replace(/^\/+/, "")}` : img;
  };

  useEffect(() => {
    fetchContent();
    loadPagesForUser();
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("ms_pages") || "null");
      if (Array.isArray(stored) && stored.length) {
        setPages(stored);
        const firstId = stored[0].pageId || stored[0].id;
        if (firstId) setSelectedPage(firstId);
        return;
      }
    } catch (err) {}
    loadPagesForUser();
  }, []);

  useEffect(() => {
    function onPagesUpdated(e) {
      const pagesFromEvent = e?.detail?.pages;
      if (Array.isArray(pagesFromEvent) && pagesFromEvent.length) {
        setPages(pagesFromEvent);
        const firstId = pagesFromEvent[0].pageId || pagesFromEvent[0].id;
        setSelectedPage(firstId || "");
        return;
      }
      loadPagesForUser();
    }
    window.addEventListener("pagesUpdated", onPagesUpdated);
    return () => window.removeEventListener("pagesUpdated", onPagesUpdated);
  }, []);

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

      const res = await api.get("/user/pages");
      const pagesList = res.data?.pages || [];
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
      setErrorMsg("Error fetching content: " + (err.response?.data?.error || err.message));
      setContentData([]);
    }
  }

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (activeTab === "carousel") {
      if (selected.length + files.length > 10) {
        alert("Maximum 10 items allowed in carousel");
        return;
      }
      setFiles(prev => [...prev, ...selected]);
    } else {
      setSingleFile(selected[0] || null);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ONLY UPLOAD - Don't post yet
  const handleUpload = async (e) => {
    e.preventDefault();
    const fileList = activeTab === "carousel" ? files : [singleFile];
    if (fileList.length === 0 || (activeTab === "carousel" && fileList.length < 2)) {
      alert(activeTab === "carousel" ? "Select 2–10 files" : "Select a file");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fileList.forEach(file => fd.append("file", file));

      const res = await api.post("/upload", fd);
      const results = Array.isArray(res.data) ? res.data : [res.data];

      // Build uploaded items with title
      const uploaded = results.map(r => ({
        title: title || "",
        type: r.resourcetype === "video" ? "video" : "image",
        image: r.resourcetype !== "video" ? r.url : null,
        videoUrl: r.resourcetype === "video" ? r.url : null,
        url: r.url,
        resourcetype: r.resourcetype
      }));

      // For carousel, save all items as one entry
      if (activeTab === "carousel") {
        setContentData(prev => [
          {
            title: title || "Carousel",
            type: "carousel",
            items: uploaded.map(u => ({ type: u.type, url: u.url }))
          },
          ...prev
        ]);
      } else {
        setContentData(prev => [uploaded[0], ...prev]);
      }

      alert("✅ Upload successful! Now click 'Post' button to publish.");

      // Reset form
      setFiles([]);
      setSingleFile(null);
      setTitle("");
    } catch (err) {
      setErrorMsg("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // POST - Publish to FB/IG based on selected item
  async function handlePost(cont) {
    try {
      setErrorMsg("");
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!user?._id) {
        alert("You must be logged in to post. Please login.");
        return;
      }

      const resolvedPageId = selectedPage || pages[0]?.pageId || pages[0]?.id;
      if (!resolvedPageId) {
        alert("No Page available. Connect Facebook first.");
        return;
      }

      // Validate at least one checkbox is selected
      if (!postToFB && !postToIG) {
        alert("Please select at least Facebook or Instagram to post.");
        return;
      }

      // Handle carousel
      if (cont.type === "carousel") {
        const res = await api.post("/user/post", {
          userId: user._id,
          pageId: resolvedPageId,
          title: cont.title || "",
          type: "carousel",
          items: cont.items,
          postToFB,
          postToIG
        });

        if (res.data.success) {
          alert(`✅ Carousel posted!\nFacebook: ${postToFB ? "Yes" : "No"}\nInstagram: ${postToIG ? "Yes" : "No"}`);
          fetchContent();
        } else {
          alert("Error: " + JSON.stringify(res.data));
        }
        return;
      }

      // Handle single post (image/video)
      const url = cont.type === "video" ? (cont.videoUrl || cont.image) : cont.image;
      if (!url || !url.startsWith("https://")) {
        alert("Media must be a public HTTPS URL. Please re-upload.");
        return;
      }

      const body = {
        userId: user._id,
        pageId: resolvedPageId,
        title: cont.title || "",
        type: cont.type || "image",
        image: cont.type === "image" ? cont.image : null,
        videoUrl: cont.type === "video" ? (cont.videoUrl || cont.image) : null,
        postToFB,
        postToIG,
      };

      const res = await api.post("/user/post", body);
      
      if (res.data.success) {
        alert(`✅ Posted successfully!\nFacebook: ${postToFB ? "Yes" : "No"}\nInstagram: ${postToIG ? "Yes" : "No"}`);
        fetchContent();
      } else {
        alert("Error: " + JSON.stringify(res.data));
      }
    } catch (err) {
      console.error("Post failed:", err);
      alert("Post failed: " + (err.response?.data?.error || err.message));
    }
  }

  return (
    <div className="share-container" style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Create Post</h2>

      {/* Tab Selection */}
      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={() => setActiveTab("single")} 
          style={{ 
            padding: "8px 16px",
            fontWeight: activeTab === "single" ? "bold" : "normal",
            background: activeTab === "single" ? "#1976d2" : "#fff",
            color: activeTab === "single" ? "#fff" : "#000",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Single Post
        </button>
        <button 
          onClick={() => setActiveTab("carousel")} 
          style={{ 
            marginLeft: 8,
            padding: "8px 16px",
            fontWeight: activeTab === "carousel" ? "bold" : "normal",
            background: activeTab === "carousel" ? "#1976d2" : "#fff",
            color: activeTab === "carousel" ? "#fff" : "#000",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Carousel (2–10 items)
        </button>
      </div>

      {/* Checkboxes: Where to post? */}
      <div style={{ marginBottom: 16, padding: 12, background: "#f0f8ff", borderRadius: 8 }}>
        <strong>Post to:</strong>
        <label style={{ marginLeft: 16, cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={postToFB} 
            onChange={e => setPostToFB(e.target.checked)} 
            style={{ marginRight: 6 }}
          />
          Facebook
        </label>
        <label style={{ marginLeft: 16, cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={postToIG} 
            onChange={e => setPostToIG(e.target.checked)} 
            style={{ marginRight: 6 }}
          />
          Instagram
        </label>
      </div>

      {errorMsg && <div style={{ color: "red", marginBottom: 12, padding: 12, background: "#fee", borderRadius: 6 }}>{errorMsg}</div>}

      {/* Upload Form */}
      <form onSubmit={handleUpload} style={{ marginBottom: 30, padding: 20, background: "#f9f9f9", borderRadius: 8 }}>
        <input
          type="text"
          placeholder="Caption (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 12, border: "1px solid #ddd", borderRadius: 4 }}
        />

        <input
          type="file"
          accept="image/*,video/*"
          multiple={activeTab === "carousel"}
          onChange={handleFileChange}
          style={{ marginBottom: 12 }}
        />

        {activeTab === "carousel" && files.length > 0 && (
          <div style={{ marginBottom: 12, padding: 10, background: "#fff", borderRadius: 6 }}>
            <strong>Selected ({files.length}/10):</strong>
            {files.map((f, i) => (
              <div key={i} style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{f.name} ({f.type.startsWith("video") ? "Video" : "Image"})</span>
                <button 
                  type="button" 
                  onClick={() => removeFile(i)} 
                  style={{ padding: "4px 8px", background: "#f44336", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "single" && singleFile && (
          <div style={{ marginBottom: 12, padding: 10, background: "#fff", borderRadius: 6 }}>
            <strong>Selected:</strong> {singleFile.name}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            padding: "12px 24px", 
            fontSize: 16, 
            background: loading ? "#ccc" : "#4caf50", 
            color: "white", 
            border: "none", 
            borderRadius: 6, 
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600"
          }}
        >
          {loading ? "Uploading..." : activeTab === "carousel" ? "Upload Carousel" : "Upload"}
        </button>
      </form>

      {/* Uploaded Content - Ready to Post */}
      <div style={{ marginTop: 30 }}>
        <h3>Uploaded Content (Click Post to Publish)</h3>
        {contentData.length === 0 ? (
          <div style={{ color: "#666", padding: 20, textAlign: "center", background: "#f9f9f9", borderRadius: 8 }}>
            No uploaded content yet. Upload files above first.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {contentData.map((cont, idx) => (
              <div key={idx} style={{ border: "1px solid #ddd", padding: 12, width: 280, borderRadius: 8, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                {/* Preview */}
                {cont.type === "carousel" ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ 
                      padding: "4px 8px", 
                      background: "#e3f2fd", 
                      borderRadius: 4, 
                      display: "inline-block", 
                      fontSize: 12, 
                      fontWeight: "600",
                      marginBottom: 8
                    }}>
                      Carousel ({cont.items?.length} items)
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {cont.items?.slice(0, 4).map((item, i) => (
                        <img 
                          key={i} 
                          src={item.url} 
                          alt={`item-${i}`}
                          style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4 }}
                        />
                      ))}
                      {cont.items?.length > 4 && (
                        <div style={{ width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", borderRadius: 4, fontSize: 12 }}>
                          +{cont.items.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 150, overflow: "hidden", borderRadius: 6, marginBottom: 10 }}>
                    {cont.type === "video" ? (
                      <video
                        controls
                        src={buildImageUrl(cont.videoUrl || cont.image)}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <img
                        src={buildImageUrl(cont.image)}
                        alt={cont.title || "image"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                )}

                <div style={{ marginBottom: 12, minHeight: 40, fontSize: 14 }}>
                  {cont.title ? (
                    <strong>{cont.title}</strong>
                  ) : (
                    <span style={{ color: "#999" }}>(no caption)</span>
                  )}
                </div>

                {/* Single POST Button */}
                <button 
                  onClick={() => handlePost(cont)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#1976d2",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: "600"
                  }}
                  onMouseOver={e => e.target.style.background = "#1565c0"}
                  onMouseOut={e => e.target.style.background = "#1976d2"}
                >
                  📤 Post {postToFB && postToIG ? "(FB + IG)" : postToFB ? "(FB)" : postToIG ? "(IG)" : ""}
                </button>

                <div style={{ marginTop: 8, fontSize: 11, color: "#666", textAlign: "center" }}>
                  Will post to: {postToFB ? "Facebook " : ""}{postToFB && postToIG ? "+ " : ""}{postToIG ? "Instagram" : ""}
                  {!postToFB && !postToIG && <span style={{ color: "#f44336" }}>⚠️ Select a platform above</span>}
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
