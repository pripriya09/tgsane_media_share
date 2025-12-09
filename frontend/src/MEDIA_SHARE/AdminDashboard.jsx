// AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";

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

  useEffect(() => {
    checkAuth();
    loadUserStats();
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
      // Only include password if it's not empty
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

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Header */}
      <div style={{
        background: "white",
        padding: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h2 style={{ margin: 0 }}>👨‍💼 Admin Dashboard</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowCreateUser(true)}
            style={{
              padding: "10px 20px",
              background: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            + Create User
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ padding: "20px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          flex: "1",
          minWidth: "200px"
        }}>
          <h3 style={{ margin: 0, color: "#666" }}>Total Users</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", margin: "10px 0 0 0" }}>
            {users.length}
          </p>
        </div>

        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          flex: "1",
          minWidth: "200px"
        }}>
          <h3 style={{ margin: 0, color: "#666" }}>Total Posts</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", margin: "10px 0 0 0" }}>
            {users.reduce((sum, u) => sum + u.postsCount, 0)}
          </p>
        </div>

        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          flex: "1",
          minWidth: "200px"
        }}>
          <h3 style={{ margin: 0, color: "#666" }}>Active Users</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", margin: "10px 0 0 0" }}>
            {users.filter(u => u.facebookId).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div style={{ padding: "20px" }}>
        <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f0f0f0" }}>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>FB Connected</th>
                  <th style={thStyle}>Pages</th>
                  <th style={thStyle}>Posts</th>
                  <th style={thStyle}>Last Post</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={tdStyle}>{user.username}</td>
                    <td style={tdStyle}>{user.name || "-"}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        background: user.role === "admin" ? "#e3f2fd" : "#f0f0f0",
                        color: "#333",
                        fontWeight: "600"
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {user.facebookId ? (
                        <span style={{ color: "#4caf50" }}>✓ Yes</span>
                      ) : (
                        <span style={{ color: "#999" }}>✗ No</span>
                      )}
                    </td>
                    <td style={tdStyle}>{user.pagesCount}</td>
                    <td style={tdStyle}>{user.postsCount}</td>
                    <td style={tdStyle}>{formatDate(user.lastPostAt)}</td>
                    <td style={tdStyle}>{formatDate(user.createdAt)}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleEditUser(user)}
                        style={{
                          marginRight: "5px",
                          padding: "6px 12px",
                          background: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id, user.username)}
                        style={{
                          padding: "6px 12px",
                          background: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
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
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "30px",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "500px"
          }}>
            <h3>Create New User</h3>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#999",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
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
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "30px",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "500px"
          }}>
            <h3>Edit User: {editingUser.username}</h3>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Name</label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Username</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
                  Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  placeholder="Leave empty to keep current password"
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Role</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUser(false);
                    setEditingUser(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#999",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
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

const thStyle = {
  padding: "12px",
  textAlign: "left",
  fontWeight: "600",
  color: "#666"
};

const tdStyle = {
  padding: "12px"
};

export default AdminDashboard;
