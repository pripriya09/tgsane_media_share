import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./autopost.css";

function SchedulePost() {
  const [activeTab, setActiveTab] = useState("scheduled");
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ NEW: Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({
    caption: "",
    scheduledFor: "",
    platforms: {
      fb: false,
      ig: false,
      twitter: false,
      linkedin: false,
    },
    hashtags: ""
  });

  useEffect(() => {
    loadScheduledPosts();
    loadDrafts();
  }, []);

  async function loadScheduledPosts() {
    try {
      setLoading(true);
      const response = await api.get("/user/scheduled-posts");
      const allPosts = response.data.posts || [];
      
      // ✅ FILTER: Only show posts with status "scheduled"
      // Hide "posted" and "failed" posts (they're in PostsHistory now)
      const activePosts = allPosts.filter(post => post.status === "scheduled");
      
      setScheduledPosts(activePosts);
      
      console.log(`📋 Loaded ${activePosts.length} scheduled posts (${allPosts.length} total)`);
    } catch (error) {
      console.error("Failed to load scheduled posts:", error);
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: Open edit modal
  function handleEdit(post) {
    setEditingPost(post);
    
    // Format date for datetime-local input
    const date = new Date(post.scheduledFor);
    const formattedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    
    setEditForm({
      caption: post.caption || "",
      scheduledFor: formattedDate,
      platforms: {
        fb: post.platform?.includes("facebook") || false,
        ig: post.platform?.includes("instagram") || false,
        twitter: post.platform?.includes("twitter") || false,
        linkedin: post.platform?.includes("linkedin") || false,
      },
      hashtags: post.hashtags?.join(", ") || ""
    });
    
    setShowEditModal(true);
  }

  // ✅ NEW: Handle form changes
  function handleEditChange(field, value) {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }

  function handlePlatformToggle(platform) {
    setEditForm(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: !prev.platforms[platform]
      }
    }));
  }

  // ✅ NEW: Submit edit
  async function submitEdit() {
    if (!editForm.caption.trim()) {
      alert("❌ Caption cannot be empty");
      return;
    }

    if (!editForm.scheduledFor) {
      alert("❌ Please select a date and time");
      return;
    }

    const scheduleDate = new Date(editForm.scheduledFor);
    if (scheduleDate <= new Date()) {
      alert("❌ Scheduled time must be in the future");
      return;
    }

    const selectedPlatforms = Object.keys(editForm.platforms)
      .filter(key => editForm.platforms[key])
      .map(p => p === "fb" ? "facebook" : p === "ig" ? "instagram" : p);

    if (selectedPlatforms.length === 0) {
      alert("❌ Select at least one platform");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        caption: editForm.caption,
        title: editForm.caption.substring(0, 100),
        scheduledFor: scheduleDate.toISOString(),
        platform: selectedPlatforms,
        hashtags: editForm.hashtags
          .split(/[,\s]+/)
          .filter(tag => tag.trim())
          .map(tag => tag.replace("#", "")),
        // Keep original media
        type: editingPost.type,
        image: editingPost.image,
        videoUrl: editingPost.videoUrl,
        selectedPages: editingPost.selectedPages,
      };

      await api.put(`/user/schedule-post/${editingPost._id}`, payload);

      alert("✅ Post updated successfully!");
      setShowEditModal(false);
      setEditingPost(null);
      loadScheduledPosts();

    } catch (error) {
      alert("❌ Failed to update: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: Duplicate post (for changing media)
  function handleDuplicate(post) {
    localStorage.setItem("duplicatePost", JSON.stringify({
      caption: post.caption,
      type: post.type,
      platforms: {
        fb: post.platform?.includes("facebook") || false,
        ig: post.platform?.includes("instagram") || false,
        twitter: post.platform?.includes("twitter") || false,
        linkedin: post.platform?.includes("linkedin") || false,
      }
    }));
    
    alert("📋 Post details copied! Now upload new media in Create Post.");
    navigate("/home/create");
  }

  async function handleDelete(postId) {
    if (!window.confirm("Delete this scheduled post?")) return;
    try {
      await api.delete(`/user/schedule-post/${postId}`);
      alert("✅ Post deleted");
      loadScheduledPosts();
    } catch (error) {
      alert("❌ Failed to delete: " + (error.response?.data?.error || error.message));
    }
  }

  // ... (keep existing drafts functions)
  async function loadDrafts() {
    const localDrafts = JSON.parse(localStorage.getItem("postDrafts") || "[]");
    setDrafts(localDrafts);
  }

  async function deleteDraft(draftId) {
    if (!window.confirm("Delete this draft?")) return;
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    localStorage.setItem("postDrafts", JSON.stringify(updatedDrafts));
    setDrafts(updatedDrafts);
    alert("✅ Draft deleted!");
  }

  function editDraft(draft) {
    localStorage.setItem("editDraft", JSON.stringify(draft));
    navigate("/home/create");
  }

  const handleQuickUpload = () => {
    localStorage.removeItem("editScheduledPost");
    localStorage.removeItem("editDraft");
    localStorage.removeItem("duplicatePost");
    navigate("/home/create");
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

  if (loading && scheduledPosts.length === 0) {
    return (
      <div className="schedule-container">
        <div className="loading">Loading your content...</div>
      </div>
    );
  }

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div>
          <h1>📅 Content Manager</h1>
          <p>Manage scheduled posts and drafts</p>
        </div>
      </div>

      <div className="content-tabs">
        <button 
          className={`tab-btn ${activeTab === "scheduled" ? "active" : ""}`}
          onClick={() => setActiveTab("scheduled")}
        >
          ⏰ Scheduled ({scheduledPosts.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === "drafts" ? "active" : ""}`}
          onClick={() => setActiveTab("drafts")}
        >
          📝 Drafts ({drafts.length})
        </button>
      </div>

      {/* ✅ SCHEDULED POSTS TAB */}
      {activeTab === "scheduled" && (
        <div className="posts-container">
          <button 
            className="btn-create-top-left"
            onClick={handleQuickUpload}
          >
            ➕ New Scheduled Post
          </button>

          {scheduledPosts.length === 0 ? (
            <div className="empty-state-centered">
              <div className="empty-icon">⏰</div>
              <h3>No scheduled posts yet</h3>
              <p>Click the button above to create your first scheduled post</p>
            </div>
          ) : (
            <div className="posts-grid">
              {scheduledPosts.map(post => (
                <div key={post._id} className="schedule-card">
                  <div className="card-header">
                    {getStatusBadge(post.status)}
                    <span className="scheduled-time">
                      ⏰ {formatDate(post.scheduledFor)}
                    </span>
                  </div>

                  {(post.image || post.videoUrl) && (
                    <div className="card-media">
                      {post.type === "video" || post.videoUrl ? (
                        <video src={post.videoUrl} style={{ width: "100%", height: "200px", objectFit: "cover" }} controls />
                      ) : (
                        <img src={post.image} alt="Post preview" style={{ width: "100%", height: "200px", objectFit: "cover" }} />
                      )}
                    </div>
                  )}

                  <div className="card-body">
                    <h3>{post.title || post.caption?.substring(0, 50) || "No title"}</h3>
                    <p className="caption">{post.caption?.substring(0, 100)}</p>
                    
                    <span className="type-badge">
                      {post.type === "video" ? "🎥 VIDEO" : post.type === "image" ? "📷 IMAGE" : "📝 TEXT"}
                    </span>

                    <div className="platforms">
                      {post.platform?.map(platform => (
                        <span key={platform} className={`platform-badge ${platform}`}>
                          {platform === "twitter" && "🐦"}
                          {platform === "facebook" && "👍"}
                          {platform === "instagram" && "📷"}
                          {platform === "linkedin" && "💼"}
                          {" " + platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ✅ UPDATED ACTION BUTTONS */}
                  <div className="card-actions">
                    {post.status === "scheduled" ? (
                      <>
                        <button 
                          className="btn-edit"
                          onClick={() => handleEdit(post)}
                          title="Edit caption, time, and platforms"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn-secondary"
                          onClick={() => handleDuplicate(post)}
                          title="Duplicate with new media"
                        >
                          📋 Duplicate
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(post._id)}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    ) : (
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(post._id)}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ✅ DRAFTS TAB (unchanged) */}
      {activeTab === "drafts" && (
        <div className="posts-container">
          <button 
            className="btn-create-top-left"
            onClick={handleQuickUpload}
          >
            ➕ New Draft
          </button>

          {drafts.length === 0 ? (
            <div className="empty-state-centered">
              <div className="empty-icon">📝</div>
              <h3>No drafts yet</h3>
              <p>Click the button above to create your first draft</p>
            </div>
          ) : (
            <div className="posts-grid">
              {drafts.map(draft => (
                <div key={draft.id} className="schedule-card draft-card">
                  <div className="card-media">
                    {draft.type === "video" ? (
                      <video src={draft.url} style={{ width: "100%", height: "200px", objectFit: "cover" }} />
                    ) : (
                      <img src={draft.url} alt="Draft preview" style={{ width: "100%", height: "200px", objectFit: "cover" }} />
                    )}
                  </div>

                  <div className="card-body">
                    <h3>{draft.caption?.substring(0, 50) || "No caption"}</h3>
                    <div className="draft-meta">
                      <span>Draft • {new Date(draft.savedAt).toLocaleDateString()}</span>
                      <div className="platforms">
                        {draft.platforms?.fb && <span>📘</span>}
                        {draft.platforms?.ig && <span>📸</span>}
                        {draft.platforms?.twitter && <span>🐦</span>}
                        {draft.platforms?.linkedin && <span>💼</span>}
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button 
                      className="btn-edit"
                      onClick={() => editDraft(draft)}
                    >
                      ✏️ Continue Editing
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => deleteDraft(draft.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ✅ EDIT MODAL */}
      {showEditModal && editingPost && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Scheduled Post</h2>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Media Preview (read-only) */}
              <div className="edit-media-preview">
                <label style={{ fontSize: "14px", fontWeight: "600", color: "#666", marginBottom: "8px", display: "block" }}>
                  📸 Media (cannot be changed - use Duplicate instead)
                </label>
                {(editingPost.image || editingPost.videoUrl) && (
                  <div style={{ 
                    position: "relative",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "#f5f5f5"
                  }}>
                    {editingPost.videoUrl ? (
                      <video 
                        src={editingPost.videoUrl} 
                        style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }}
                        controls 
                      />
                    ) : (
                      <img 
                        src={editingPost.image} 
                        alt="Post media" 
                        style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }}
                      />
                    )}
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0,0,0,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none"
                    }}>
                      <span style={{
                        backgroundColor: "rgba(0,0,0,0.7)",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        fontSize: "12px"
                      }}>
                        🔒 Media Locked
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="form-group">
                <label>Caption *</label>
                <textarea
                  value={editForm.caption}
                  onChange={(e) => handleEditChange("caption", e.target.value)}
                  rows={4}
                  placeholder="Write your caption here..."
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* Date & Time */}
              <div className="form-group">
                <label>📅 Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  value={editForm.scheduledFor}
                  onChange={(e) => handleEditChange("scheduledFor", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}
                />
              </div>

              {/* Platforms */}
              <div className="form-group">
                <label>📱 Platforms *</label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <label style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: `2px solid ${editForm.platforms.fb ? "#1877f2" : "#ddd"}`,
                    backgroundColor: editForm.platforms.fb ? "#e7f3ff" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}>
                    <input
                      type="checkbox"
                      checked={editForm.platforms.fb}
                      onChange={() => handlePlatformToggle("fb")}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span>👍 Facebook</span>
                  </label>

                  <label style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: `2px solid ${editForm.platforms.ig ? "#e4405f" : "#ddd"}`,
                    backgroundColor: editForm.platforms.ig ? "#ffe7ec" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}>
                    <input
                      type="checkbox"
                      checked={editForm.platforms.ig}
                      onChange={() => handlePlatformToggle("ig")}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span>📷 Instagram</span>
                  </label>

                  <label style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: `2px solid ${editForm.platforms.twitter ? "#1da1f2" : "#ddd"}`,
                    backgroundColor: editForm.platforms.twitter ? "#e7f6ff" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}>
                    <input
                      type="checkbox"
                      checked={editForm.platforms.twitter}
                      onChange={() => handlePlatformToggle("twitter")}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span>🐦 Twitter</span>
                  </label>

                  <label style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: `2px solid ${editForm.platforms.linkedin ? "#0077b5" : "#ddd"}`,
                    backgroundColor: editForm.platforms.linkedin ? "#e7f2f8" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}>
                    <input
                      type="checkbox"
                      checked={editForm.platforms.linkedin}
                      onChange={() => handlePlatformToggle("linkedin")}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span>💼 LinkedIn</span>
                  </label>
                </div>
              </div>

              {/* Hashtags */}
              <div className="form-group">
                <label>🏷️ Hashtags (optional)</label>
                <input
                  type="text"
                  value={editForm.hashtags}
                  onChange={(e) => handleEditChange("hashtags", e.target.value)}
                  placeholder="marketing, social, tech"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}
                />
                <small style={{ color: "#666", fontSize: "12px" }}>
                  Separate with commas or spaces
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-save"
                onClick={submitEdit}
                disabled={loading}
              >
                {loading ? "⏳ Updating..." : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulePost;
