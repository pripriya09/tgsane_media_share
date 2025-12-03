// Dashboard.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem("ms_token");
    localStorage.removeItem("ms_user");
    localStorage.removeItem("ms_pages");
    
    // Redirect to login/home page
    navigate("/");
    
    alert("Logged out successfully");
  };

  return (
    <nav style={{ 
      width: "200px",
      padding: "20px",
      backgroundColor: "#f5f5f5",
      borderRight: "2px solid #ddd",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }}>
      <div>
        <h3 style={{ marginBottom: "20px", color: "#333" }}>Menu</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link 
            to="/home/connect" 
            style={{ 
              padding: "10px 15px",
              textDecoration: "none",
              color: "#1976d2",
              backgroundColor: "#fff",
              borderRadius: "6px",
              border: "1px solid #ddd",
              transition: "all 0.2s"
            }}
            onMouseOver={e => {
              e.target.style.backgroundColor = "#1976d2";
              e.target.style.color = "#fff";
            }}
            onMouseOut={e => {
              e.target.style.backgroundColor = "#fff";
              e.target.style.color = "#1976d2";
            }}
          >
            Connect FB
          </Link>
          
          <Link 
            to="/home/create" 
            style={{ 
              padding: "10px 15px",
              textDecoration: "none",
              color: "#1976d2",
              backgroundColor: "#fff",
              borderRadius: "6px",
              border: "1px solid #ddd",
              transition: "all 0.2s"
            }}
            onMouseOver={e => {
              e.target.style.backgroundColor = "#1976d2";
              e.target.style.color = "#fff";
            }}
            onMouseOut={e => {
              e.target.style.backgroundColor = "#fff";
              e.target.style.color = "#1976d2";
            }}
          >
            Create Post
          </Link>
          
          <Link 
            to="/home/history" 
            style={{ 
              padding: "10px 15px",
              textDecoration: "none",
              color: "#1976d2",
              backgroundColor: "#fff",
              borderRadius: "6px",
              border: "1px solid #ddd",
              transition: "all 0.2s"
            }}
            onMouseOver={e => {
              e.target.style.backgroundColor = "#1976d2";
              e.target.style.color = "#fff";
            }}
            onMouseOut={e => {
              e.target.style.backgroundColor = "#fff";
              e.target.style.color = "#1976d2";
            }}
          >
            Posts History
          </Link>
        </div>
      </div>

      {/* Logout Button at Bottom */}
      <button
        onClick={handleLogout}
        style={{
          padding: "10px 15px",
          backgroundColor: "#f44336",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
          transition: "all 0.2s"
        }}
        onMouseOver={e => e.target.style.backgroundColor = "#d32f2f"}
        onMouseOut={e => e.target.style.backgroundColor = "#f44336"}
      >
        Logout
      </button>
    </nav>
  );
}

export default Dashboard;
