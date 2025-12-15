// src/SchedulePost.jsx - NEW FILE
import React, { useState, useEffect } from "react";
import api from "./api";
import "./autopost.css";

function SchedulePost() {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  
  // Form states
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [type, setType] = useState("text");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  
  // Platform connection states
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");

  useEffect(() => {
    loadScheduledPosts();
    checkConnections();
    loadPages();
  }, []);

  const loadScheduledPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/user/scheduled-posts");
      setScheduledPosts(response.data.posts || []);
    } catch (error) {
      console.error("Failed to load scheduled posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnections = async () => {
    try {
      const [twitterRes, fbRes] = await Promise.all([
        api.get("/user/twitter/status"),
        api.get("/user/pages")
      ]);
      
      setTwitterConnected(twitterRes.data.connected || false);
      setFacebookConnected(fbRes.data.facebookConnected || false);
    } catch (error) {
      console.error("Failed to check connections:", error);
    }
  };

  const loadPages = async () => {
    try {
      const res = await api.get("/user/pages");
      setPages(res.data.pages || []);
      if (res.data.pages?.length > 0) {
        setSelectedPage(res.data.pages[0].pageId);
      }
    } catch (error) {
      console.error("Failed to load pages:", error);
    }
  };

  const handlePlatformToggle = (platform) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title && !caption) {
      alert("Enter title or caption");
      return;
    }

    if (platforms.length === 0) {
      alert("Select at least one platform");
      return;
    }

    if (!scheduledFor) {
      alert("Select schedule date and time");
      return;
    }

    // Validate scheduled time is in future
    const scheduleDate = new Date(scheduledFor);
    if (scheduleDate <= new Date()) {
      alert("Scheduled time must be in the future");
      return;
    }

    // Extract hashtags from input
    const hashtagArray = hashtags
      .split(/[,\s]+/)
      .filter(tag => tag.trim())
      .map(tag => tag.replace("#", ""));

    try {
      setLoading(true);

      const payload = {
        title,
        caption,
        platform: platforms,
        scheduledFor: scheduleDate.toISOString(),
        hashtags: hashtagArray,
        type,
        image: imageUrl || null,
        videoUrl: videoUrl || null,
        pageId: (platforms.includes("facebook") || platforms.includes("instagram")) ? selectedPage : null
      };

      if (editingPost) {
        await api.put(`/user/schedule-post/${editingPost._id}`, payload);
        alert("✅ Post updated successfully!");
      } else {
        await api.post("/user/schedule-post", payload);
        alert("✅ Post scheduled successfully!");
      }

      resetForm();
      loadScheduledPosts();
      setShowModal(false);
    } catch (error) {
      alert("❌ Failed: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setTitle(post.title || "");
    setCaption(post.caption || "");
    setPlatforms(post.platform || []);
    setScheduledFor(post.scheduledFor ? new Date(post.scheduledFor).toISOString().slice(0, 16) : "");
    setHashtags(post.hashtags ? post.hashtags.join(", ") : "");
    setType(post.type || "text");
    setImageUrl(post.image || "");
    setVideoUrl(post.videoUrl || "");
    setSelectedPage(post.pageId || "");
    setShowModal(true);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Delete this scheduled post?")) return;

    try {
      await api.delete(`/user/schedule-post/${postId}`);
      alert("✅ Post deleted");
      loadScheduledPosts();
    } catch (error) {
      alert("❌ Failed to delete: " + (error.response?.data?.error || error.message));
    }
  };

  const resetForm = () => {
    setTitle("");
    setCaption("");
    setPlatforms([]);
    setScheduledFor("");
    setHashtags("");
    setType("text");
    setImageUrl("");
    setVideoUrl("");
    setEditingPost(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { color: "#3498db", icon: "⏰", text: "Scheduled" },
      posted: { color: "#27ae60", icon: "✓", text: "Posted" },
      failed: { color: "#e74c3c", icon: "✗", text: "Failed" },
      draft: { color: "#95a5a6", icon: "📝", text: "Draft" }
    };
    
    const badge = badges[status] || badges.draft;
    
    return (
      <span style={{ 
        backgroundColor: badge.color, 
        color: "white", 
        padding: "4px 12px", 
        borderRadius: "12px", 
        fontSize: "12px",
        fontWeight: "600"
      }}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h1>📅 Scheduled Posts</h1>
        <button 
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Schedule New Post
        </button>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {!loading && scheduledPosts.length === 0 && (
        <div className="empty-state">
          <h3>No scheduled posts yet</h3>
          <p>Create your first scheduled post to automate your social media!</p>
        </div>
      )}



{!loading && scheduledPosts.length > 0 && (
  <div className="posts-grid">
    {scheduledPosts.map(post => (
      <div key={post._id} className="schedule-card">
        <div className="card-header">
          {getStatusBadge(post.status)}
          <span className="scheduled-time">
            ⏰ {formatDate(post.scheduledFor)}
          </span>
        </div>

        {/* ✅ ADD: Media Preview Section */}
        {(post.image || post.videoUrl) && (
          <div className="card-media" style={{
            width: "100%",
            height: "200px",
            overflow: "hidden",
            backgroundColor: "#f0f0f0",
            borderRadius: "8px",
            marginBottom: "12px"
          }}>
            {post.type === "video" || post.videoUrl ? (
              <video 
                src={post.videoUrl} 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover" 
                }}
                controls
              />
            ) : (
              <img 
                src={post.image} 
                alt="Post preview"
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover" 
                }}
              />
            )}
          </div>
        )}

        <div className="card-body">
          <h3>{post.title || post.caption?.substring(0, 50) || "No title"}</h3>
          <p className="caption">{post.caption?.substring(0, 100)}</p>
          
          {/* ✅ ADD: Show media type badge */}
          <span style={{
            display: "inline-block",
            padding: "2px 8px",
            backgroundColor: post.type === "video" ? "#e91e63" : post.type === "image" ? "#2196f3" : "#9e9e9e",
            color: "white",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
            marginBottom: "8px"
          }}>
            {post.type === "video" ? "🎥 VIDEO" : post.type === "image" ? "📷 IMAGE" : "📝 TEXT"}
          </span>
          
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="hashtags">
              {post.hashtags.map((tag, i) => (
                <span key={i} className="hashtag">#{tag}</span>
              ))}
            </div>
          )}

          <div className="platforms">
            {post.platform?.map(platform => (
              <span key={platform} className={`platform-badge ${platform}`}>
                {platform === "twitter" && "🐦"}
                {platform === "facebook" && "👍"}
                {platform === "instagram" && "📷"}
                {" " + platform}
              </span>
            ))}
          </div>

          {post.platformResults && post.platformResults.length > 0 && (
            <div className="results">
              {post.platformResults.map((result, i) => (
                <div key={i} className={`result ${result.success ? 'success' : 'error'}`}>
                  {result.success ? "✓" : "✗"} {result.platform}: {result.success ? "Posted" : result.error}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-actions">
          <button 
            className="btn-edit"
            onClick={() => handleEdit(post)}
            disabled={post.status === "posted"}
          >
            ✏️ Edit
          </button>
          <button 
            className="btn-delete"
            onClick={() => handleDelete(post._id)}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    ))}
  </div>
)}


      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPost ? "Edit Scheduled Post" : "Schedule New Post"}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="schedule-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Your post caption... (mentions with @username, hashtags with #tag)"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Hashtags (comma or space separated)</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="marketing, socialmedia, startup"
                />
              </div>

              <div className="form-group">
                <label>Post Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="text">Text Only</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>

              {type === "image" && (
                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              {type === "video" && (
                <div className="form-group">
                  <label>Video URL</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div className="form-group">
                <label>Platforms *</label>
                <div className="platform-checkboxes">
                  {twitterConnected && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={platforms.includes("twitter")}
                        onChange={() => handlePlatformToggle("twitter")}
                      />
                      🐦 Twitter
                    </label>
                  )}
                  
                  {facebookConnected && (
                    <>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={platforms.includes("facebook")}
                          onChange={() => handlePlatformToggle("facebook")}
                        />
                        👍 Facebook
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={platforms.includes("instagram")}
                          onChange={() => handlePlatformToggle("instagram")}
                        />
                        📷 Instagram
                      </label>
                    </>
                  )}
                </div>
              </div>

              {(platforms.includes("facebook") || platforms.includes("instagram")) && pages.length > 0 && (
                <div className="form-group">
                  <label>Facebook Page *</label>
                  <select 
                    value={selectedPage} 
                    onChange={(e) => setSelectedPage(e.target.value)}
                    required
                  >
                    {pages.map(page => (
                      <option key={page.pageId} value={page.pageId}>
                        {page.pageName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Schedule For *</label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Saving..." : editingPost ? "Update Post" : "Schedule Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulePost;
