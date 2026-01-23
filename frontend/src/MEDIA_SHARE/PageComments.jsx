import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from './api';
import './postshistory.css';

const PageComments = () => {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(null);
  const [comments, setComments] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageTokens, setPageTokens] = useState({});
  const [showPosts, setShowPosts] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get('/user/profile');
      const profile = response.data.profile;
      
      if (!profile.facebook.connected) {
        setError('Facebook account not connected. Please connect your Facebook account first.');
        setLoading(false);
        return;
      }

      if (!profile.facebook.pages || profile.facebook.pages.length === 0) {
        setError('No Facebook Pages found.');
        setLoading(false);
        return;
      }

      setPages(profile.facebook.pages);
      
      const pagesResponse = await api.get('/user/pages');
      const tokensMap = {};
      if (pagesResponse.data.pages) {
        pagesResponse.data.pages.forEach(page => {
          tokensMap[page.pageId] = page.pageAccessToken;
        });
      }
      setPageTokens(tokensMap);
      
    } catch (error) {
      console.error('Error fetching pages:', error);
      setError('Failed to load Facebook Pages.');
    }
    
    setLoading(false);
  };

  const fetchPageContent = async (page) => {
    setLoading(true);
    setError('');
    setCurrentPage(page);
    
    if (!selectedPages.find(p => p.pageId === page.pageId)) {
      setSelectedPages([...selectedPages, page]);
    }
    
    try {
      const accessToken = pageTokens[page.pageId];
      
      if (!accessToken) {
        setError('No access token found. Please reconnect Facebook.');
        setLoading(false);
        return;
      }
      
      // Fetch comments with nested replies
      const postsResponse = await axios.get(
        `https://graph.facebook.com/v24.0/${page.pageId}/published_posts`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,message,created_time,comments{id,message,from,created_time,comments{id,message,from,created_time}}',
            limit: 10
          }
        }
      );

      const postsData = postsResponse.data.data || [];
      setPosts(postsData);
      
      // Process comments and include replies
      const allComments = postsData.flatMap(post => {
        const topLevelComments = post.comments?.data || [];
        
        return topLevelComments.map(comment => ({
          ...comment,
          replies: comment.comments?.data || []
        }));
      });
      
      setComments(allComments);
      setLastUpdated(new Date());
      setError('');
      
    } catch (error) {
      console.error('Error fetching content:', error);
      if (error.response?.data?.error?.message) {
        setError(`Facebook Error: ${error.response.data.error.message}`);
      } else {
        setError('Failed to load page content.');
      }
    }
    
    setLoading(false);
  };

  const removeSelectedPage = (pageId) => {
    const newSelectedPages = selectedPages.filter(p => p.pageId !== pageId);
    setSelectedPages(newSelectedPages);
    
    if (currentPage?.pageId === pageId) {
      if (newSelectedPages.length > 0) {
        fetchPageContent(newSelectedPages[0]);
      } else {
        setCurrentPage(null);
        setComments([]);
        setPosts([]);
      }
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const accessToken = pageTokens[currentPage.pageId];
      
      await axios.delete(
        `https://graph.facebook.com/v24.0/${commentId}`,
        {
          params: { access_token: accessToken }
        }
      );

      await fetchPageContent(currentPage);
      alert('✅ Comment deleted successfully!');
      
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Failed to delete comment: ' + (error.response?.data?.error?.message || error.message));
    }
  };

  const handleReplyComment = async (comment) => {
    setReplyingTo(comment.id);
    setReplyText('');
  };

  const submitReply = async (commentId) => {
    if (!replyText.trim()) {
      alert('Please enter a reply message');
      return;
    }

    try {
      const accessToken = pageTokens[currentPage.pageId];
      
      await axios.post(
        `https://graph.facebook.com/v24.0/${commentId}/comments`,
        {
          message: replyText
        },
        {
          params: { access_token: accessToken }
        }
      );

      setReplyingTo(null);
      setReplyText('');
      
      await fetchPageContent(currentPage);
      
      alert('✅ Reply posted successfully!');
      
    } catch (error) {
      console.error('Reply error:', error);
      alert('❌ Failed to post reply: ' + (error.response?.data?.error?.message || error.message));
    }
  };

  const handleEditComment = async (comment) => {
    alert('ℹ️ Note: You can only edit comments made by your Page, not visitor comments.\n\nFor visitor comments, you can:\n• Reply to them\n• Delete them (if inappropriate)\n• Hide them');
  };

  const getPageColorClass = (index) => {
    const colors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'color-6'];
    return colors[index % colors.length];
  };

  return (
    <div className="comments-manager-container">
      <div className="comments-manager-wrapper">
        
        {/* HEADER WITH SECURITY BADGE */}
        <div className="cm-header">
          <div className="cm-header-content">
            <div className="cm-header-icon">💬</div>
            <div className="cm-header-text">
              <h1>
                Comments Manager
                <span className="version-badge">v1.0</span>
              </h1>
              <p>Manage all comments and posts from your Facebook Pages</p>
            </div>
          </div>
          <div className="security-badge">
            <span>🔒</span>
            <span>Secure Facebook Connection</span>
          </div>
        </div>

        {/* SELECTED PAGES BAR */}
        {selectedPages.length > 0 && (
          <div className="selected-pages-bar">
            <div className="selected-pages-header">
              <h3>📌 Selected Pages ({selectedPages.length})</h3>
              <button
                onClick={() => {
                  setSelectedPages([]);
                  setCurrentPage(null);
                  setComments([]);
                  setPosts([]);
                }}
                className="btn-clear-all"
              >
                Clear All
              </button>
            </div>

            <div className="page-dropdown-wrapper">
              <label className="page-dropdown-label">📄 Viewing Comments From:</label>
              <select
                value={currentPage?.pageId || ''}
                onChange={(e) => {
                  const page = selectedPages.find(p => p.pageId === e.target.value);
                  if (page) fetchPageContent(page);
                }}
                className="page-dropdown"
              >
                {selectedPages.map((page) => (
                  <option key={page.pageId} value={page.pageId}>
                    {page.pageName}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="selected-pages-badges">
              {selectedPages.map((page, idx) => {
                const isActive = currentPage?.pageId === page.pageId;
                
                return (
                  <div
                    key={page.pageId}
                    className={`page-badge ${getPageColorClass(idx)} ${isActive ? 'active' : ''}`}
                  >
                    <span className="page-badge-name">{page.pageName}</span>
                    <button
                      onClick={() => removeSelectedPage(page.pageId)}
                      className="page-badge-remove"
                      title="Remove this page"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="error-message">
            <div className="error-icon">⚠</div>
            <p>{error}</p>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && selectedPages.length === 0 && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading Facebook Pages...</p>
            <p className="loading-subtitle">Connecting to Facebook Graph API v24.0</p>
          </div>
        )}

        {/* PAGES GRID */}
        {!loading && pages.length > 0 && selectedPages.length === 0 && (
          <div className="pages-grid-container">
            <div className="pages-grid-header">
              <h2>📄 Select Facebook Pages</h2>
              <div className="pages-count-badge">
                {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
              </div>
            </div>
            
            <div className="pages-grid">
              {pages.map((page, idx) => (
                <button
                  key={page.pageId}
                  onClick={() => fetchPageContent(page)}
                  className="page-card"
                  title={`Click to manage ${page.pageName}`}
                >
                  <div className="page-card-content">
                    <div className={`page-card-icon ${getPageColorClass(idx)}`}>
                      {page.pageName[0]}
                    </div>
                    <div className="page-card-info">
                      <h3>{page.pageName}</h3>
                      {page.hasInstagramProfile && (
                        <div className="instagram-badge">
                          📷 @{page.instagramUsername}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LOADING PAGE CONTENT */}
        {loading && selectedPages.length > 0 && (
          <div className="loading-container">
            <div className="spinner spinner-pink"></div>
            <p>Loading content from <span className="highlight">{currentPage?.pageName}</span>...</p>
            <p className="loading-subtitle">Fetching comments and user interactions via Facebook API</p>
          </div>
        )}

        {/* COMMENTS SECTION */}
        {selectedPages.length > 0 && !loading && currentPage && (
          <div className="content-section">
            
            <div className="comments-section">
              <div className="section-header">
                <div className="section-header-left">
                  <h2>💬 Visitor Comments</h2>
                  <p>From <span className="highlight">{currentPage.pageName}</span></p>
                  <p className="permission-note">
                    📡 Using <strong>pages_read_user_content</strong> permission to read user comments
                  </p>
                </div>
                <div className="section-header-right">
                  {comments.length > 0 && (
                    <div className="count-badge comments-badge">
                      {comments.length}
                    </div>
                  )}
                  {lastUpdated && (
                    <div className="last-updated">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
              
              {comments.length === 0 ? (
                <div className="empty-state comments-empty">
                  <div className="empty-icon">📭</div>
                  <p className="empty-title">No Comments Yet</p>
                  <p className="empty-subtitle">Encourage followers to comment on your posts!</p>
                </div>
              ) : (
                <div className="comments-list">
                  {comments.map((comment) => (
                    <div key={comment.id} className="comment-card">
                      <div className="comment-content">
                        <div className="comment-avatar">
                          {comment.from?.name?.[0]?.toUpperCase() || '👤'}
                        </div>
                        <div className="comment-body">
                          <div className="comment-header">
                            <h3>
                              {comment.from?.name || 'Facebook User'}
                              {!comment.from?.name && (
                                <span className="privacy-note">(Name Hidden - Privacy Restricted)</span>
                              )}
                            </h3>
                            <div className="comment-date">
                              {new Date(comment.created_time).toLocaleDateString()} {new Date(comment.created_time).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="comment-message">
                            {comment.message}
                          </div>
                          
                          {/* SHOW REPLIES */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="replies-container">
                              <div className="replies-header">
                                💬 {comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}
                              </div>
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="reply-item">
                                  <div className="reply-avatar">
                                    {reply.from?.name?.[0]?.toUpperCase() || '👤'}
                                  </div>
                                  <div className="reply-content">
                                    <div className="reply-header">
                                      <strong>
                                        {reply.from?.name || 'Facebook User'}
                                      </strong>
                                      <span className="reply-date">
                                        {new Date(reply.created_time).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="reply-message">{reply.message}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* REPLY INPUT */}
                          {replyingTo === comment.id ? (
                            <div className="reply-box">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write your reply..."
                                className="reply-textarea"
                              />
                              <div className="reply-actions">
                                <button
                                  onClick={() => submitReply(comment.id)}
                                  className="btn-reply-submit"
                                >
                                  Send Reply
                                </button>
                                <button
                                  onClick={() => setReplyingTo(null)}
                                  className="btn-reply-cancel"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="comment-actions">
                              <button
                                onClick={() => handleReplyComment(comment)}
                                className="action-btn btn-reply"
                                title="Reply to this comment"
                              >
                                <span>💬</span>
                                <span>Reply</span>
                              </button>
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="action-btn btn-edit"
                                title="Edit comment (Page only)"
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="action-btn btn-delete"
                                title="Delete this comment"
                              >
                                <span>🗑️</span>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* POSTS SECTION - COLLAPSIBLE */}
            <div className="posts-section">
              <div 
                className="posts-toggle-header"
                onClick={() => setShowPosts(!showPosts)}
              >
                <div className="posts-toggle-left">
                  <h2>📝 Recent Posts</h2>
                  {posts.length > 0 && (
                    <div className="count-badge posts-badge">
                      {posts.length}
                    </div>
                  )}
                </div>
                <button className="toggle-arrow" title={showPosts ? "Collapse posts" : "Expand posts"}>
                  {showPosts ? '▼' : '▶'}
                </button>
              </div>
              
              {showPosts && (
                <div className="posts-list">
                  {posts.length === 0 ? (
                    <div className="empty-state posts-empty">
                      <div className="empty-icon">📭</div>
                      <p className="empty-title">No Posts Found</p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} className="post-card">
                        <div className="post-header">
                          <div className="post-date">
                            {new Date(post.created_time).toLocaleDateString()}
                          </div>
                          <div className="post-comments-count">
                            <span>💬</span>
                            <span>{post.comments?.data?.length || 0}</span>
                          </div>
                        </div>
                        <div className="post-message">
                          {post.message || <span className="post-no-text">(Media post - no text)</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* FOOTER */}
        <div className="cm-footer">
          <div className="footer-content">
            <span>Powered by </span>
            <strong className="facebook-brand">Facebook for Developers</strong>
            <span> • Data fetched via Facebook Graph API v24.0</span>
          </div>
          <div className="footer-permissions">
            🔐 Using permissions: <strong>pages_read_user_content</strong>, <strong>pages_manage_posts</strong>, <strong>pages_show_list</strong>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PageComments;
