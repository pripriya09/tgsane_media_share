import React, { useEffect, useState } from "react";
import api from "./api";
import "./autopost.css"; // reuse your existing styles

function PostsHistory() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);

  useEffect(() => {
    loadPosts();
    loadPages();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/user/posts");
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error("Failed to load posts:", err);
      setError("Failed to load posts: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function loadPages() {
    try {
      const res = await api.get("/user/pages");
      setPages(res.data.pages || []);
    } catch (err) {
      console.warn("Failed to load pages:", err);
    }
  }

  async function handleDelete(postId) {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.delete(`/user/posts/${postId}`);
      alert("Post deleted successfully");
      loadPosts(); // refresh list
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Failed to delete: " + (err.response?.data?.error || err.message));
    }
  }

  function getPageName(pageId) {
    const page = pages.find(p => p.pageId === pageId);
    return page?.pageName || pageId;
  }

  function formatDate(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  }

  function getPostUrl(post) {
    // Build FB/IG post URLs if IDs exist
    if (post.fbPostId) {
      return `https://www.facebook.com/${post.fbPostId}`;
    }
    if (post.igMediaId) {
      return `https://www.instagram.com/p/${post.igMediaId}/`;
    }
    return null;
  }

  // NEW: Function to render where post was published
  function renderPostedTo(post) {
    const hasFB = !!post.fbPostId;
    const hasIG = !!post.igMediaId;

    if (hasFB && hasIG) {
      return (
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span style={{
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "11px",
            backgroundColor: "#1877f2",
            color: "#fff",
            fontWeight: "600"
          }}>
            Facebook
          </span>
          <span style={{
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "11px",
            background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            color: "#fff",
            fontWeight: "600"
          }}>
            Instagram
          </span>
        </div>
      );
    }
    
    if (hasFB) {
      return (
        <span style={{
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          backgroundColor: "#1877f2",
          color: "#fff",
          fontWeight: "600"
        }}>
          Facebook
        </span>
      );
    }
    
    if (hasIG) {
      return (
        <span style={{
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
          color: "#fff",
          fontWeight: "600"
        }}>
          Instagram
        </span>
      );
    }

    return <span style={{ color: "#999" }}>-</span>;
  }

  function renderMediaPreview(post) {
    if (post.type === "carousel" && post.items?.length) {
      return (
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {post.items.slice(0, 3).map((item, i) => (
            <img 
              key={i} 
              src={item.url} 
              alt={`item-${i}`}
              style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
            />
          ))}
          {post.items.length > 3 && <span>+{post.items.length - 3} more</span>}
        </div>
      );
    }
    if (post.type === "image" && post.image) {
      return <img src={post.image} alt="post" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }} />;
    }
    if (post.type === "video" && post.videoUrl) {
      return <video src={post.videoUrl} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }} />;
    }
    return <span>-</span>;
  }

  if (loading) return <div className="loading">Loading posts...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Posts History</h2>
      {posts.length === 0 ? (
        <p>No posts yet. Create your first post!</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
                <th style={thStyle}>Preview</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Page</th>
                <th style={thStyle}>Posted To</th> {/* NEW COLUMN */}
                <th style={thStyle}>Posted At</th>
                <th style={thStyle}>View Post</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post._id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={tdStyle}>{renderMediaPreview(post)}</td>
                  <td style={tdStyle}>{post.title || "-"}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      backgroundColor: post.type === "carousel" ? "#e3f2fd" : post.type === "video" ? "#fff3e0" : "#e8f5e9",
                      color: "#333"
                    }}>
                      {post.type}
                    </span>
                  </td>
                  <td style={tdStyle}>{getPageName(post.pageId)}</td>
                  <td style={tdStyle}>{renderPostedTo(post)}</td> {/* NEW CELL */}
                  <td style={tdStyle}>{formatDate(post.postedAt)}</td>
                  <td style={tdStyle}>
                    {getPostUrl(post) ? (
                      <a href={getPostUrl(post)} target="_blank" rel="noopener noreferrer" style={{ color: "#1976d2" }}>
                        View Post
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(post._id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px"
                      }}
                      onMouseOver={e => e.target.style.backgroundColor = "#d32f2f"}
                      onMouseOut={e => e.target.style.backgroundColor = "#f44336"}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "12px",
  fontWeight: "600",
  borderBottom: "2px solid #ddd"
};

const tdStyle = {
  padding: "12px",
  verticalAlign: "middle"
};

export default PostsHistory;
