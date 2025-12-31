// DisconnectModal.jsx - UPDATED WITH EXTERNAL CSS
import React, { useState } from 'react';
import api from './api';
import './dashboardmedia.css';

function DisconnectModal({ isOpen, onClose, onLogout }) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    facebook: false,
    twitter: false,
    linkedin: false
  });

  if (!isOpen) return null;

  const handleToggle = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const handleLogoutWithDisconnect = async () => {
    const platformsToDisconnect = Object.keys(selectedPlatforms).filter(
      key => selectedPlatforms[key]
    );

    if (platformsToDisconnect.length === 0) {
      onLogout();
      return;
    }

    setDisconnecting(true);

    const results = {
      facebook: null,
      twitter: null,
      linkedin: null
    };

    try {
      if (selectedPlatforms.facebook) {
        try {
          await api.post('/user/facebook/disconnectFB');
          results.facebook = 'success';
        } catch (err) {
          results.facebook = 'failed';
          console.error('Facebook disconnect error:', err);
        }
      }

      if (selectedPlatforms.twitter) {
        try {
          await api.post('/user/twitter/disconnectX');
          results.twitter = 'success';
        } catch (err) {
          results.twitter = 'failed';
          console.error('Twitter disconnect error:', err);
        }
      }

      if (selectedPlatforms.linkedin) {
        try {
          await api.post('/user/linkedin/disconnectLD');
          results.linkedin = 'success';
        } catch (err) {
          results.linkedin = 'failed';
          console.error('LinkedIn disconnect error:', err);
        }
      }

      const successCount = Object.values(results).filter(r => r === 'success').length;
      const failedCount = Object.values(results).filter(r => r === 'failed').length;

      if (failedCount > 0) {
        alert(`⚠️ ${successCount} platform(s) disconnected, ${failedCount} failed. Logging out anyway.`);
      } else if (successCount > 0) {
        alert(`✅ Successfully disconnected ${successCount} platform(s)`);
      }

    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setDisconnecting(false);
      onLogout();
    }
  };

  return (
    <div className="disconnect-overlay" onClick={onClose}>
      <div className="disconnect-modal" onClick={(e) => e.stopPropagation()}>
        <div className="disconnect-modal-header">
          <h2>🚪 Logout</h2>
          <button onClick={onClose} className="disconnect-close-btn">×</button>
        </div>

        <div className="disconnect-modal-body">
          <p className="disconnect-question">
            Do you want to disconnect any platforms before logging out?
          </p>
          
          <div className="platform-list">
            {/* Facebook/Instagram */}
            <label className="platform-option">
              <input
                type="checkbox"
                checked={selectedPlatforms.facebook}
                onChange={() => handleToggle('facebook')}
              />
              <div className="platform-info">
                <span className="platform-icon">📘</span>
                <div>
                  <div className="platform-name">Facebook & Instagram</div>
                  <div className="platform-hint">Disconnect pages and IG accounts</div>
                </div>
              </div>
            </label>

            {/* Twitter */}
            <label className="platform-option">
              <input
                type="checkbox"
                checked={selectedPlatforms.twitter}
                onChange={() => handleToggle('twitter')}
              />
              <div className="platform-info">
                <span className="platform-icon">🐦</span>
                <div>
                  <div className="platform-name">Twitter</div>
                  <div className="platform-hint">Remove Twitter access</div>
                </div>
              </div>
            </label>

            {/* LinkedIn */}
            <label className="platform-option">
              <input
                type="checkbox"
                checked={selectedPlatforms.linkedin}
                onChange={() => handleToggle('linkedin')}
              />
              <div className="platform-info">
                <span className="platform-icon">💼</span>
                <div>
                  <div className="platform-name">LinkedIn</div>
                  <div className="platform-hint">Remove LinkedIn connection</div>
                </div>
              </div>
            </label>
          </div>

          <div className="info-box">
            <p className="info-text">
              💡 <strong>Tip:</strong> You can also disconnect platforms individually from the Dashboard without logging out.
            </p>
          </div>
        </div>

        <div className="disconnect-modal-footer">
          <button
            onClick={onLogout}
            className="btn-secondary"
            disabled={disconnecting}
          >
            Logout Only
          </button>
          <button
            onClick={handleLogoutWithDisconnect}
            className="btn-primary"
            disabled={disconnecting}
          >
            {disconnecting
              ? '⏳ Disconnecting...'
              : Object.values(selectedPlatforms).some(v => v)
              ? 'Disconnect & Logout'
              : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisconnectModal;
