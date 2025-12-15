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

  //  Twitter state
  const [postToTwitter, setPostToTwitter] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState("");


    //  Scheduling states
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledDateTime, setScheduledDateTime] = useState("");
    const [hashtags, setHashtags] = useState("");

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

// CreatePost.jsx - Updated fonts array with Google Fonts

const fonts = [
  // Web-safe fonts (always available)
  "Arial",
  "Impact",
  "Georgia",
  "Verdana",
  "Courier New",
  "Comic Sans MS",
  "Palatino",
  "Times New Roman",
  
  // ✅ Google Fonts (modern & beautiful)
  "Roboto",           // Clean, modern sans-serif
  "Montserrat",       // Bold, geometric sans-serif
  "Poppins",          // Friendly, rounded sans-serif
  "Playfair Display", // Elegant serif
  "Oswald",           // Bold, condensed sans-serif
  "Lora",             // Beautiful serif for quotes
  "Pacifico",         // Handwritten, fun script
  "Dancing Script",   // Elegant cursive
  "Bebas Neue",       // All-caps, bold display font
  "Cinzel",           // Classy, luxury serif
];

  
  const gradients = [
    // Vibrant
    { name: "Purple", c1: "#667eea", c2: "#764ba2" },
    { name: "Sunset", c1: "#ff6b6b", c2: "#feca57" },
    { name: "Ocean", c1: "#4facfe", c2: "#00f2fe" },
    { name: "Instagram", c1: "#f09433", c2: "#bc1888" },
    { name: "Fire", c1: "#ff0844", c2: "#ffb199" },
    { name: "Neon", c1: "#b3ffab", c2: "#12fff7" },
    
    // Pastels
    { name: "Pink", c1: "#ff9a9e", c2: "#fad0c4" },
    { name: "Lavender", c1: "#a18cd1", c2: "#fbc2eb" },
    { name: "Mint", c1: "#00c9ff", c2: "#92fe9d" },
    { name: "Peach", c1: "#ff758c", c2: "#ff7eb3" },
    { name: "Cotton Candy", c1: "#ffa6f6", c2: "#a79af9" },
    
    // Cool
    { name: "Night", c1: "#2c3e50", c2: "#3498db" },
    { name: "Sky", c1: "#2980b9", c2: "#6dd5fa" },
    { name: "Forest", c1: "#56ab2f", c2: "#a8e063" },
    
    // Warm
    { name: "Orange", c1: "#ff8008", c2: "#ffc837" },
    { name: "Rose", c1: "#eb3349", c2: "#f45c43" },
    
    // Solid
    { name: "White", c1: "#ffffff", c2: "#ffffff" },
    { name: "Black", c1: "#000000", c2: "#000000" },
  ];
  

  useEffect(() => {
    fetchContent();
    loadPagesForUser();
    checkTwitterConnection(); // ✅ ADD THIS
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


// ✅ FIXED: Check Twitter connection (line ~90)
// ✅ Check Twitter connection using api.js (line ~90)
const checkTwitterConnection = async () => {
  try {
    const response = await api.get('/user/twitter/status');
    
    if (response.data.success && response.data.connected) {
      setTwitterConnected(true);
      setTwitterUsername(response.data.username || '');
    }
  } catch (error) {
    console.error('Error checking Twitter status:', error);
  }
};

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

    // Handle Story posting
    if (cont.type === "story") {
      if (!selectedPage) {
        alert("❌ Please select a Facebook page");
        return;
      }

      const page = pages.find(p => p.pageId === selectedPage);
      if (!page?.instagramBusinessId) {
        alert("❌ Selected page doesn't have Instagram connected");
        return;
      }

      setLoading(true);
      try {
        const response = await api.post("/user/story", {
          userId: user._id,
          pageId: selectedPage,
          type: cont.videoUrl ? "video" : "image",
          image: cont.image || null,
          videoUrl: cont.videoUrl || null
        });

        if (response.data.success) {
          alert("✅ Story posted successfully! Expires in 24 hours.");
          setContentData(prev => prev.filter((_, i) => i !== contentData.indexOf(cont)));
        }
      } catch (err) {
        alert("❌ Failed to post story: " + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Check platform selection
    if (!postToFB && !postToIG && !postToTwitter) {
      alert("❌ Select at least one platform (Facebook, Instagram, or Twitter)");
      return;
    }

    // ✅ SCHEDULE POST
    if (isScheduling) {
      if (!scheduledDateTime) {
        alert("❌ Please select a date and time for scheduling");
        return;
      }

      const scheduleDate = new Date(scheduledDateTime);
      if (scheduleDate <= new Date()) {
        alert("❌ Scheduled time must be in the future");
        return;
      }

      const platforms = [];
      if (postToTwitter) platforms.push("twitter");
      if (postToFB) platforms.push("facebook");
      if (postToIG) platforms.push("instagram");

      const hashtagArray = hashtags
        .split(/[,\s]+/)
        .filter(tag => tag.trim())
        .map(tag => tag.replace("#", ""));

      setLoading(true);

      try {
        const payload = {
          title: cont.title || "",
          caption: cont.title || "",
          platform: platforms,
          scheduledFor: scheduleDate.toISOString(),
          hashtags: hashtagArray,
          type: cont.type,
          image: cont.image || null,
          videoUrl: cont.videoUrl || null,
          pageId: (postToFB || postToIG) ? selectedPage : null
        };

        if (cont.type === "carousel") {
          payload.items = cont.items;
        }

        const response = await api.post("/user/schedule-post", payload);

        if (response.data.success) {
          alert(`✅ Post scheduled for ${scheduleDate.toLocaleString()}!\n\nView in Scheduled Posts page.`);
          setContentData(prev => prev.filter((_, i) => i !== contentData.indexOf(cont)));
          setIsScheduling(false);
          setScheduledDateTime("");
          setHashtags("");
        }
      } catch (error) {
        alert("❌ Failed to schedule: " + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
      return;
    }

    // ✅ IMMEDIATE POST - ONE UNIFIED API CALL
    
    // Validate requirements
    if ((postToFB || postToIG) && !selectedPage) {
      alert("❌ Please select a Facebook page");
      return;
    }

    if (!twitterConnected && postToTwitter) {
      alert("❌ Twitter not connected. Please connect Twitter first.");
      return;
    }

    // Check carousel limitations
    if (cont.type === "carousel") {
      if (postToTwitter) {
        alert("⚠️ Note: Carousel posts cannot be posted to Twitter. Will post to FB/IG only.");
        // Don't return, just warn and continue with FB/IG
      }
    }

    // Check Instagram rate limit
    if (postToIG && rateLimits && rateLimits.quota_usage >= 25) {
      alert("❌ Instagram daily limit reached (25 posts)");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        userId: user._id,
        title: cont.title || "",
        type: cont.type,
        image: cont.image || null,
        videoUrl: cont.videoUrl || null,
        postToFB,
        postToIG,
        postToTwitter: cont.type === "carousel" ? false : postToTwitter // Disable Twitter for carousel
      };

      // Add pageId only if posting to FB/IG
      if (postToFB || postToIG) {
        payload.pageId = selectedPage;
      }

      // Add carousel items
      if (cont.type === "carousel") {
        payload.items = cont.items;
      }

      // ✅ ONE API CALL - Posts to ALL selected platforms
      const response = await api.post("/user/post", payload);

      if (response.data.success) {
        const results = response.data.results;
        const platforms = [];
        
        if (postToFB && (results.fb?.id || results.fb?.post_id)) platforms.push("Facebook");
        if (postToIG && results.ig?.id) platforms.push("Instagram");
        if (postToTwitter && results.twitter?.id) platforms.push("Twitter");

        if (platforms.length > 0) {
          alert(`✅ Posted successfully to: ${platforms.join(", ")}!`);
          
          // Remove from uploaded content UI
          setContentData(prev => prev.filter((_, i) => i !== contentData.indexOf(cont)));
          
          // Refresh Instagram rate limits
          if (postToIG) {
            setTimeout(() => fetchRateLimits(), 2000);
          }
        } else {
          // Check for errors
          const errors = [];
          if (postToFB && results.fb?.error) errors.push(`FB: ${results.fb.error.message}`);
          if (postToIG && results.ig?.error) errors.push(`IG: ${results.ig.error.message}`);
          if (postToTwitter && results.twitter?.error) errors.push(`Twitter: ${results.twitter.error}`);
          
          alert("❌ Failed to post:\n" + errors.join("\n"));
        }
      } else {
        alert("❌ Failed to post: " + (response.data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Post error:", err);
      alert("❌ Failed to post: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }

  } catch (err) {
    setLoading(false);
    alert("❌ Error: " + (err.response?.data?.error || err.message));
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

    {/* ✅ YOUR EXISTING FACEBOOK CHECKBOX - KEEP THIS */}
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

    {/* ✅ YOUR EXISTING INSTAGRAM CHECKBOX - KEEP THIS */}
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

    {/* ✅ YOUR EXISTING TWITTER CHECKBOX - KEEP THIS */}
    <label
      className={`platform-option ${postToTwitter ? "active" : ""} ${
        !twitterConnected ? "disabled" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={postToTwitter}
        disabled={!twitterConnected}
        onChange={(e) => {
          if (!twitterConnected) {
            alert("❌ Twitter not connected. Go to Dashboard to connect Twitter.");
            return;
          }
          setPostToTwitter(e.target.checked);
        }}
      />
      <span className="icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DA1F2" style={{ verticalAlign: 'middle' }}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </span>
      <span>Twitter Post</span>
      {twitterConnected && twitterUsername && (
        <small style={{ color: '#1DA1F2' }}>@{twitterUsername}</small>
      )}
      {!twitterConnected && <small style={{ color: '#dc3545' }}>Not connected</small>}
    </label>

    {postToTwitter && !twitterConnected && (
      <div className="warning-box" style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        padding: '10px',
        borderRadius: '5px',
        marginTop: '10px'
      }}>
        <span style={{ color: '#856404' }}>
          ⚠️ Twitter is not connected. <a href="/" style={{ color: '#1DA1F2' }}>Connect Twitter</a>
        </span>
      </div>
    )}

    {/* ⭐⭐⭐ ADD THE SCHEDULING CODE RIGHT HERE - AFTER ALL PLATFORM CHECKBOXES ⭐⭐⭐ */}
    <div style={{ 
      borderTop: "1px solid #e0e0e0", 
      marginTop: "15px", 
      paddingTop: "15px" 
    }}>
      <label className="schedule-toggle" style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px",
        backgroundColor: isScheduling ? "#e3f2fd" : "#f5f5f5",
        borderRadius: "8px",
        cursor: "pointer",
        border: isScheduling ? "2px solid #2196f3" : "2px solid transparent"
      }}>
        <input
          type="checkbox"
          checked={isScheduling}
          onChange={(e) => setIsScheduling(e.target.checked)}
          style={{ width: "20px", height: "20px" }}
        />
        <span style={{ fontWeight: "600", color: isScheduling ? "#1976d2" : "#333" }}>
          📅 Schedule for later
        </span>
      </label>

      {isScheduling && (
        <div style={{ 
          marginTop: "15px", 
          padding: "15px", 
          backgroundColor: "#fff", 
          borderRadius: "8px",
          border: "1px solid #e0e0e0"
        }}>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontWeight: "600",
            color: "#333"
          }}>
            📆 Date & Time *
          </label>
          <input
            type="datetime-local"
            value={scheduledDateTime}
            onChange={(e) => setScheduledDateTime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
            required
          />

          <label style={{ 
            display: "block", 
            marginTop: "12px",
            marginBottom: "8px", 
            fontWeight: "600",
            color: "#333"
          }}>
            🏷️ Hashtags (optional)
          </label>
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="marketing, social, tech (comma separated)"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
          />
          <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "5px" }}>
            Separate with commas or spaces
          </small>
        </div>
      )}
    </div>
    {/* ⭐⭐⭐ SCHEDULING CODE ENDS HERE ⭐⭐⭐ */}

  </div>
)}

        {/* Story Settings (unchanged) */}
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

              <label className="color-wrap" title="Text color">
  <input
    type="color"
    className="color-picker-overlay"
    value={textColor}
    onChange={(e) => setTextColor(e.target.value)}
  />
</label>
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
