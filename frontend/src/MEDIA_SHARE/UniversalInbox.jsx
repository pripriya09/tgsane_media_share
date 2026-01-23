// UniversalInbox.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from './api';
import './inbox.css';

const UniversalInbox = () => {
  // Platform & Account States
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('all');
  
  // Data States
  const [allComments, setAllComments] = useState([]);
  const [filteredComments, setFilteredComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Interaction States
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('all'); // all, unread, replied
  const commentsPerPage = 20;

  useEffect(() => {
    initializeInbox();
  }, []);

  useEffect(() => {
    filterCommentsByPlatform();
  }, [selectedPlatform, selectedPageId, allComments, filterType]);

  // ============================================
  // INITIALIZATION
  // ============================================
  
  const initializeInbox = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get user profile with all connected platforms
      const response = await api.get('/user/profile');
      const profile = response.data.profile;
      
      setConnectedPlatforms({
        facebook: profile.facebook.connected,
        instagram: profile.facebook.pages?.some(p => p.instagramBusinessId),
        twitter: profile.twitter.connected,
        linkedin: profile.linkedin.connected,
        youtube: profile.youtube.connected
      });
      
      // Load Facebook pages
      if (profile.facebook.connected) {
        setFacebookPages(profile.facebook.pages || []);
      }
      
      // Load all comments from all platforms
      await loadAllComments();
      
    } catch (error) {
      console.error('Initialization error:', error);
      setError('Failed to initialize inbox');
    }
    
    setLoading(false);
  };

  // ============================================
  // LOAD COMMENTS FROM ALL PLATFORMS
  // ============================================
  
  const loadAllComments = async () => {
    setLoading(true);
    const comments = [];
    
    try {
      // Load Facebook Comments
      if (connectedPlatforms.facebook) {
        const fbComments = await loadFacebookComments();
        comments.push(...fbComments);
      }
      
      // Load Instagram Comments
      if (connectedPlatforms.instagram) {
        const igComments = await loadInstagramComments();
        comments.push(...igComments);
      }
      
      // Load Twitter Replies
      if (connectedPlatforms.twitter) {
        const twComments = await loadTwitterReplies();
        comments.push(...twComments);
      }
      
      // Load LinkedIn Comments
      if (connectedPlatforms.linkedin) {
        const liComments = await loadLinkedInComments();
        comments.push(...liComments);
      }
      
      // Load YouTube Comments
      if (connectedPlatforms.youtube) {
        const ytComments = await loadYouTubeComments();
        comments.push(...ytComments);
      }
      
      // Sort by date (newest first)
      comments.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
      
      setAllComments(comments);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Load comments error:', error);
      setError('Failed to load some comments');
    }
    
    setLoading(false);
  };

  // ============================================
  // FACEBOOK COMMENTS LOADER
  // ============================================
  
  const loadFacebookComments = async () => {
    const comments = [];
    
    try {
      const pagesResponse = await api.get('/user/pages');
      const pages = pagesResponse.data.pages || [];
      
      for (const page of pages) {
        try {
          const postsResponse = await axios.get(
            `https://graph.facebook.com/v24.0/${page.pageId}/published_posts`,
            {
              params: {
                access_token: page.pageAccessToken,
                fields: 'id,message,created_time,comments{id,message,from,created_time,comments{id,message,from,created_time}}',
                limit: 10
              }
            }
          );
          
          const posts = postsResponse.data.data || [];
          
          posts.forEach(post => {
            const postComments = post.comments?.data || [];
            postComments.forEach(comment => {
              comments.push({
                id: comment.id,
                platform: 'facebook',
                pageId: page.pageId,
                pageName: page.pageName,
                postId: post.id,
                message: comment.message,
                from: comment.from,
                created_time: comment.created_time,
                replies: comment.comments?.data || [],
                isRead: false
              });
            });
          });
          
        } catch (pageError) {
          console.error(`Error loading comments for page ${page.pageName}:`, pageError);
        }
      }
      
    } catch (error) {
      console.error('Facebook comments error:', error);
    }
    
    return comments;
  };

  // ============================================
  // INSTAGRAM COMMENTS LOADER
  // ============================================
  
  const loadInstagramComments = async () => {
    const comments = [];
    
    try {
      const pagesResponse = await api.get('/user/pages');
      const pages = pagesResponse.data.pages || [];
      
      for (const page of pages) {
        if (!page.instagramBusinessId) continue;
        
        try {
          const mediaResponse = await axios.get(
            `https://graph.facebook.com/v24.0/${page.instagramBusinessId}/media`,
            {
              params: {
                access_token: page.pageAccessToken,
                fields: 'id,caption,timestamp,comments{id,text,username,timestamp,replies{id,text,username,timestamp}}',
                limit: 10
              }
            }
          );
          
          const media = mediaResponse.data.data || [];
          
          media.forEach(post => {
            const postComments = post.comments?.data || [];
            postComments.forEach(comment => {
              comments.push({
                id: comment.id,
                platform: 'instagram',
                pageId: page.pageId,
                pageName: page.pageName,
                instagramUsername: page.instagramUsername,
                postId: post.id,
                message: comment.text,
                from: { name: comment.username },
                created_time: comment.timestamp,
                replies: comment.replies?.data || [],
                isRead: false
              });
            });
          });
          
        } catch (pageError) {
          console.error(`Error loading Instagram comments for ${page.pageName}:`, pageError);
        }
      }
      
    } catch (error) {
      console.error('Instagram comments error:', error);
    }
    
    return comments;
  };

  // ============================================
  // TWITTER REPLIES LOADER (Placeholder)
  // ============================================
  
  const loadTwitterReplies = async () => {
    // TODO: Implement Twitter API to fetch mentions/replies
    return [];
  };

  // ============================================
  // LINKEDIN COMMENTS LOADER (Placeholder)
  // ============================================
  
  const loadLinkedInComments = async () => {
    // TODO: Implement LinkedIn API to fetch comments
    return [];
  };

  // ============================================
  // YOUTUBE COMMENTS LOADER (Placeholder)
  // ============================================
  
  const loadYouTubeComments = async () => {
    // TODO: Implement YouTube API to fetch comments
    return [];
  };

  // ============================================
  // FILTER COMMENTS BY PLATFORM & PAGE
  // ============================================
  
  const filterCommentsByPlatform = () => {
    let filtered = [...allComments];
    
    // Filter by platform
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(c => c.platform === selectedPlatform);
    }
    
    // Filter by Facebook page
    if (selectedPlatform === 'facebook' && selectedPageId !== 'all') {
      filtered = filtered.filter(c => c.pageId === selectedPageId);
    }
    
    // Filter by Instagram account
    if (selectedPlatform === 'instagram' && selectedPageId !== 'all') {
      filtered = filtered.filter(c => c.pageId === selectedPageId);
    }
    
    // Filter by type (all/unread/replied)
    if (filterType === 'unread') {
      filtered = filtered.filter(c => !c.isRead);
    } else if (filterType === 'replied') {
      filtered = filtered.filter(c => c.replies && c.replies.length > 0);
    }
    
    setFilteredComments(filtered);
    setCurrentPage(1); // Reset to first page
  };

  // ============================================
  // REPLY HANDLERS
  // ============================================
  
  const handleReply = async (comment) => {
    if (!replyText.trim()) {
      alert('Please enter a reply message');
      return;
    }
    
    try {
      if (comment.platform === 'facebook') {
        await replyToFacebookComment(comment);
      } else if (comment.platform === 'instagram') {
        await replyToInstagramComment(comment);
      }
      // Add other platforms...
      
      setReplyingTo(null);
      setReplyText('');
      await loadAllComments();
      alert('✅ Reply sent!');
      
    } catch (error) {
      console.error('Reply error:', error);
      alert('❌ Failed to send reply');
    }
  };

  const replyToFacebookComment = async (comment) => {
    const pagesResponse = await api.get('/user/pages');
    const page = pagesResponse.data.pages.find(p => p.pageId === comment.pageId);
    
    await axios.post(
      `https://graph.facebook.com/v24.0/${comment.id}/comments`,
      { message: replyText },
      { params: { access_token: page.pageAccessToken } }
    );
  };

  const replyToInstagramComment = async (comment) => {
    const pagesResponse = await api.get('/user/pages');
    const page = pagesResponse.data.pages.find(p => p.pageId === comment.pageId);
    
    await axios.post(
      `https://graph.facebook.com/v24.0/${comment.id}/replies`,
      { message: replyText },
      { params: { access_token: page.pageAccessToken } }
    );
  };

  // ============================================
  // DELETE HANDLER
  // ============================================
  
  const handleDelete = async (comment) => {
    if (!window.confirm('Delete this comment?')) return;
    
    try {
      if (comment.platform === 'facebook') {
        const pagesResponse = await api.get('/user/pages');
        const page = pagesResponse.data.pages.find(p => p.pageId === comment.pageId);
        
        await axios.delete(
          `https://graph.facebook.com/v24.0/${comment.id}`,
          { params: { access_token: page.pageAccessToken } }
        );
      }
      // Add other platforms...
      
      await loadAllComments();
      alert('✅ Comment deleted!');
      
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Failed to delete comment');
    }
  };

  // ============================================
  // PAGINATION
  // ============================================
  
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = filteredComments.slice(indexOfFirstComment, indexOfLastComment);
  const totalPages = Math.ceil(filteredComments.length / commentsPerPage);

  // ============================================
  // PLATFORM ICONS
  // ============================================
  
  const getPlatformIcon = (platform) => {
    const icons = {
      facebook: '📘',
      instagram: '📷',
      twitter: '🐦',
      linkedin: '💼',
      youtube: '📺'
    };
    return icons[platform] || '💬';
  };

  const getPlatformColor = (platform) => {
    const colors = {
      facebook: '#1877f2',
      instagram: '#e4405f',
      twitter: '#1da1f2',
      linkedin: '#0077b5',
      youtube: '#ff0000'
    };
    return colors[platform] || '#666';
  };

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="universal-inbox">
      
      {/* HEADER */}
      <div className="inbox-header">
        <div className="inbox-header-left">
          <h1>📬 Universal Inbox</h1>
          <p>Manage all your comments in one place</p>
        </div>
        <div className="inbox-header-right">
          <button onClick={loadAllComments} className="btn-refresh" disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* PLATFORM FILTER */}
      <div className="platform-filter-bar">
        <div className="filter-section">
          <label>Platform:</label>
          <div className="platform-tabs">
            <button
              className={`platform-tab ${selectedPlatform === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('all')}
            >
              All ({allComments.length})
            </button>
            {connectedPlatforms.facebook && (
              <button
                className={`platform-tab ${selectedPlatform === 'facebook' ? 'active' : ''}`}
                onClick={() => setSelectedPlatform('facebook')}
              >
                📘 Facebook ({allComments.filter(c => c.platform === 'facebook').length})
              </button>
            )}
            {connectedPlatforms.instagram && (
              <button
                className={`platform-tab ${selectedPlatform === 'instagram' ? 'active' : ''}`}
                onClick={() => setSelectedPlatform('instagram')}
              >
                📷 Instagram ({allComments.filter(c => c.platform === 'instagram').length})
              </button>
            )}
            {connectedPlatforms.twitter && (
              <button
                className={`platform-tab ${selectedPlatform === 'twitter' ? 'active' : ''}`}
                onClick={() => setSelectedPlatform('twitter')}
              >
                🐦 Twitter ({allComments.filter(c => c.platform === 'twitter').length})
              </button>
            )}
            {connectedPlatforms.linkedin && (
              <button
                className={`platform-tab ${selectedPlatform === 'linkedin' ? 'active' : ''}`}
                onClick={() => setSelectedPlatform('linkedin')}
              >
                💼 LinkedIn ({allComments.filter(c => c.platform === 'linkedin').length})
              </button>
            )}
            {connectedPlatforms.youtube && (
              <button
                className={`platform-tab ${selectedPlatform === 'youtube' ? 'active' : ''}`}
                onClick={() => setSelectedPlatform('youtube')}
              >
                📺 YouTube ({allComments.filter(c => c.platform === 'youtube').length})
              </button>
            )}
          </div>
        </div>

        {/* PAGE SELECTOR (for Facebook/Instagram) */}
        {(selectedPlatform === 'facebook' || selectedPlatform === 'instagram') && facebookPages.length > 0 && (
          <div className="filter-section">
            <label>Page:</label>
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="page-selector"
            >
              <option value="all">All Pages</option>
              {facebookPages.map(page => (
                <option key={page.pageId} value={page.pageId}>
                  {page.pageName}
                  {selectedPlatform === 'instagram' && page.instagramUsername && ` (@${page.instagramUsername})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* TYPE FILTER */}
        <div className="filter-section">
          <label>Filter:</label>
          <div className="type-filters">
            <button
              className={`type-filter ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`type-filter ${filterType === 'unread' ? 'active' : ''}`}
              onClick={() => setFilterType('unread')}
            >
              Unread
            </button>
            <button
              className={`type-filter ${filterType === 'replied' ? 'active' : ''}`}
              onClick={() => setFilterType('replied')}
            >
              Replied
            </button>
          </div>
        </div>
      </div>

      {/* COMMENTS LIST */}
      <div className="comments-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading comments...</p>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Comments Yet</h3>
            <p>
              {selectedPlatform === 'all'
                ? 'No comments found across all platforms'
                : `No comments found on ${selectedPlatform}`}
            </p>
          </div>
        ) : (
          <>
            <div className="comments-list">
              {currentComments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  
                  {/* Platform Badge */}
                  <div 
                    className="platform-badge"
                    style={{ backgroundColor: getPlatformColor(comment.platform) }}
                  >
                    {getPlatformIcon(comment.platform)} {comment.platform.toUpperCase()}
                    {comment.pageName && (
                      <span className="page-name"> • {comment.pageName}</span>
                    )}
                  </div>

                  {/* Comment Content */}
                  <div className="comment-content">
                    <div className="comment-avatar">
                      {comment.from?.name?.[0]?.toUpperCase() || '👤'}
                    </div>
                    
                    <div className="comment-body">
                      <div className="comment-header">
                        <strong>{comment.from?.name || 'User'}</strong>
                        <span className="comment-time">
                          {new Date(comment.created_time).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="comment-message">
                        {comment.message}
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="replies-section">
                          <div className="replies-header">
                            💬 {comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}
                          </div>
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="reply-item">
                              <div className="reply-avatar">
                                {reply.from?.name?.[0]?.toUpperCase() || reply.username?.[0]?.toUpperCase() || '👤'}
                              </div>
                              <div className="reply-content">
                                <strong>{reply.from?.name || reply.username || 'User'}</strong>
                                <p>{reply.message || reply.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Box */}
                      {replyingTo === comment.id ? (
                        <div className="reply-box">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply..."
                            rows="3"
                          />
                          <div className="reply-actions">
                            <button onClick={() => handleReply(comment)} className="btn-send">
                              Send Reply
                            </button>
                            <button onClick={() => setReplyingTo(null)} className="btn-cancel">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="comment-actions">
                          <button onClick={() => setReplyingTo(comment.id)} className="btn-reply">
                            💬 Reply
                          </button>
                          <button onClick={() => handleDelete(comment)} className="btn-delete">
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-page"
                >
                  ← Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-page"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UniversalInbox;
