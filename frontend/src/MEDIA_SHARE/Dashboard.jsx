// Dashboard.jsx - UPDATED WITH EXTERNAL CSS
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import DisconnectModal from './DisconnectModal';
import './dashboardmedia.css';

function Dashboard() {
  const navigate = useNavigate();
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin_connected') === 'true') {
      alert('✅ LinkedIn connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleLogoutClick = () => {
    setShowDisconnectModal(true);
  };

  const handleLogout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem("ms_token");
    setShowDisconnectModal(false);
    navigate("/");
    alert("Logged out successfully");
    
    console.log('✅ Logged out - platform connections preserved');
  };

  return (
    <>
      <nav className="dashboard-nav">
        <div>
          <h3>Menu</h3>
          <div className="nav-links">
            <Link to="/home/connect" className="nav-link">
              🔗 Connect FB
            </Link>

            <Link to="/home/create" className="nav-link">
              ✏️ Create Post
            </Link>

            <Link to="/home/schedule" className="nav-link">
              📅 Schedule Posts
            </Link>

            <Link to="/home/history" className="nav-link">
              📊 Posts History
            </Link>

            <Link to="/home/media-gallery" className="nav-link">
              🖼️ Media Gallery
            </Link>
          </div>
        </div>

        {/* Logout Button */}
        <button onClick={handleLogoutClick} className="logout-btn">
          🚪 Logout
        </button>
      </nav>

      {/* Disconnect Modal */}
      <DisconnectModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onLogout={handleLogout}
      />
    </>
  );
}

export default Dashboard;
