// Dashboard.jsx - NEW MODERN VERSION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from './api';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalPosts: 0,
    fbPosts: 0,
    igPosts: 0,
    postsThisWeek: 0
  });
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadUser();
    loadStats();
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "light-mode";
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const loadUser = () => {
    const userData = JSON.parse(localStorage.getItem("ms_user") || "{}");
    setUser(userData);
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/user/post-stats");
      setStats(res.data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ms_token");
    localStorage.removeItem("ms_user");
    localStorage.removeItem("ms_pages");
    navigate("/");
    alert("Logged out successfully");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`modern-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      {/* SIDEBAR HEADER */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🚀</span>
          {!sidebarCollapsed && <span className="logo-text">TGSane</span>}
        </div>
        <button 
          className="collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* USER INFO */}
      {!sidebarCollapsed && (
        <div className="user-info-card">
          <div className="user-avatar">
            {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name || user?.username}</div>
            <div className="user-role-badge">{user?.role || "user"}</div>
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        <Link 
          to="/home/connect" 
          className={`nav-item ${isActive("/home/connect") ? "active" : ""}`}
        >
          <span className="nav-icon">🔗</span>
          {!sidebarCollapsed && <span>Connect Accounts</span>}
        </Link>

        <Link 
          to="/home/create" 
          className={`nav-item ${isActive("/home/create") ? "active" : ""}`}
        >
          <span className="nav-icon">✍️</span>
          {!sidebarCollapsed && <span>Create Post</span>}
        </Link>

        <Link 
          to="/home/history" 
          className={`nav-item ${isActive("/home/history") ? "active" : ""}`}
        >
          <span className="nav-icon">📜</span>
          {!sidebarCollapsed && <span>Posts History</span>}
        </Link>

        {(user?.role === "admin" || user?.role === "superAdmin") && (
          <>
            <div className="nav-divider"></div>
            <Link 
              to="/admin" 
              className={`nav-item admin-item ${isActive("/admin") ? "active" : ""}`}
            >
              <span className="nav-icon">⚙️</span>
              {!sidebarCollapsed && <span>Admin Panel</span>}
            </Link>
          </>
        )}
      </nav>

      {/* STATS SECTION */}
      {!sidebarCollapsed && (
        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-icon">📝</span>
            <div className="stat-info">
              <div className="stat-number">{stats.totalPosts}</div>
              <div className="stat-label">Total Posts</div>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <div className="stat-number">{stats.postsThisWeek}</div>
              <div className="stat-label">This Week</div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="sidebar-footer">
        <button 
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Light Mode" : "Dark Mode"}
        >
          {darkMode ? "☀️" : "🌙"}
          {!sidebarCollapsed && <span>{darkMode ? " Light" : " Dark"}</span>}
        </button>
        
        <button 
          className="logout-btn"
          onClick={handleLogout}
        >
          <span className="nav-icon">🚪</span>
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
