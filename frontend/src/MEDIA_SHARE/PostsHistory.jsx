import React, { useEffect, useState } from "react";
import api from "./api";
import "./postshistory.css";

function PostsHistory() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);
  const [filter, setFilter] = useState("all");
  
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [newCaption, setNewCaption] = useState("");
  const [postToFB, setPostToFB] = useState(true);
  const [postToIG, setPostToIG] = useState(true);
  const [postToTwitter, setPostToTwitter] = useState(false); // ✅ ADD
  const [reposting, setReposting] = useState(false);
  const [selectedPage, setSelectedPage] = useState(""); 
  const [postToStory, setPostToStory] = useState(false);
  
  // ✅ ADD: Missing Twitter state variables
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState("");

  useEffect(() => {
    loadPosts();
    loadPages();
    checkTwitterConnection();
  }, []);

  // ✅ Check Twitter connection
  async function checkTwitterConnection() {
    try {
      const response = await api.get('/user/twitter/status');
      if (response.data.success && response.data.connected) {
        setTwitterConnected(true);
        setTwitterUsername(response.data.username || '');
      }
    } catch (error) {
      console.error('Error checking Twitter status:', error);
    }
  }

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

  function openRepostModal(post) {
    setSelectedPost(post);
    setNewCaption(post.title || post.caption || "");
    
    const initialPage = post.pageId || (pages.length > 0 ? pages[0].pageId : "");
    setSelectedPage(initialPage);
    
    const pageHasIG = pages.find(p => p.pageId === initialPage)?.instagramBusinessId;
    
    setPostToFB(!!post.fbPostId);
    setPostToIG(!!post.igMediaId && pageHasIG);
    setPostToTwitter(!!post.tweetId);
    setPostToStory(false);
    setShowRepostModal(true);
  }

  function closeRepostModal() {
    setShowRepostModal(false);
    setSelectedPost(null);
    setNewCaption("");
    setPostToFB(true);
    setPostToIG(true);
    setPostToTwitter(false);
    setPostToStory(false);
    setSelectedPage("");
    setReposting(false);
  }


