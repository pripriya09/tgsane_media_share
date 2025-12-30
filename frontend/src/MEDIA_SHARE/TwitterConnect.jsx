// frontend/src/MEDIA_SHARE/TwitterConnect.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import '../CSS/socialconnect.css'; // Use your existing CSS

const TwitterConnect = () => {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check Twitter connection status on mount
  useEffect(() => {
    checkTwitterStatus();
  }, []);

  const checkTwitterStatus = async () => {
    try {
      // ✅ Changed from fetch(http://localhost...) to api.get()
      const response = await api.get('/user/twitter/status');
      
      const data = response.data; // axios response body is in .data

      if (data.success && data.connected) {
        setConnected(true);
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Error checking Twitter status:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Step 1: Get OAuth request token
      // ✅ Changed from fetch(http://localhost...) to api.post()
      const response = await api.post('/user/twitter/auth/request');
      
      const data = response.data;

      if (data.success) {
        // Step 2: Redirect to Twitter authorization
        window.location.href = data.authUrl;
      } else {
        alert('Failed to connect Twitter: ' + data.message);
        setLoading(false);
      }
    } catch (error) {
      console.error('Twitter connect error:', error);
      alert('Error connecting Twitter');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Twitter?')) return;

    setLoading(true);
    try {
      // ✅ Changed from fetch(http://localhost...) to api.post()
      const response = await api.post('/user/twitter/disconnect');
      
      const data = response.data;

      if (data.success) {
        setConnected(false);
        setUsername('');
        alert('Twitter disconnected successfully');
      } else {
        alert('Failed to disconnect Twitter');
      }
    } catch (error) {
      console.error('Twitter disconnect error:', error);
      alert('Error disconnecting Twitter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="social-connect-card">
      <div className="social-header">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#1DA1F2">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <h3 style={{ marginLeft: '10px' }}>Twitter</h3>
      </div>

      {connected ? (
        <div className="connected-status">
          <p className="status-text">✅ Connected as <strong>@{username}</strong></p>
          <button 
            onClick={handleDisconnect} 
            className="disconnect-btn"
            disabled={loading}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Disconnecting...' : 'Disconnect Twitter'}
          </button>
        </div>
      ) : (
        <div className="disconnected-status">
          <p className="status-text">Not connected</p>
          <button 
            onClick={handleConnect} 
            className="connect-btn"
            disabled={loading}
            style={{
              backgroundColor: '#1DA1F2',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Connecting...' : 'Connect Twitter'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TwitterConnect;
