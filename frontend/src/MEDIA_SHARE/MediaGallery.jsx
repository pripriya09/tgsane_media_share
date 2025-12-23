import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./postshistory.css";

function MediaGallery() {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterType, setFilterType] = useState("all");
  const [fileInputKey, setFileInputKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadMediaItems();
  }, []);

  async function loadMediaItems() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/user/media-gallery");
      
      // ✅ ADD DEBUG LOGS
      console.log("📦 API Response:", res.data);
      console.log("📦 Media array:", res.data.media);
      
      setMediaItems(res.data.media || []);
    } catch (err) {
      console.error("❌ Failed to load media:", err);
      console.error("Error response:", err.response?.data);
      setError("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("media", file);

    try {
      setUploadProgress(0);
      const res = await api.post("/user/media-gallery/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percent);
          }
        },
      });
      
      alert("✅ Media added to gallery!");
      loadMediaItems();
      closeUploadModal();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed: " + (err.response?.data?.error || err.message));
    }
  }

  function closeUploadModal() {
    setShowUploadModal(false);
    setUploadProgress(0);
    setFileInputKey(prev => prev + 1); // Reset file input
  }

  function useMediaForPost(item) {
    // Store in localStorage for CreatePost to pick up
    localStorage.setItem("galleryMediaForPost", JSON.stringify({
      url: item.url,
      type: item.type,
      name: item.originalName || "Gallery Media"
    }));
    
    // Navigate to Create Post
    navigate("/home/create");
  }

  async function deleteMedia(itemId) {
    if (!window.confirm("Delete this media from gallery?")) return;
    
    try {
      await api.delete(`/user/media-gallery/${itemId}`);
      alert("✅ Media deleted!");
      loadMediaItems();
    } catch (err) {
      alert("❌ Delete failed: " + err.response?.data?.error);
    }
  }

  const filteredMedia = mediaItems.filter(item => 
    filterType === "all" || item.type === filterType
  );

  if (loading) {
    return (
      <div className="media-gallery-container">
        <div className="loading">Loading your gallery...</div>
      </div>
    );
  }

  return (
    <div className="media-gallery-container">
      <div className="gallery-header">
        <div>
          <h2>🖼️ Media Gallery</h2>
          <p className="gallery-subtitle">
            {mediaItems.length} items • Reuse in posts
          </p>
        </div>
        
        <div className="gallery-controls">
          {/* <button 
            className="upload-btn primary"
            onClick={() => setShowUploadModal(true)}
          >
            ➕ Upload Media
          </button> */}
          
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              All ({mediaItems.length})
            </button>
            <button 
              className={`filter-tab ${filterType === "image" ? "active" : ""}`}
              onClick={() => setFilterType("image")}
            >
              🖼️ Images 
              <span className="count">
                ({mediaItems.filter(i => i.type === "image").length})
              </span>
            </button>
            <button 
              className={`filter-tab ${filterType === "video" ? "active" : ""}`}
              onClick={() => setFilterType("video")}
            >
              🎥 Videos 
              <span className="count">
                ({mediaItems.filter(i => i.type === "video").length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ {error} 
          <button onClick={loadMediaItems} className="retry-btn">Retry</button>
        </div>
      )}

      {filteredMedia.length === 0 ? (
        <div className="empty-gallery">
          <div className="empty-icon">🖼️</div>
          <h3>Your Media Gallery</h3>
          <p>Upload images and videos to save them here for easy reuse in posts</p>
          <button 
            className="upload-btn-empty primary" 
            onClick={() => setShowUploadModal(true)}
          >
            📤 Upload First Media
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {filteredMedia.map((item) => (
            <div key={item._id || item.id} className="media-card">
              <div className="media-thumb-container">
                {item.type === "video" ? (
                  <video 
                    src={item.url} 
                    className="media-thumb video-thumb"
                    muted 
                    preload="metadata"
                    poster={item.thumbnail || undefined}
                  >
                    Your browser doesn't support video
                  </video>
                ) : (
                  <img 
                    src={item.url} 
                    alt={item.originalName || "Media"} 
                    className="media-thumb image-thumb"
                    loading="lazy"
                  />
                )}
                <div className="play-overlay">
                  {item.type === "video" && <span>▶️</span>}
                </div>
              </div>
              
              <div className="media-info">
                <div className="media-name" title={item.originalName}>
                  {item.originalName?.split('.')[0] || "Untitled"}
                </div>
                <div className="media-meta">
                  <span className={`type-badge ${item.type}`}>
                    {item.type.toUpperCase()}
                  </span>
                  <span className="upload-date">
                    {new Date(item.createdAt || item.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="media-actions">
              <button 
    className="btn-use-icon"
    onClick={() => useMediaForPost(item)}
    title="Use in Post"
  >
    ➕
  </button>
                <div className="secondary-actions">
                  <button 
                    className="btn-share"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: item.originalName || "Media",
                          url: item.url
                        });
                      } else {
                        navigator.clipboard.writeText(item.url);
                        alert("📋 URL copied to clipboard!");
                      }
                    }}
                  >
                     Share
                  </button>
                  <button 
                    className="btn-delete danger"
                    onClick={() => deleteMedia(item._id || item.id)}
                  >
                   Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

 
{showUploadModal && (
  <div className="modal-overlay" onClick={closeUploadModal}>
    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Upload to Gallery</h3>
        <button onClick={closeUploadModal} className="modal-close">×</button>
      </div>
      
      <div className="upload-area">
        {/* ✅ FIXED: File input is ONLY inside upload-zone */}
        <label htmlFor="gallery-file-input" className="upload-zone">
          <input
            id="gallery-file-input"
            key={fileInputKey}
            type="file"
            accept="image/*,video/mp4,video/quicktime"
            onChange={handleFileUpload}
            className="file-input"
            style={{ display: 'none' }} // ✅ Hide completely, only label is clickable
          />
          <div className="upload-icon">📤</div>
          <p>Click to select image or video</p>
          <small>Max 100MB • JPG, PNG, MP4</small>
        </label>
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress-section">
            <div className="progress-label">
              Uploading... {uploadProgress}%
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}

    </div>
  );
}

export default MediaGallery;
