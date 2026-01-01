// DisconnectModal.jsx - SELECT ALL FIRST
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

  // Select All / Deselect All
  const handleSelectAll = () => {
    const allSelected = Object.values(selectedPlatforms).every(val => val === true);
    
    setSelectedPlatforms({
      facebook: !allSelected,
      twitter: !allSelected,
      linkedin: !allSelected
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
      linkedin: null
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
    <div className="disconnect-modal-overlay" onClick={onClose}>
      <div className="disconnect-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="disconnect-modal-header">
          <h2>🚪 Logout Options</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="disconnect-modal-body">
          <p className="disconnect-question">
            Do you want to disconnect any platforms before logging out?
          </p>

          {/* ✅ SELECT ALL CHECKBOX - FIRST */}
          <div className="select-all-checkbox-wrapper">
            <label className="platform-checkbox select-all-checkbox">
              <input
                type="checkbox"
                checked={allPlatformsSelected}
                ref={input => {
                  if (input) {
                    input.indeterminate = somePlatformsSelected;
                  }
                }}
                onChange={handleSelectAll}
                disabled={disconnecting}
              />
              <span className="checkbox-label">
            
                <span className="select-all-text">
                  {allPlatformsSelected ? 'Cancel' : 'Select Items'}
                </span>
              </span>
            </label>
          </div>

          {/* Platform Checkboxes - BELOW */}
          <div className="platform-checkboxes">
            {/* Facebook */}
            <label className="platform-checkbox">
              <input
                type="checkbox"
                checked={selectedPlatforms.facebook}
                onChange={() => handleToggle('facebook')}
                disabled={disconnecting}
              />
              <span className="checkbox-label">
               
                <span>Facebook & Instagram</span>
              </span>
            </label>

            {/* Twitter */}
            <label className="platform-checkbox">
              <input
                type="checkbox"
                checked={selectedPlatforms.twitter}
                onChange={() => handleToggle('twitter')}
                disabled={disconnecting}
              />
              <span className="checkbox-label">
               
                <span>Twitter / X</span>
              </span>
            </label>

            {/* LinkedIn */}
            <label className="platform-checkbox">
              <input
                type="checkbox"
                checked={selectedPlatforms.linkedin}
                onChange={() => handleToggle('linkedin')}
                disabled={disconnecting}
              />
              <span className="checkbox-label">
            
                <span>LinkedIn</span>
              </span>
            </label>
          </div>

          <div className="disconnect-actions">
            {/* Just Logout Button */}
            <button 
              className="logout-only-btn"
              onClick={handleLogoutOnly}
              disabled={disconnecting}
            >
              🚪 Just Logout
            </button>

            {/* Disconnect & Logout Button */}
            <button 
              className={`disconnect-logout-btn ${hasSelectedPlatforms ? 'has-selection' : ''}`}
              onClick={handleLogoutWithDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                '⏳ Disconnecting...'
              ) : hasSelectedPlatforms ? (
                `🔌 Disconnect ${Object.values(selectedPlatforms).filter(v => v).length} & Logout`
              ) : (
                '🚪 Logout'
              )}
            </button>
          </div>

          <p className="disconnect-tip">
            <strong>💡 Tip:</strong> You can also disconnect platforms individually from the Dashboard without logging out.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DisconnectModal;
