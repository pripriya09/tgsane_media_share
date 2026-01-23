// AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./admindashboard.css";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const navigate = useNavigate();

  // Create user form state
  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    password: "",
    role: "user"
  });

  // Edit user form state
  const [editUser, setEditUser] = useState({
    name: "",
    username: "",
    password: "",
    role: "user"
  });

  // ✅ SHARED MEDIA STATE
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [adminMediaItems, setAdminMediaItems] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFileInputKey, setMediaFileInputKey] = useState(0);
  const [mediaFilterType, setMediaFilterType] = useState("all");

  useEffect(() => {
    checkAuth();
    loadUserStats();
    loadAdminMedia(); // ✅ Load admin media
  }, []);

  const checkAuth = () => {
    const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
    if (!user?._id || (user.role !== "admin" && user.role !== "superAdmin")) {
      navigate("/login");
    }
  };

  const loadUserStats = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/user-stats");
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to load users: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOAD ADMIN SHARED MEDIA
  const loadAdminMedia = async () => {
    try {
      const res = await api.get("/admin/shared-media");
      setAdminMediaItems(res.data.media || []);
    } catch (err) {
      console.error("Failed to load admin media:", err);
    }
  };

  // ✅ HANDLE ADMIN MEDIA UPLOAD
  const handleAdminMediaUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("media", file);

      try {
        setUploadProgress(0);
        await api.post("/admin/shared-media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        });
      } catch (err) {
        alert(`❌ Upload failed for ${file.name}: ` + (err.response?.data?.error || err.message));
        return;
      }
    }

    alert(`✅ ${files.length} file(s) uploaded to shared gallery!`);
    loadAdminMedia();
    setUploadProgress(0);
    setMediaFileInputKey(prev => prev + 1);
  };

  // ✅ HANDLE DELETE ADMIN MEDIA
  const handleDeleteAdminMedia = async (mediaId, mediaName) => {
    if (!window.confirm(`Delete "${mediaName}" from shared gallery?\n\nThis will remove it from ALL users' galleries.`)) return;

    try {
      await api.delete(`/admin/shared-media/${mediaId}`);
      alert("✅ Media deleted from all users!");
      loadAdminMedia();
    } catch (err) {
      alert("❌ Delete failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/create-user", newUser);
      alert("✅ User created successfully!");
      setShowCreateUser(false);
      setNewUser({ name: "", username: "", password: "", role: "user" });
      loadUserStats();
    } catch (err) {
      alert("Failed to create user: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEditUser = async (user) => {
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
      if (editUser.password) {
        updateData.password = editUser.password;
      }

      await api.put(`/admin/users/${editingUser._id}`, updateData);
      alert("✅ User updated successfully!");
      setShowEditUser(false);
      setEditingUser(null);
      setEditUser({ name: "", username: "", password: "", role: "user" });
      loadUserStats();
    } catch (err) {
      alert("Failed to update user: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      alert("✅ User deleted");
      loadUserStats();
    } catch (err) {
      alert("Failed to delete user: " + (err.response?.data?.error || err.message));
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  // ✅ FILTER ADMIN MEDIA
  const filteredAdminMedia = adminMediaItems.filter(item =>
    mediaFilterType === "all" || item.type === mediaFilterType
  );

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <h2>👨‍💼 Admin Dashboard</h2>
        <div className="header-buttons">
          <button
            onClick={() => setShowCreateUser(true)}
            className="btn btn-create"
          >
            + Create User
          </button>
          
          {/* ✅ SHARED MEDIA BUTTON */}
          <button
            onClick={() => setShowMediaUploader(true)}
            className="btn btn-media"
          >
            📁 Shared Media ({adminMediaItems.length})
          </button>
          
          <button
            onClick={handleLogout}
            className="btn btn-logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{users.length}</p>
        </div>

        <div className="stat-card">
          <h3>Total Posts</h3>
          <p className="stat-number">
            {users.reduce((sum, u) => sum + u.postsCount, 0)}
          </p>
        </div>

        <div className="stat-card">
          <h3>Active Users</h3>
          <p className="stat-number">
            {users.filter(u => u.facebookId).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>FB Connected</th>
                <th>Pages</th>
                <th>Posts</th>
                <th>Last Post</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.username}</td>
                  <td>{user.name || "-"}</td>
                  <td>
                    <span className={`role-badge ${user.role === "admin" ? "role-admin" : ""}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.facebookId ? (
                      <span className="status-yes">✓ Yes</span>
                    ) : (
                      <span className="status-no">✗ No</span>
                    )}
                  </td>
                  <td>{user.pagesCount}</td>
                  <td>{user.postsCount}</td>
                  <td>{formatDate(user.lastPostAt)}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td className="btn_action_flex">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="btn-action btn-edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user._id, user.username)}
                      className="btn-action btn-delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn btn-submit">
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="btn btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit User: {editingUser.username}</h3>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password (leave empty to keep current)</label>
                <input
                  type="password"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  placeholder="Leave empty to keep current password"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn btn-submit">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUser(false);
                    setEditingUser(null);
                  }}
                  className="btn btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ SHARED MEDIA MODAL */}
      {showMediaUploader && (
        <div className="modal-overlay">
          <div className="modal-content media-modal">
            {/* Header */}
            <div className="media-header">
              <div>
                <h2>📁 Shared Media Gallery</h2>
                <p className="media-subtitle">
                  Upload media for all users • {adminMediaItems.length} items
                </p>
              </div>
              <button
                onClick={() => setShowMediaUploader(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            {/* Upload Section */}
            <div className="upload-section">
              <div className="upload-box">
                <input
                  key={mediaFileInputKey}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleAdminMediaUpload}
                  multiple
                  style={{ display: "none" }}
                  id="admin-media-upload-input"
                />
                <label
                  htmlFor="admin-media-upload-input"
                  className="upload-label"
                >
                  📤 Upload Media Files
                </label>
                <p className="upload-hint">
                  Select images or videos • Multiple files supported
                </p>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="progress-text">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
              {["all", "image", "video"].map(type => (
                <button
                  key={type}
                  onClick={() => setMediaFilterType(type)}
                  className={`filter-tab ${mediaFilterType === type ? "active" : ""}`}
                >
                  {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
                </button>
              ))}
            </div>

            {/* Media Grid */}
            <div className="media-grid-container">
              {filteredAdminMedia.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-title">📂 No media yet</p>
                  <p className="empty-subtitle">
                    Upload images or videos to share with all users
                  </p>
                </div>
              ) : (
                <div className="media-grid">
                  {filteredAdminMedia.map((item) => (
                    <div key={item._id} className="media-item">
                      <div className="media-preview">
                        {item.type === "image" ? (
                          <img
                            src={item.url}
                            alt={item.originalName}
                            className="media-thumbnail"
                          />
                        ) : (
                          <video
                            src={item.url}
                            className="media-thumbnail"
                          />
                        )}
                        <div className="media-type-badge">
                          {item.type === "image" ? "🖼️" : "🎥"}
                        </div>
                      </div>

                      <div className="media-info">
                        <p className="media-name" title={item.originalName}>
                          {item.originalName || "Untitled"}
                        </p>
                        <p className="media-date">
                          {new Date(item.uploadedAt).toLocaleDateString()}
                        </p>

                        <button
                          onClick={() => handleDeleteAdminMedia(item._id, item.originalName)}
                          className="btn-delete-media"
                        >
                          🗑️ Delete from All Users
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
