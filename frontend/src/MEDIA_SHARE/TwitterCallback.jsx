// src/TwitterCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from './api';

function TwitterCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing Twitter authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const oauth_token = searchParams.get('oauth_token');
      const oauth_verifier = searchParams.get('oauth_verifier');
      const denied = searchParams.get('denied');
      const success = searchParams.get('success');
      const username = searchParams.get('username');
      const error = searchParams.get('error');

      const isPopup = window.opener && !window.opener.closed;

      // Check if backend already processed (has success param)
      if (success === 'true') {
        setStatus(`✅ Twitter connected successfully as @${username}!`);
        
        if (isPopup) {
          window.opener.postMessage({
            type: 'TWITTER_CONNECTED',
            username: username
          }, window.location.origin);
          
          setTimeout(() => window.close(), 1000);
        } else {
          setTimeout(() => navigate('/home/connect'), 2000);
        }
        return;
      }

      if (error || denied) {
        const errorMsg = error || 'Authentication cancelled';
        setStatus(`❌ ${errorMsg}`);
        
        if (isPopup) {
          window.opener.postMessage({
            type: 'TWITTER_ERROR',
            error: errorMsg
          }, window.location.origin);
          
          setTimeout(() => window.close(), 1000);
        } else {
          setTimeout(() => navigate('/home/connect'), 2000);
        }
        return;
      }

      // Process OAuth callback
      if (!oauth_token || !oauth_verifier) {
        setStatus('❌ Invalid callback parameters');
        setTimeout(() => {
          if (isPopup) window.close();
          else navigate('/home/connect');
        }, 2000);
        return;
      }

      try {
        const response = await api.post('/user/twitter/auth/callback', {
          oauth_token,
          oauth_verifier
        });

        if (response.data.success) {
          const username = response.data.data?.username || 'User';
          setStatus(`✅ Twitter connected successfully as @${username}!`);
          
          // Update localStorage
          const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
          const updatedUser = { ...user, twitterConnected: true };
          localStorage.setItem("ms_user", JSON.stringify(updatedUser));
          
          if (isPopup) {
            window.opener.postMessage({
              type: 'TWITTER_CONNECTED',
              username: username
            }, window.location.origin);
            
            setTimeout(() => window.close(), 1000);
          } else {
            setTimeout(() => navigate('/home/connect'), 2000);
          }
        } else {
          throw new Error(response.data.message || 'Connection failed');
        }
      } catch (error) {
        console.error('Twitter callback error:', error);
        const errorMsg = error.response?.data?.message || error.message;
        setStatus(`❌ Error: ${errorMsg}`);
        
        if (isPopup) {
          window.opener.postMessage({
            type: 'TWITTER_ERROR',
            error: errorMsg
          }, window.location.origin);
          
          setTimeout(() => window.close(), 1500);
        } else {
          setTimeout(() => navigate('/home/connect'), 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{ 
      padding: '60px 20px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>
        {status.includes('✅') ? '✅' : status.includes('❌') ? '❌' : '🐦'}
      </div>
      <h2 style={{ color: '#333', marginBottom: '10px' }}>Twitter Connection</h2>
      <p style={{ color: '#666', fontSize: '16px' }}>{status}</p>
      {status.includes('✅') && (
        <p style={{ fontSize: '14px', color: '#999', marginTop: '20px' }}>
          This window will close automatically...
        </p>
      )}
    </div>
  );
}

export default TwitterCallback;
