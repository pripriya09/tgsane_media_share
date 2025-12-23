import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./autopost.css";

function SchedulePost() {
  const [activeTab, setActiveTab] = useState("scheduled"); // scheduled, drafts
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadScheduledPosts();
    loadDrafts();
  }, []);

  // ===== SCHEDULED POSTS =====
  async function loadScheduledPosts() {
    try {
      setLoading(true);
      const response = await api.get("/user/scheduled-posts");
      setScheduledPosts(response.data.posts || []);
    } catch (error) {
      console.error("Failed to load scheduled posts:", error);
    } finally {
      setLoading(false);
    }
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

  // ===== DRAFTS =====
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

  // ===== UPLOAD BUTTON - Go to CreatePost =====
  const handleQuickUpload = () => {
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

  if (loading) {
    return (
      <div className="schedule-container">
        <div className="loading">Loading your content...</div>
      </div>
    );
  }

  return (
    <div className="schedule-container">
      {/* ✅ HEADER WITH UPLOAD BUTTON */}
      <div className="schedule-header">
        <div>
          <h1> Content Manager</h1>
          <p>Manage scheduled posts and drafts</p>
        </div>
        {/* <button 
          className="btn-primary upload-btn-top"
          onClick={handleQuickUpload}
        >
          ➕ Quick Upload
        </button> */}
      </div>

      {/* ✅ TABS - Scheduled + Drafts ONLY */}
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
          {/* ✅ CREATE BUTTON - Always visible at top left */}
          <button 
            className="btn-create-top-left"
            onClick={handleQuickUpload}
          >
            ➕ New Scheduled Post
          </button>

          {scheduledPosts.length === 0 ? (
            // ✅ EMPTY STATE - centered
            <div className="empty-state-centered">
              <div className="empty-icon">⏰</div>
              <h3>No scheduled posts yet</h3>
              <p>Click the button above to create your first scheduled post</p>
            </div>
          ) : (
            // ✅ POSTS GRID - with cards
            <div className="posts-grid">
              {scheduledPosts.map(post => (
                <div key={post._id} className="schedule-card">
                  <div className="card-header">
                    {getStatusBadge(post.status)}
                    <span className="scheduled-time">
                      ⏰ {formatDate(post.scheduledFor)}
                    </span>
                  </div>

                  {/* Media Preview */}
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

                  <div className="card-actions">
                    <button 
                      className="btn-edit"
                      onClick={() => alert("Edit feature coming soon - will open in CreatePost")}
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
        </div>
      )}

      {/* ✅ DRAFTS TAB */}
      {activeTab === "drafts" && (
        <div className="posts-container">
          {/* ✅ CREATE BUTTON - Always visible at top left */}
          <button 
            className="btn-create-top-left"
            onClick={handleQuickUpload}
          >
            ➕ New Draft
          </button>

          {drafts.length === 0 ? (
            // ✅ EMPTY STATE - centered
            <div className="empty-state-centered">
              <div className="empty-icon">📝</div>
              <h3>No drafts yet</h3>
              <p>Click the button above to create your first draft</p>
            </div>
          ) : (
            // ✅ POSTS GRID - with cards
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
    </div>
  );
}

export default SchedulePost;