async function handleRepostSubmit() {
  if (!selectedPost) return;

  const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
  if (!user?._id) {
    alert("❌ You must be logged in to repost");
    return;
  }

  if (!postToFB && !postToIG && !postToStory && !postToTwitter) {
    alert("❌ Please select at least one platform");
    return;
  }

  if ((postToFB || postToIG || postToStory) && !selectedPage) {
    alert("❌ Please select a Facebook page");
    return;
  }

  setReposting(true);

  try {
    let response;

    // ✅ Handle Instagram Story
    if (postToStory || selectedPost.type === "story") {
      const page = pages.find(p => p.pageId === selectedPage);
      if (!page?.instagramBusinessId) {
        alert("❌ Instagram not connected to this page");
        setReposting(false);
        return;
      }

      response = await api.post("/user/story", {
        userId: user._id,
        pageId: selectedPage,
        type: selectedPost.videoUrl ? "video" : "image",
        image: selectedPost.image || null,
        videoUrl: selectedPost.videoUrl || null
      });
    }
    // ✅ Handle ALL Regular Posts (including carousel) - ONE API CALL
    else {
      const payload = {
        userId: user._id,
        title: newCaption,
        type: selectedPost.type,
        image: selectedPost.image || null,
        videoUrl: selectedPost.videoUrl || null,
        postToFB,
        postToIG,
        postToTwitter: selectedPost.type === "carousel" ? false : postToTwitter // Disable Twitter for carousel
      };

      // Add pageId only if posting to FB/IG
      if (postToFB || postToIG) {
        payload.pageId = selectedPage;
      }

      // Add carousel items
      if (selectedPost.type === "carousel") {
        payload.items = selectedPost.items;
        
        if (postToTwitter) {
          alert("⚠️ Note: Carousel posts cannot be posted to Twitter. Will post to FB/IG only.");
        }
      }

      // ✅ ONE API CALL - Posts to ALL selected platforms
      response = await api.post("/user/post", payload);
    }

    if (response.data.success) {
      const platforms = [];
      
      if (postToStory || selectedPost.type === 'story') {
        platforms.push("Instagram Story");
      } else {
        const results = response.data.results;
        if (postToFB && (results?.fb?.id || results?.fb?.post_id)) platforms.push("Facebook");
        if (postToIG && results?.ig?.id) platforms.push("Instagram");
        if (postToTwitter && results?.twitter?.id) platforms.push("Twitter");
      }

      const postType = postToStory || selectedPost.type === 'story' ? 'Story' : 'Post';
      alert(`✅ ${postType} reposted successfully to: ${platforms.join(", ")}!`);
      loadPosts();
      closeRepostModal();
    } else {
      alert("❌ Failed to repost: " + (response.data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Repost failed:", err);
    alert("❌ Repost failed: " + (err.response?.data?.error || err.message));
  } finally {
    setReposting(false);
  }
}

  function getPageName(pageId) {
    if (!pageId) return "";
    const page = pages.find(p => p.pageId === pageId);
    return page?.pageName || pageId;
  }

  function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleString();
  }

  function getPostUrl(post) {
    if (post.type === "story") return null;
    if (post.fbPostId) return `https://www.facebook.com/${post.fbPostId}`;
    if (post.igMediaId) return `https://www.instagram.com/p/${post.igMediaId}/`;
    if (post.tweetId) return `https://twitter.com/i/web/status/${post.tweetId}`;
    return null;
  }

  function renderPostedTo(post) {
    const hasFB = !!post.fbPostId;
    const hasIG = !!post.igMediaId;
    const hasTwitter = !!post.tweetId;
    const platforms = post.platform || [];

    if (post.type === "story") {
      return (
        <div className="posted-to-container">
          <span className="platform-badge story-badge">Instagram Story</span>
          <span className="story-duration">(24hrs)</span>
        </div>
      );
    }

    const badges = [];
    
    if (hasFB || platforms.includes('facebook')) {
      badges.push(<span key="fb" className="platform-badge fb-badge">Facebook</span>);
    }
    
    if (hasIG || platforms.includes('instagram')) {
      badges.push(<span key="ig" className="platform-badge ig-badge">Instagram</span>);
    }
    
    if (hasTwitter || platforms.includes('twitter')) {
      badges.push(<span key="tw" className="platform-badge tw-badge">Twitter</span>);
    }

    if (badges.length === 0) {
      return <span className="no-platform">-</span>;
    }

    return <div className="posted-to-container">{badges}</div>;
  }

  function renderMediaPreview(post) {
    if (post.type === "carousel" && post.items?.length) {
      return (
        <div className="carousel-preview">
          {post.items.slice(0, 3).map((item, i) => (
            <img key={i} src={item.url} alt={`item-${i}`} className="carousel-thumb" />
          ))}
          {post.items.length > 3 && <span>+{post.items.length - 3} more</span>}
        </div>
      );
    }
    if (post.type === "image" && post.image) {
      return <img src={post.image} alt="post" className="media-preview" />;
    }
    if ((post.type === "video" || post.type === "story") && post.videoUrl) {
      return <video src={post.videoUrl} className="media-preview" />;
    }
    if (post.type === "story" && post.image) {
      return (
        <div className="story-preview-wrapper">
          <img src={post.image} alt="story" className="media-preview" />
          <span className="story-icon-badge">📖</span>
        </div>
      );
    }
    return <span>-</span>;
  }

  const filteredPosts = posts.filter(post => {
    if (filter === "stories") return post.type === "story";
    if (filter === "regular") return post.type !== "story";
    if (filter === "scheduled") return post.status === "scheduled";
    if (filter === "posted") return post.status === "posted";
    return true;
  });

  if (loading) return <div className="loading">Loading posts...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="posts-history-container">
      <div className="posts-header">
        <h2>Posts History</h2>
        
        <div className="filter-buttons">
          <button
            onClick={() => setFilter("all")}
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
          >
            All ({posts.length})
          </button>
          <button
            onClick={() => setFilter("posted")}
            className={`filter-btn ${filter === "posted" ? "active" : ""}`}
          >
            ✅ Posted ({posts.filter(p => p.status === "posted" || !p.status).length})
          </button>
          <button
            onClick={() => setFilter("scheduled")}
            className={`filter-btn ${filter === "scheduled" ? "active" : ""}`}
          >
            ⏰ Scheduled ({posts.filter(p => p.status === "scheduled").length})
          </button>
          <button
            onClick={() => setFilter("stories")}
            className={`filter-btn filter-stories ${filter === "stories" ? "active" : ""}`}
          >
            📖 Stories ({posts.filter(p => p.type === "story").length})
          </button>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <p className="no-content">No {filter === "stories" ? "stories" : filter === "scheduled" ? "scheduled posts" : filter === "posted" ? "posted content" : "content"} yet.</p>
      ) : (
        <div className="table-wrapper">
          <table className="posts-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Type</th>
                <th>Page</th>
                <th>Posted To</th>
                <th>Posted At</th>
                <th>View</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map(post => (
                <tr key={post._id}>
                  <td>{renderMediaPreview(post)}</td>
                  {/* ✅ ADD: Truncate title with tooltip */}
                  <td className="title-cell" title={post.title || post.caption || "-"}>
                    {post.title || post.caption || "-"}
                  </td>
                  <td>
                    <span className={`type-badge ${post.type === "story" ? "type-story" : post.type === "carousel" ? "type-carousel" : post.type === "video" ? "type-video" : "type-image"}`}>
                      {post.type === "story" ? "📖 Story" : post.type}
                    </span>
                  </td>
                  <td className="page-cell">{getPageName(post.pageId)}</td>
                  <td>{renderPostedTo(post)}</td>
                  <td>
                    {post.status === "scheduled" ? (
                      <span className="scheduled-for">
                        🕐 {formatDate(post.scheduledFor)}
                      </span>
                    ) : (
                      formatDate(post.postedAt)
                    )}
                  </td>
                  <td>
                    {post.type === "story" ? (
                      (() => {
                        const createdAt = new Date(post.createdAt || post.postedAt);
                        const now = new Date();
                        
                        if (isNaN(createdAt.getTime())) {
                          return <span className="story-status expired">⏰ Expired</span>;
                        }
                        
                        const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);
                        const isExpired = hoursElapsed >= 24;

                        if (isExpired) {
                          return <span className="story-status expired">⏰ Expired</span>;
                        } else {
                          const hoursLeft = Math.floor(24 - hoursElapsed);
                          return <span className="story-status active">✓ Active ({hoursLeft}h left)</span>;
                        }
                      })()
                    ) : post.status === "scheduled" ? (
                      <span className="pending-view">⏳ Pending</span>
                    ) : getPostUrl(post) ? (
                      <a href={getPostUrl(post)} target="_blank" rel="noopener noreferrer" className="view-link">
                        View →
                      </a>
                    ) : (
                      <span className="no-view">-</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => openRepostModal(post)} 
                        className="btn-repost"
                        disabled={post.status === "scheduled"}
                      >
                        {/* <span className="btn-icon">🔄</span> */}
                        Repost
                      </button>
                      
                      <button onClick={() => handleDelete(post._id)} className="btn-delete">
                        {/* <span className="btn-icon">🗑️</span> */}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPOST MODAL */}
      {showRepostModal && selectedPost && (
        <div className="modal-overlay">
          <div className="modal-gradient-border">
            <div className="modal-content">
              {/* Header */}
              <div className="modal-header">
                <h2 className="modal-title">🔄 Repost Content</h2>
                <button onClick={closeRepostModal} className="modal-close">×</button>
              </div>

              {/* Preview */}
              <div className="modal-preview">
                <div>{renderMediaPreview(selectedPost)}</div>
                <div className="preview-info">
                  <div className="preview-type">
                    {selectedPost.type === "story" ? "📖 Story" : selectedPost.type}
                  </div>
                  <div className="preview-title">
                    {selectedPost.title || "(No caption)"}
                  </div>
                </div>
              </div>

              {/* Caption Editor */}
              {selectedPost.type !== "story" && (
                <div className="caption-editor">
                  <label className="editor-label">✏️ Edit Caption</label>
                  <textarea
                    value={newCaption}
                    onChange={e => setNewCaption(e.target.value)}
                    placeholder="Enter your caption here..."
                    className="caption-textarea"
                  />
                </div>
              )}

              {/* Platform Selection */}
              {selectedPost.type !== "story" && (
                <div className="platform-selection">
                  <label className="selection-label">📱 Select Where to Post</label>
                  
                  {/* Facebook Checkbox */}
                  <label className={`platform-checkbox ${postToFB ? "checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={postToFB}
                      onChange={e => {
                        setPostToFB(e.target.checked);
                        if (!e.target.checked) {
                          const currentPage = pages.find(p => p.pageId === selectedPage);
                          if (!currentPage?.instagramBusinessId) {
                            setPostToIG(false);
                          }
                        }
                      }}
                    />
                    <span className="platform-icon">📘</span>
                    <span className="platform-name">Facebook Post</span>
                  </label>

                  {/* Page Selection */}
                  {postToFB && pages.length > 0 && (
                    <div className="page-selector">
                      <label className="page-label">Select Facebook Page</label>
                      <select
                        value={selectedPage}
                        onChange={e => {
                          const newPageId = e.target.value;
                          setSelectedPage(newPageId);
                          
                          const newPage = pages.find(p => p.pageId === newPageId);
                          if (!newPage?.instagramBusinessId && postToIG) {
                            setPostToIG(false);
                            setTimeout(() => {
                              alert(`ℹ️ This page doesn't have Instagram connected.\n\nInstagram posting has been disabled.`);
                            }, 100);
                          }
                        }}
                        className="page-select"
                      >
                        {pages.map(page => (
                          <option key={page.pageId} value={page.pageId}>
                            {page.pageName} {page.instagramBusinessId ? "📸" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="page-hint">📸 = Instagram connected</div>
                    </div>
                  )}

                  {/* Instagram Checkbox */}
                  <label className={`platform-checkbox ${postToIG ? "checked" : ""} ${(() => {
                    const currentPage = pages.find(p => p.pageId === selectedPage);
                    return !selectedPage || !currentPage?.instagramBusinessId ? "disabled" : "";
                  })()}`}>
                    <input
                      type="checkbox"
                      checked={postToIG}
                      disabled={(() => {
                        const currentPage = pages.find(p => p.pageId === selectedPage);
                        return !selectedPage || !currentPage?.instagramBusinessId;
                      })()}
                      onChange={e => {
                        const currentPage = pages.find(p => p.pageId === selectedPage);
                        if (!currentPage?.instagramBusinessId) {
                          alert("❌ Selected page doesn't have Instagram connected.\n\nPlease select a page with Instagram or connect Instagram to this page first.");
                          return;
                        }
                        setPostToIG(e.target.checked);
                      }}
                    />
                    <span className="platform-icon">📸</span>
                    <div className="platform-text">
                      <div className="platform-name">Instagram Post</div>
                      {(() => {
                        const currentPage = pages.find(p => p.pageId === selectedPage);
                        if (!selectedPage || !currentPage?.instagramBusinessId) {
                          return (
                            <div className="platform-hint">
                              {!selectedPage ? "Select a Facebook page first" : "No Instagram connected to this page"}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </label>

                  {/* Instagram Story Option */}
                  {(selectedPost.type === "image" || selectedPost.type === "video") && selectedPost.type !== "carousel" && (
                    <label className={`platform-checkbox story-checkbox ${postToStory ? "checked" : ""} ${(() => {
                      const currentPage = pages.find(p => p.pageId === selectedPage);
                      return !selectedPage || !currentPage?.instagramBusinessId ? "disabled" : "";
                    })()}`}>
                      <input
                        type="checkbox"
                        checked={postToStory}
                        disabled={(() => {
                          const currentPage = pages.find(p => p.pageId === selectedPage);
                          return !selectedPage || !currentPage?.instagramBusinessId;
                        })()}
                        onChange={e => {
                          const currentPage = pages.find(p => p.pageId === selectedPage);
                          if (!currentPage?.instagramBusinessId) {
                            alert("❌ Instagram Story requires Instagram connection.\n\nPlease select a page with Instagram connected.");
                            return;
                          }
                          setPostToStory(e.target.checked);
                          if (e.target.checked) {
                            setPostToIG(false);
                            setPostToFB(false);
                          }
                        }}
                      />
                      <span className="platform-icon">📖</span>
                      <div className="platform-text">
                        <div className="platform-name">Instagram Story</div>
                        <div className="platform-hint">
                          {(() => {
                            const currentPage = pages.find(p => p.pageId === selectedPage);
                            if (!selectedPage || !currentPage?.instagramBusinessId) {
                              return !selectedPage ? "Select a Facebook page first" : "No Instagram connected";
                            }
                            return "Expires in 24 hours • Instagram only";
                          })()}
                        </div>
                      </div>
                    </label>
                  )}

                  {/* ✅ Twitter Checkbox */}
                  {twitterConnected && (
                    <label className={`platform-checkbox ${postToTwitter ? "checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={postToTwitter}
                        onChange={e => setPostToTwitter(e.target.checked)}
                      />
                      {/* <span className="platform-icon">🐦</span> */}
                      <div className="platform-text">
                        <div className="platform-name">Twitter</div>
                        <div className="platform-hint">@{twitterUsername}</div>
                      </div>
                    </label>
                  )}

                  {/* Warning */}
                  {!postToFB && !postToIG && !postToStory && !postToTwitter && (
                    <div className="platform-warning">
                      ⚠️ Please select at least one platform
                    </div>
                  )}
                </div>
              )}

              {/* Story Info */}
              {selectedPost.type === "story" && (
                <div className="story-info-box">
                  <span className="story-info-icon">📖</span>
                  <span>Instagram Story • Expires in 24 hours</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-actions">
                <button onClick={closeRepostModal} disabled={reposting} className="btn-cancel">
                  Cancel
                </button>
                <button
                  onClick={handleRepostSubmit}
                  disabled={reposting || (!postToFB && !postToIG && !postToStory && !postToTwitter)}
                  className={`btn-submit ${postToStory ? "story-submit" : ""} ${reposting || (!postToFB && !postToIG && !postToStory && !postToTwitter) ? "disabled" : ""}`}
                >
                  {reposting ? (
                    <>
                      <span className="spinner" />
                      Posting...
                    </>
                  ) : (
                    <>{postToStory ? "📖 Post Story" : "🚀 Post Now"}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostsHistory;
