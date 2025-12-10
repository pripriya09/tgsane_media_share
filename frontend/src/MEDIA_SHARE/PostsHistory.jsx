import React, { useEffect, useState } from "react";
import api from "./api";
import "./autopost.css";

function PostsHistory() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);
  const [filter, setFilter] = useState("all");

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
    if (!window.confirm("Are you sure you want to delete this post from history?")) return;

    try {
      await api.delete(`/user/posts/${postId}`);
      alert("✅ Post deleted from history successfully");
      loadPosts();
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("❌ Failed to delete: " + (err.response?.data?.error || err.message));
    }
  }

  // ✅ NEW: Repost function
  async function handleRepost(post) {
    const confirmMsg = post.type === "story"
      ? `Repost this story?\n\nThis will create a new Instagram Story (expires in 24hrs)`
      : `Repost this ${post.type}?\n\nTitle: ${post.title || 'No title'}\nType: ${post.type}\n\nThis will create a new post with the same content.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!user?._id) {
        alert("❌ You must be logged in to repost");
        return;
      }

      const postToFB = !!post.fbPostId;
      const postToIG = !!post.igMediaId;

      let response;

      if (post.type === "story") {
        response = await api.post("/user/story", {
          userId: user._id,
          pageId: post.pageId,
          type: post.videoUrl ? "video" : "image",
          image: post.image || null,
          videoUrl: post.videoUrl || null
        });
      } else if (post.type === "carousel") {
        response = await api.post("/user/post", {
          userId: user._id,
          pageId: post.pageId,
          title: post.title || "",
          type: "carousel",
          items: post.items,
          postToFB,
          postToIG
        });
      } else {
        response = await api.post("/user/post", {
          userId: user._id,
          pageId: post.pageId,
          title: post.title || "",
          type: post.type,
          image: post.image || null,
          videoUrl: post.videoUrl || null,
          postToFB,
          postToIG
        });
      }

      if (response.data.success) {
        alert(`✅ ${post.type === 'story' ? 'Story' : 'Post'} reposted successfully!`);
        loadPosts();
      } else {
        alert("❌ Failed to repost: " + JSON.stringify(response.data));
      }
    } catch (err) {
      console.error("Repost failed:", err);
      alert("❌ Repost failed: " + (err.response?.data?.error || err.message));
    }
  }

  // ✅ NEW: Edit function
  function handleEdit(post) {
    alert(
      "📝 Edit Feature Coming Soon!\n\n" +
      "This will allow you to edit:\n" +
      "• Title/Caption\n" +
      "• Scheduled time\n" +
      "• Target platforms\n\n" +
      "For now, use Repost to post the same content again."
    );
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
    if (post.type === "story") return null;
    if (post.fbPostId) return `https://www.facebook.com/${post.fbPostId}`;
    if (post.igMediaId) return `https://www.instagram.com/p/${post.igMediaId}/`;
    return null;
  }

  function renderPostedTo(post) {
    const hasFB = !!post.fbPostId;
    const hasIG = !!post.igMediaId;

    if (post.type === "story") {
      return (
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span style={{
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "11px",
            background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            color: "#fff",
            fontWeight: "600"
          }}>
            Instagram Story
          </span>
          <span style={{ fontSize: "11px", color: "#999" }}>(24hrs)</span>
        </div>
      );
    }

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
    if ((post.type === "video" || post.type === "story") && post.videoUrl) {
      return <video src={post.videoUrl} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }} />;
    }
    if (post.type === "story" && post.image) {
      return (
        <div style={{ position: "relative" }}>
          <img src={post.image} alt="story" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }} />
          <span style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            background: "#9c27b0",
            color: "white",
            fontSize: "10px",
            padding: "2px 4px",
            borderRadius: "3px",
            fontWeight: "600"
          }}>
            📖
          </span>
        </div>
      );
    }
    return <span>-</span>;
  }

  const filteredPosts = posts.filter(post => {
    if (filter === "stories") return post.type === "story";
    if (filter === "regular") return post.type !== "story";
    return true;
  });

  if (loading) return <div className="loading">Loading posts...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Posts History</h2>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "8px 16px",
              background: filter === "all" ? "#1976d2" : "#fff",
              color: filter === "all" ? "#fff" : "#333",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: filter === "all" ? "600" : "normal"
            }}
          >
            All ({posts.length})
          </button>
          <button
            onClick={() => setFilter("regular")}
            style={{
              padding: "8px 16px",
              background: filter === "regular" ? "#1976d2" : "#fff",
              color: filter === "regular" ? "#fff" : "#333",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: filter === "regular" ? "600" : "normal"
            }}
          >
            Posts ({posts.filter(p => p.type !== "story").length})
          </button>
          <button
            onClick={() => setFilter("stories")}
            style={{
              padding: "8px 16px",
              background: filter === "stories" ? "#9c27b0" : "#fff",
              color: filter === "stories" ? "#fff" : "#333",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: filter === "stories" ? "600" : "normal"
            }}
          >
            📖 Stories ({posts.filter(p => p.type === "story").length})
          </button>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <p>No {filter === "stories" ? "stories" : filter === "regular" ? "posts" : "content"} yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
                <th style={thStyle}>Preview</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Page</th>
                <th style={thStyle}>Posted To</th>
                <th style={thStyle}>Posted At</th>
                <th style={thStyle}>View</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map(post => (
                <tr key={post._id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={tdStyle}>{renderMediaPreview(post)}</td>
                  <td style={tdStyle}>{post.title || "-"}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      backgroundColor: 
                        post.type === "story" ? "#f3e5f5" :
                        post.type === "carousel" ? "#e3f2fd" : 
                        post.type === "video" ? "#fff3e0" : "#e8f5e9",
                      color: "#333",
                      fontWeight: post.type === "story" ? "600" : "normal"
                    }}>
                      {post.type === "story" ? "📖 Story" : post.type}
                    </span>
                  </td>
                  <td style={tdStyle}>{getPageName(post.pageId)}</td>
                  <td style={tdStyle}>{renderPostedTo(post)}</td>
                  <td style={tdStyle}>{formatDate(post.postedAt)}</td>
                  <td style={tdStyle}>
                    {post.type === "story" ? (
                      <span style={{ color: "#999", fontSize: "12px" }}>Expired</span>
                    ) : getPostUrl(post) ? (
                      <a href={getPostUrl(post)} target="_blank" rel="noopener noreferrer" style={{ color: "#1976d2" }}>
                        View Post
                      </a>
                    ) : "-"}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleRepost(post)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#2b81f1",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500"
                        }}
                        onMouseOver={e => e.target.style.backgroundColor = "#1877f2"}
                        onMouseOut={e => e.target.style.backgroundColor = "#2b81f1"}
                      >
                        🔄 Repost
                      </button>
                      <button
                        onClick={() => handleEdit(post)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#dc2743",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500"
                        }}
                        onMouseOver={e => e.target.style.backgroundColor = "#cc2366"}
                        onMouseOut={e => e.target.style.backgroundColor = "#dc2743"}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(post._id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500"
                        }}
                        onMouseOver={e => e.target.style.backgroundColor = "#d32f2f"}
                        onMouseOut={e => e.target.style.backgroundColor = "#f44336"}
                      >
                        🗑️ Delete
                      </button>
                    </div>
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
