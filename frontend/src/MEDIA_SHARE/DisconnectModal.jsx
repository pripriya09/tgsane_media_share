// DisconnectModal.jsx - ADD YOUTUBE SUPPORT

import React, { useState } from 'react';
import api from './api';
import './dashboardmedia.css';

function DisconnectModal({ isOpen, onClose, onLogout }) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    facebook: false,
    twitter: false,
    linkedin: false,
    youtube: false // ✅ ADD YOUTUBE
  });

  if (!isOpen) return null;

  const handleToggle = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  // Select All / Deselect All
  const handleSelectAll = () => {
    const allSelected = Object.values(selectedPlatforms).every(val => val === true);
    setSelectedPlatforms({
      facebook: !allSelected,
      twitter: !allSelected,
      linkedin: !allSelected,
      youtube: !allSelected // ✅ ADD YOUTUBE
    });
  };

  // Check if any platform is selected
  const hasSelectedPlatforms = Object.values(selectedPlatforms).some(val => val === true);

  // Check if all platforms are selected
  const allPlatformsSelected = Object.values(selectedPlatforms).every(val => val === true);

  // Check if some (but not all) are selected
  const somePlatformsSelected = hasSelectedPlatforms && !allPlatformsSelected;

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
      linkedin: null,
      youtube: null // ✅ ADD YOUTUBE
    };

    try {
      const disconnectPromises = [];

      if (selectedPlatforms.facebook) {
        disconnectPromises.push(
          api.post('/user/facebook/disconnectFB')
            .then(() => { results.facebook = 'success'; })
            .catch((err) => {
              results.facebook = 'failed';
              console.error('Facebook disconnect error:', err);
            })
        );
      }

      if (selectedPlatforms.twitter) {
        disconnectPromises.push(
          api.post('/user/twitter/disconnectX')
            .then(() => { results.twitter = 'success'; })
            .catch((err) => {
              results.twitter = 'failed';
              console.error('Twitter disconnect error:', err);
            })
        );
      }

      if (selectedPlatforms.linkedin) {
        disconnectPromises.push(
          api.post('/user/linkedin/disconnectLD')
            .then(() => { results.linkedin = 'success'; })
            .catch((err) => {
              results.linkedin = 'failed';
              console.error('LinkedIn disconnect error:', err);
            })
        );
      }

      // ✅ ADD YOUTUBE DISCONNECT
      if (selectedPlatforms.youtube) {
        disconnectPromises.push(
          api.post('/user/youtube/disconnect')
            .then(() => { results.youtube = 'success'; })
            .catch((err) => {
              results.youtube = 'failed';
              console.error('YouTube disconnect error:', err);
            })
        );
      }

      await Promise.all(disconnectPromises);

      const successCount = Object.values(results).filter(r => r === 'success').length;
      const failedCount = Object.values(results).filter(r => r === 'failed').length;

      if (failedCount > 0) {
        alert(`⚠️ ${successCount} platform(s) disconnected, ${failedCount} failed. Logging out anyway.`);
      } else if (successCount > 0) {
        alert(`✅ Successfully disconnected ${successCount} platform(s)!`);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setDisconnecting(false);
      onLogout();
    }
  };

  const handleLogoutOnly = () => {
    onLogout();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚪 Logout</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Do you want to disconnect any platforms before logging out?
          </p>

          {/* ✅ SELECT ALL CHECKBOX - FIRST */}
          <div className="select-all-container">
            <label className="platform-option select-all">
              <input
                type="checkbox"
                checked={allPlatformsSelected}
                ref={input => {
                  if (input) input.indeterminate = somePlatformsSelected;
                }}
                onChange={handleSelectAll}
              />
              <span className="platform-name">
                {allPlatformsSelected ? '☑️ Deselect All' : '☐ Select All'}
              </span>
            </label>
          </div>

          <div className="divider"></div>

          {/* PLATFORM CHECKBOXES */}
          <div className="platforms-list">
            <label className="platform-option">
              <input
                type="checkbox"
                checked={selectedPlatforms.facebook}
                onChange={() => handleToggle('facebook')}
              />
              <span className="platform-icon">📘</span>
              <span className="platform-name">Facebook</span>
            </label>

            <label className="platform-option">
              <input
                type="checkbox"
                checked={selectedPlatforms.twitter}
                onChange={() => handleToggle('twitter')}
              />
              <span className="platform-icon">🐦</span>
              <span className="platform-name">Twitter</span>
            </label>

            <label className="platform-option">
              <input
                type="checkbox"
                checked={selectedPlatforms.linkedin}
                onChange={() => handleToggle('linkedin')}
              />
              <span className="platform-icon">💼</span>
              <span className="platform-name">LinkedIn</span>
            </label>

            {/* ✅ ADD YOUTUBE */}
            <label className="platform-option">
              <input
                type="checkbox"
                checked={selectedPlatforms.youtube}
                onChange={() => handleToggle('youtube')}
              />
              <span className="platform-icon">📺</span>
              <span className="platform-name">YouTube</span>
            </label>
          </div>

          <div className="modal-tip">
            💡 <strong>Tip:</strong> You can also disconnect platforms individually from the Dashboard without logging out.
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleLogoutOnly}
            disabled={disconnecting}
          >
            Just Logout
          </button>
          <button
            className="btn btn-danger"
            onClick={handleLogoutWithDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? 'Disconnecting...' : hasSelectedPlatforms ? 'Disconnect & Logout' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisconnectModal;
