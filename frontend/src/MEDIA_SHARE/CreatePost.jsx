import React, { useEffect, useState, useRef } from "react";
import api from "./api";
import "./createpost.css";

function CreatePost() {
  // Content type state
  const [contentType, setContentType] = useState("media");
  
  // Media states
  const [contentData, setContentData] = useState([]);
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState([]);
  const [singleFile, setSingleFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCarousel, setIsCarousel] = useState(false);
  
  // Text post states
  const [textContent, setTextContent] = useState("");
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#ffffff");
  const [backgroundGradient, setBackgroundGradient] = useState({ c1: "#667eea", c2: "#764ba2" });
  const [textAlign, setTextAlign] = useState("center");
  const [fontWeight, setFontWeight] = useState("600");
  
  // Platform states
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [postToFB, setPostToFB] = useState(false);
  const [postToIG, setPostToIG] = useState(false);
  const [rateLimits, setRateLimits] = useState(null);
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const fonts = ["Arial", "Impact", "Georgia", "Verdana", "Courier New", "Comic Sans MS", "Palatino"];
  
  const gradients = [
    { name: "Purple", c1: "#667eea", c2: "#764ba2" },
    { name: "Sunset", c1: "#ff6b6b", c2: "#feca57" },
    { name: "Ocean", c1: "#4facfe", c2: "#00f2fe" },
    { name: "Forest", c1: "#56ab2f", c2: "#a8e063" },
    { name: "Instagram", c1: "#f09433", c2: "#bc1888" },
    { name: "Night", c1: "#2c3e50", c2: "#3498db" }
  ];

  useEffect(() => {
    fetchContent();
    loadPagesForUser();
  }, []);

  useEffect(() => {
    if (selectedPage && postToIG) {
      fetchRateLimits();
    } else {
      setRateLimits(null);
    }
  }, [selectedPage, postToIG]);

  useEffect(() => {
    if (contentType === "text" && canvasRef.current) {
      drawTextCanvas();
    }
  }, [textContent, fontSize, fontFamily, textColor, backgroundGradient, textAlign, fontWeight]);

  const drawTextCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, backgroundGradient.c1);
    gradient.addColorStop(1, backgroundGradient.c2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = textColor;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";

    const lines = textContent.split("\n");
    const lineHeight = fontSize * 1.4;
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
    const xPos = textAlign === "left" ? 100 : textAlign === "right" ? width - 100 : width / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, xPos, startY + (i * lineHeight));
    });
  };

  async function loadPagesForUser() {
    try {
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!user?._id) return;

      const res = await api.get("/user/pages");
      const pagesList = res.data?.pages || [];
      setPages(pagesList);
      if (pagesList.length > 0) {
        setSelectedPage(pagesList[0].pageId);
      }
    } catch (err) {
      console.error("Failed to load pages:", err);
    }
  }

  async function fetchContent() {
    try {
      const res = await api.get("/upload");
      const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setContentData(arr);
    } catch (err) {
      setContentData([]);
    }
  }

  async function fetchRateLimits() {
    try {
      if (!selectedPage || pages.length === 0) return;

      const page = pages.find(p => p.pageId === selectedPage);
      if (!page?.instagramBusinessId) {
        setRateLimits(null);
        return;
      }

      const res = await api.post("/user/rate-limits", { pageId: selectedPage });
      if (res.data?.data?.[0]) {
        setRateLimits(res.data.data[0]);
      }
    } catch (err) {
      setRateLimits(null);
    }
  }

  const handlePageChange = (newPageId) => {
    setSelectedPage(newPageId);
    
    const newPage = pages.find(p => p.pageId === newPageId);
    if (!newPage?.instagramBusinessId) {
      if (postToIG) setPostToIG(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (isCarousel) {
      if (selected.length + files.length > 10) {
        alert("Maximum 10 items");
        return;
      }
      setFiles(prev => [...prev, ...selected]);
    } else {
      setSingleFile(selected[0] || null);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSingleFile = () => {
    setSingleFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveContent = (index) => {
    if (window.confirm("Remove this content?")) {
      setContentData(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleMediaUpload = async (e) => {
    e.preventDefault();
    const fileList = isCarousel ? files : [singleFile];
    if (fileList.length === 0 || (isCarousel && fileList.length < 2)) {
      alert(isCarousel ? "Select 2–10 files" : "Select a file");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fileList.forEach(file => fd.append("file", file));

      const res = await api.post("/upload", fd);
      const results = Array.isArray(res.data) ? res.data : [res.data];

      const uploaded = results.map(r => ({
        title: title || "",
        type: r.resource_type === "video" ? "video" : "image",
        image: r.resource_type !== "video" ? r.url : null,
        videoUrl: r.resource_type === "video" ? r.url : null,
        url: r.url
      }));

      if (isCarousel) {
        setContentData(prev => [{
          title: title || "Carousel",
          type: "carousel",
          items: uploaded.map(u => ({ type: u.type, url: u.url }))
        }, ...prev]);
      } else {
        const itemType = contentType === "story" ? "story" : uploaded[0].type;
        setContentData(prev => [{ ...uploaded[0], type: itemType }, ...prev]);
      }

      alert("✅ Uploaded!");
      setFiles([]);
      setSingleFile(null);
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setErrorMsg("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTextUpload = async () => {
    if (!textContent.trim()) {
      alert("Enter text first!");
      return;
    }

    setLoading(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      
      const fd = new FormData();
      fd.append("file", blob, "text-post.png");

      const res = await api.post("/upload", fd);
      const result = Array.isArray(res.data) ? res.data[0] : res.data;

      setContentData(prev => [{
        title: textContent.substring(0, 100),
        type: "image",
        image: result.url,
        url: result.url
      }, ...prev]);

      alert("✅ Text post created!");
      setTextContent("");
    } catch (err) {
      setErrorMsg("Failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  async function handlePost(cont) {
    try {
      setErrorMsg("");
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!user?._id) {
        alert("Please login");
        return;
      }

      if (!selectedPage) {
        alert("Select a page");
        return;
      }

      if (cont.type === "story") {
        const page = pages.find(p => p.pageId === selectedPage);
        if (!page?.instagramBusinessId) {
          alert("❌ This page doesn't have Instagram connected.\n\nStories require Instagram Business Account.");
          return;
        }

        if (rateLimits && rateLimits.quota_usage >= 25) {
          alert("Instagram daily limit reached (25 posts)");
          return;
        }

        const response = await api.post("/user/story", {
          userId: user._id,
          pageId: selectedPage,
          type: cont.videoUrl ? "video" : "image",
          image: cont.image || null,
          videoUrl: cont.videoUrl || null
        });

        if (response.data.success) {
          alert("✅ Story posted!");
          fetchContent();
          setTimeout(() => fetchRateLimits(), 2000);
        }
        return;
      }

      if (!postToFB && !postToIG) {
        alert("Select at least one platform");
        return;
      }

      if (postToIG && rateLimits && rateLimits.quota_usage >= 25) {
        alert("Instagram daily limit reached");
        return;
      }

      let response;

      if (cont.type === "carousel") {
        response = await api.post("/user/post", {
          userId: user._id,
          pageId: selectedPage,
          title: cont.title || "",
          type: "carousel",
          items: cont.items,
          postToFB,
          postToIG
        });
      } else {
        response = await api.post("/user/post", {
          userId: user._id,
          pageId: selectedPage,
          title: cont.title || "",
          type: cont.type,
          image: cont.image || null,
          videoUrl: cont.videoUrl || null,
          postToFB,
          postToIG
        });
      }

      if (response.data.success) {
        alert("✅ Posted!");
        fetchContent();
        if (postToIG) setTimeout(() => fetchRateLimits(), 2000);
      }
    } catch (err) {
      alert("Failed: " + (err.response?.data?.error || err.message));
    }
  }

  const buildImageUrl = (img) => {
    if (!img) return "";
    if (img.startsWith("http")) return img;
    const base = import.meta.env.VITE_API_URL || "";
    return base ? `${base.replace(/\/$/, "")}/${img.replace(/^\/+/, "")}` : img;
  };

  const currentPageHasIG = () => {
    const page = pages.find(p => p.pageId === selectedPage);
    return !!page?.instagramBusinessId;
  };

  return (
    <div className="create-post-wrapper">
      {/* Left Panel */}
      <div className="left-panel">
        <div className="panel-header">
          <h2>✨ Create Content</h2>
        </div>

        {/* Content Type Tabs */}
        <div className="content-tabs">
          <button
            className={contentType === "media" ? "active" : ""}
            onClick={() => setContentType("media")}
          >
            <span>📸</span> Media
          </button>
          <button
            className={contentType === "text" ? "active" : ""}
            onClick={() => setContentType("text")}
          >
            <span>📝</span> Text
          </button>
          <button
            className={contentType === "story" ? "active" : ""}
            onClick={() => setContentType("story")}
          >
            <span>📖</span> Story
          </button>
        </div>

        {/* Platform Selection - Only for Media & Text */}
        {contentType !== "story" && (
          <div className="platform-box">
            <h3>📱 Select Platforms</h3>

            <label className={`platform-option ${postToFB ? "active" : ""}`}>
              <input
                type="checkbox"
                checked={postToFB}
                onChange={(e) => setPostToFB(e.target.checked)}
              />
              <span className="icon">📘</span>
              <span>Facebook Post</span>
            </label>

            {postToFB && pages.length > 0 && (
              <select
                value={selectedPage}
                onChange={(e) => handlePageChange(e.target.value)}
                className="page-select"
              >
                {pages.map((page) => (
                  <option key={page.pageId} value={page.pageId}>
                    {page.pageName} {page.instagramBusinessId ? "📸" : ""}
                  </option>
                ))}
              </select>
            )}

            <label
              className={`platform-option ${postToIG ? "active" : ""} ${
                !postToFB || !currentPageHasIG() ? "disabled" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={postToIG}
                disabled={!postToFB || !currentPageHasIG()}
                onChange={(e) => {
                  if (!currentPageHasIG()) {
                    alert("❌ Selected page doesn't have Instagram connected");
                    return;
                  }
                  setPostToIG(e.target.checked);
                }}
              />
              <span className="icon">📸</span>
              <span>Instagram Post</span>
              {!postToFB && <small>Select Facebook first</small>}
              {postToFB && !currentPageHasIG() && <small>No IG linked</small>}
            </label>

            {postToIG && rateLimits && (
              <div className="rate-info">
                <span>
                  📊 Instagram: {rateLimits.quota_usage}/25 posts today
                </span>
                <div className="rate-bar">
                  <div
                    style={{ width: `${(rateLimits.quota_usage / 25) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Story Settings */}
        {contentType === "story" && (
          <div className="platform-box story-platform">
            <h3>📖 Instagram Story</h3>
            <div className="story-info-box">
              <span className="story-icon">📸</span>
              <div>
                <p>
                  <strong>Instagram Only</strong>
                </p>
                <small>
                  Stories post to Instagram via your Facebook page's connected
                  account
                </small>
              </div>
            </div>

            {pages.length > 0 && (
              <>
                <label className="page-label">Select Facebook Page</label>
                <select
                  value={selectedPage}
                  onChange={(e) => handlePageChange(e.target.value)}
                  className="page-select"
                >
                  {pages.map((page) => (
                    <option key={page.pageId} value={page.pageId}>
                      {page.pageName} {page.instagramBusinessId ? "✅" : "❌"}
                    </option>
                  ))}
                </select>

                {!currentPageHasIG() && (
                  <div className="warning-box">
                    ⚠️ Selected page has no Instagram. Connect Instagram first.
                  </div>
                )}

                {currentPageHasIG() && rateLimits && (
                  <div className="rate-info">
                    <span>📊 {rateLimits.quota_usage}/25 posts today</span>
                    <div className="rate-bar">
                      <div
                        style={{
                          width: `${(rateLimits.quota_usage / 25) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Upload Area */}
        <div className="upload-area">
          {contentType === "media" && (
            <form onSubmit={handleMediaUpload}>
              <label className="carousel-check">
                <input
                  type="checkbox"
                  checked={isCarousel}
                  onChange={(e) => {
                    setIsCarousel(e.target.checked);
                    setFiles([]);
                    setSingleFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                <span>Carousel (2-10 items)</span>
              </label>

              <input
                type="text"
                placeholder="Caption (optional)..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="caption-field"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple={isCarousel}
                onChange={handleFileChange}
                className="file-input"
              />

              {isCarousel && files.length > 0 && (
                <div className="file-list">
                  {files.map((f, i) => (
                    <div key={i} className="file-tag">
                      <span>
                        {i + 1}. {f.name}
                      </span>
                      <button type="button" onClick={() => removeFile(i)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isCarousel && singleFile && (
                <div className="file-list">
                  <div className="file-tag">
                    {singleFile.name}
                    <button type="button" onClick={removeSingleFile}>
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="upload-btn">
                {loading ? "⏳ Uploading..." : "📤 Upload"}
              </button>
            </form>
          )}

          {contentType === "text" && (
            <div className="text-creator">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your text..."
                className="text-area"
              />

              <div className="text-tools">
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {fonts.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>

                <input
                  type="range"
                  min="24"
                  max="100"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  title={`Size: ${fontSize}px`}
                />

                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  title="Text color"
                />
              </div>

              <div className="style-btns">
                <button
                  className={fontWeight === "bold" ? "active" : ""}
                  onClick={() =>
                    setFontWeight(fontWeight === "bold" ? "600" : "bold")
                  }
                >
                  B
                </button>
                <button
                  className={textAlign === "left" ? "active" : ""}
                  onClick={() => setTextAlign("left")}
                >
                  ⬅
                </button>
                <button
                  className={textAlign === "center" ? "active" : ""}
                  onClick={() => setTextAlign("center")}
                >
                  ↔
                </button>
                <button
                  className={textAlign === "right" ? "active" : ""}
                  onClick={() => setTextAlign("right")}
                >
                  ➡
                </button>
              </div>

              <div className="gradient-grid">
                {gradients.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => setBackgroundGradient(g)}
                    style={{
                      background: `linear-gradient(135deg, ${g.c1}, ${g.c2})`,
                    }}
                    title={g.name}
                  />
                ))}
              </div>

              <canvas ref={canvasRef} className="text-preview" />

              <button
                onClick={handleTextUpload}
                disabled={loading}
                className="upload-btn"
              >
                {loading ? "⏳ Creating..." : "✨ Create Text Post"}
              </button>
            </div>
          )}

          {contentType === "story" && (
            <form onSubmit={handleMediaUpload}>
              <div className="story-hint">
                <span>📖</span>
                <div>
                  <p>
                    <strong>Story Requirements</strong>
                  </p>
                  <small>
                    • Vertical (9:16) recommended
                    <br />• Expires in 24 hours
                    <br />• Image or Video
                  </small>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="file-input"
              />

              {singleFile && (
                <div className="file-list">
                  <div className="file-tag">
                    {singleFile.name}
                    <button type="button" onClick={removeSingleFile}>
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !currentPageHasIG()}
                className="upload-btn"
              >
                {loading
                  ? "⏳ Uploading..."
                  : !currentPageHasIG()
                  ? "⚠️ No Instagram"
                  : "📤 Upload Story"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="panel-header">
          <h3>📂 Uploaded Content</h3>
          <span className="count">{contentData.length}</span>
        </div>

        <div className="content-scroll">
          {contentData.length === 0 ? (
            <div className="empty">No content yet. Upload something!</div>
          ) : (
            contentData.map((cont, idx) => (
              <div key={idx} className="post-card">
                <button
                  className="del-btn"
                  onClick={() => handleRemoveContent(idx)}
                >
                  ✕
                </button>

                <div className="card-preview">
                  {cont.type === "carousel" ? (
                    <div className="carousel-grid">
                      {cont.items?.map((item, i) => (
                        <div
                          key={i}
                          className="carousel-item"
                          data-index={i + 1}
                        >
                          {item.type === "video" ? (
                            <video src={item.url} />
                          ) : (
                            <img src={item.url} alt="" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : cont.type === "video" || cont.videoUrl ? (
                    <video src={buildImageUrl(cont.videoUrl || cont.image)} />
                  ) : (
                    <img src={buildImageUrl(cont.image)} alt="" />
                  )}
                </div>

                <div className="card-info">
                  <p>{cont.title || "(no caption)"}</p>
                  <span className="badge">{cont.type}</span>
                </div>

                <button
                  onClick={() => handlePost(cont)}
                  className="post-now-btn"
                >
                  {cont.type === "story" ? "📖 Post Story" : "🚀 Post Now"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CreatePost;
