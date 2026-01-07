// frontend/src/YouTubeCallback.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from './api';

function YouTubeCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const userId = params.get('state');
      const error = params.get('error');

      if (error) {
        setStatus('❌ Connection cancelled');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      if (!code || !userId) {
        setStatus('❌ Missing authorization code');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        console.log('📡 Sending auth code to backend...');
        
        const response = await api.post('/user/youtube/callback', {
          code,
          userId
        });

        if (response.data.success) {
          console.log('✅ YouTube connected!');
          setStatus('✅ YouTube connected successfully!');
          
          // Notify parent window (if opened in popup)
          if (window.opener) {
            window.opener.postMessage({
              type: 'YOUTUBE_CONNECTED',
              channelName: response.data.channelName,
              channelId: response.data.channelId
            }, window.location.origin);
            window.close();
          } else {
            // Redirect to dashboard
            setTimeout(() => navigate('/'), 2000);
          }
        } else {
          setStatus('❌ Connection failed: ' + response.data.error);
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (error) {
        console.error('YouTube callback error:', error);
        setStatus('❌ Connection failed: ' + (error.response?.data?.error || error.message));
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>{status}</h2>
      <p>Please wait...</p>
    </div>
  );
}

export default YouTubeCallback;
