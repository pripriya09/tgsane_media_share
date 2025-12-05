// AdminDashboard.jsx - ULTRA MODERN PROFESSIONAL VERSION
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    activeUsers: 0,
    adminUsers: 0,
    fbConnected: 0,
    igConnected: 0,
    postsToday: 0,
    postsThisWeek: 0
  });
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const navigate = useNavigate();

  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    password: "",
    role: "user"
  });

  const [editUser, setEditUser] = useState({
    name: "",
    username: "",
    password: "",
    role: "user"
  });

  useEffect(() => {
    checkAuth();
    loadAllData();
    const savedTheme = localStorage.getItem("adminTheme");
    if (savedTheme === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "light-mode";
    localStorage.setItem("adminTheme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const checkAuth = () => {
    const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
    if (!user?._id || (user.role !== "admin" && user.role !== "superAdmin")) {
      navigate("/login");
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [usersRes, postsRes, statsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/all-posts"),
        api.get("/admin/stats")
      ]);
      setUsers(usersRes.data.users || []);
      setAllPosts(postsRes.data.posts || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/create-user", newUser);
      setShowCreateUser(false);
      setNewUser({ name: "", username: "", password: "", role: "user" });
      loadAllData();
      showNotification("User created successfully", "success");
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to create user", "error");
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditUser({
      name: user.name,
      username: user.username,
      password: "",
      role: user.role
    });
    setShowEditUser(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        name: editUser.name,
        username: editUser.username,
        role: editUser.role
      };
      if (editUser.password) updateData.password = editUser.password;
      
      await api.put(`/admin/users/${editingUser._id}`, updateData);
      setShowEditUser(false);
      setEditingUser(null);
      loadAllData();
      showNotification("User updated successfully", "success");
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to update user", "error");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete "${username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      loadAllData();
      showNotification("User deleted successfully", "success");
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to delete user", "error");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/posts/${postId}`);
      loadAllData();
      showNotification("Post deleted successfully", "success");
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to delete post", "error");
    }
  };

  const showNotification = (message, type) => {
    // Simple notification - you can enhance this later
    alert(message);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard-modern ${darkMode ? "dark" : "light"}`}>
      
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">⚡</div>
            {sidebarOpen && <span className="logo-text">Admin Panel</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="nav-icon">📊</span>
            {sidebarOpen && <span className="nav-text">Overview</span>}
          </button>
          <button 
            className={`nav-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <span className="nav-icon">👥</span>
            {sidebarOpen && <span className="nav-text">Users</span>}
            {sidebarOpen && <span className="nav-badge">{users.length}</span>}
          </button>
          <button 
            className={`nav-btn ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            <span className="nav-icon">📝</span>
            {sidebarOpen && <span className="nav-text">Posts</span>}
            {sidebarOpen && <span className="nav-badge">{allPosts.length}</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="sidebar-action-btn"
            onClick={() => navigate("/home")}
          >
            <span className="nav-icon">🏠</span>
            {sidebarOpen && <span>Back to Home</span>}
          </button>
          <button 
            className="sidebar-action-btn theme-btn"
            onClick={() => setDarkMode(!darkMode)}
          >
            <span className="nav-icon">{darkMode ? "☀️" : "🌙"}</span>
            {sidebarOpen && <span>{darkMode ? "Light" : "Dark"} Mode</span>}
          </button>
          <button 
            className="sidebar-action-btn logout-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
          >
            <span className="nav-icon">🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`admin-main ${sidebarOpen ? "" : "expanded"}`}>
        
        {/* TOP BAR */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <h1 className="page-title">
              {activeTab === "overview" && "📊 Dashboard Overview"}
              {activeTab === "users" && "👥 User Management"}
              {activeTab === "posts" && "📝 Content Management"}
            </h1>
          </div>
          <div className="topbar-right">
            <div className="admin-badge-display">Administrator</div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="admin-content-area">

          {/* ========== OVERVIEW TAB ========== */}
          {activeTab === "overview" && (
            <div className="overview-container">
              
              {/* STATS GRID */}
              <div className="modern-stats-grid">
                <div className="stat-card-modern stat-blue">
                  <div className="stat-icon-circle">👥</div>
                  <div className="stat-details">
                    <h2>{stats.totalUsers}</h2>
                    <p>Total Users</p>
                  </div>
                  <div className="stat-trend">↑ 12%</div>
                </div>

                <div className="stat-card-modern stat-green">
                  <div className="stat-icon-circle">✅</div>
                  <div className="stat-details">
                    <h2>{stats.activeUsers}</h2>
                    <p>Active Users</p>
                    <span className="stat-subtitle">Last 7 days</span>
                  </div>
                  <div className="stat-trend">↑ 8%</div>
                </div>

                <div className="stat-card-modern stat-purple">
                  <div className="stat-icon-circle">📝</div>
                  <div className="stat-details">
                    <h2>{stats.totalPosts}</h2>
                    <p>Total Posts</p>
                  </div>
                  <div className="stat-trend">↑ 24%</div>
                </div>

                <div className="stat-card-modern stat-orange">
                  <div className="stat-icon-circle">🔥</div>
                  <div className="stat-details">
                    <h2>{stats.postsToday}</h2>
                    <p>Posts Today</p>
                  </div>
                  <div className="stat-trend">↑ 5%</div>
                </div>

                <div className="stat-card-modern stat-pink">
                  <div className="stat-icon-circle">📘</div>
                  <div className="stat-details">
                    <h2>{stats.fbConnected}</h2>
                    <p>Facebook</p>
                  </div>
                </div>

                <div className="stat-card-modern stat-cyan">
                  <div className="stat-icon-circle">📷</div>
                  <div className="stat-details">
                    <h2>{stats.igConnected}</h2>
                    <p>Instagram</p>
                  </div>
                </div>

                <div className="stat-card-modern stat-red">
                  <div className="stat-icon-circle">👑</div>
                  <div className="stat-details">
                    <h2>{stats.adminUsers}</h2>
                    <p>Admins</p>
                  </div>
                </div>

                <div className="stat-card-modern stat-teal">
                  <div className="stat-icon-circle">📅</div>
                  <div className="stat-details">
                    <h2>{stats.postsThisWeek}</h2>
                    <p>This Week</p>
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="quick-actions-modern">
                <h3 className="section-title">⚡ Quick Actions</h3>
                <div className="action-grid">
                  <button 
                    className="action-card action-primary"
                    onClick={() => {
                      setShowCreateUser(true);
                    }}
                  >
                    <span className="action-icon">➕</span>
                    <span className="action-text">Create User</span>
                  </button>
                  <button 
                    className="action-card action-secondary"
                    onClick={() => setActiveTab("users")}
                  >
                    <span className="action-icon">👥</span>
                    <span className="action-text">View Users</span>
                  </button>
                  <button 
                    className="action-card action-success"
                    onClick={() => setActiveTab("posts")}
                  >
                    <span className="action-icon">📝</span>
                    <span className="action-text">View Posts</span>
                  </button>
                  <button 
                    className="action-card action-warning"
                    onClick={loadAllData}
                  >
                    <span className="action-icon">🔄</span>
                    <span className="action-text">Refresh Data</span>
                  </button>
                </div>
              </div>

              {/* RECENT ACTIVITY */}
              <div className="activity-section-modern">
                <h3 className="section-title">🕒 Recent Activity</h3>
                <div className="activity-timeline">
                  {allPosts.slice(0, 5).map(post => (
                    <div key={post._id} className="activity-item-modern">
                      <div className="activity-avatar">
                        {(post.userId?.username || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="activity-content">
                        <p className="activity-title">
                          <strong>{post.userId?.username || "Unknown"}</strong> posted
                        </p>
                        <p className="activity-description">{post.title || "No caption"}</p>
                        <p className="activity-time">{new Date(post.postedAt).toLocaleString()}</p>
                      </div>
                      <div className="activity-badges">
                        {post.fbPostId && <span className="platform-badge fb-badge">FB</span>}
                        {post.igMediaId && <span className="platform-badge ig-badge">IG</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========== USERS TAB ========== */}
          {activeTab === "users" && (
            <div className="users-container-modern">
              <div className="content-header">
                <div className="header-left">
                  <h2 className="content-title">User Management</h2>
                  <p className="content-subtitle">{filteredUsers.length} users found</p>
                </div>
                <button 
                  className="btn-modern btn-primary-modern"
                  onClick={() => setShowCreateUser(true)}
                >
                  <span className="btn-icon">➕</span>
                  Create User
                </button>
              </div>

              {/* FILTERS */}
              <div className="filters-modern">
                <div className="search-box-modern">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="search-input-modern"
                  />
                </div>
                <select 
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                  className="filter-select-modern"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Users Only</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>

              {/* USERS TABLE */}
              <div className="table-modern-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Connections</th>
                      <th>Posts</th>
                      <th>Last Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user._id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-small">
                              {(user.username || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="user-name-cell">{user.username}</div>
                              <div className="user-email-cell">{user.name || "-"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`role-pill role-${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <div className="connection-badges">
                            {user.facebookId && <span className="conn-badge conn-fb">FB</span>}
                            {user.pages?.some(p => p.instagramBusinessId) && <span className="conn-badge conn-ig">IG</span>}
                          </div>
                        </td>
                        <td>
                          <span className="count-pill">{user.postsCount || 0}</span>
                        </td>
                        <td className="date-cell-modern">
                          {user.lastPostAt ? new Date(user.lastPostAt).toLocaleDateString() : "-"}
                        </td>
                        <td>
                          <div className="action-buttons-cell">
                            <button
                              className="icon-btn icon-btn-edit"
                              onClick={() => handleEditUser(user)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="icon-btn icon-btn-delete"
                              onClick={() => handleDeleteUser(user._id, user.username)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== POSTS TAB ========== */}
          {activeTab === "posts" && (
            <div className="posts-container-modern">
              <div className="content-header">
                <div className="header-left">
                  <h2 className="content-title">Content Management</h2>
                  <p className="content-subtitle">{allPosts.length} posts total</p>
                </div>
              </div>

              {/* POSTS MASONRY GRID */}
              <div className="posts-masonry-grid">
                {allPosts.map(post => (
                  <div key={post._id} className="post-card-modern">
                    {post.image && (
                      <div className="post-image-modern">
                        <img src={post.image} alt="Post" />
                        <button
                          className="delete-overlay-btn"
                          onClick={() => handleDeletePost(post._id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    <div className="post-content-modern">
                      <div className="post-user-info">
                        <div className="post-avatar-small">
                          {(post.userId?.username || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="post-author">{post.userId?.username || "Unknown"}</div>
                          <div className="post-time">{new Date(post.postedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <p className="post-caption">{post.title || "No caption"}</p>
                      <div className="post-meta-badges">
                        <span className="type-pill">{post.type || "image"}</span>
                        {post.fbPostId && <span className="platform-pill fb-pill">FB</span>}
                        {post.igMediaId && <span className="platform-pill ig-pill">IG</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ========== CREATE USER MODAL ========== */}
      {showCreateUser && (
        <div className="modal-backdrop-modern" onClick={() => setShowCreateUser(false)}>
          <div className="modal-dialog-modern" onClick={e => e.stopPropagation()}>
            <div className="modal-header-modern">
              <h3>➕ Create New User</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateUser(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="modal-form-modern">
              <div className="form-group-modern">
                <label>Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  required
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group-modern">
                <label>Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  required
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group-modern">
                <label>Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  required
                  placeholder="Enter password"
                />
              </div>
              <div className="form-group-modern">
                <label>Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions-modern">
                <button type="submit" className="btn-modern btn-primary-modern">Create User</button>
                <button type="button" className="btn-modern btn-secondary-modern" onClick={() => setShowCreateUser(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== EDIT USER MODAL ========== */}
      {showEditUser && editingUser && (
        <div className="modal-backdrop-modern" onClick={() => setShowEditUser(false)}>
          <div className="modal-dialog-modern" onClick={e => e.stopPropagation()}>
            <div className="modal-header-modern">
              <h3>✏️ Edit User: {editingUser.username}</h3>
              <button className="modal-close-btn" onClick={() => setShowEditUser(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="modal-form-modern">
              <div className="form-group-modern">
                <label>Name</label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={e => setEditUser({...editUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group-modern">
                <label>Username</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={e => setEditUser({...editUser, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group-modern">
                <label>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editUser.password}
                  onChange={e => setEditUser({...editUser, password: e.target.value})}
                  placeholder="Enter new password or leave empty"
                />
              </div>
              <div className="form-group-modern">
                <label>Role</label>
                <select
                  value={editUser.role}
                  onChange={e => setEditUser({...editUser, role: e.target.value})}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions-modern">
                <button type="submit" className="btn-modern btn-primary-modern">Save Changes</button>
                <button type="button" className="btn-modern btn-secondary-modern" onClick={() => setShowEditUser(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;
