// Dashboard.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="option">
      <h3>AutoPost</h3>
      <ul><NavLink to="/home/connect">Connect Facebook</NavLink></ul>
      <ul><NavLink to="/home/create">Create Post</NavLink></ul>
      <button onClick={handleLogout} style={{ marginTop: 20, padding: 8 }}>
        Logout
      </button>
    </div>
  );
}

export default Dashboard;