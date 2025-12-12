// TwitterCallback.jsx - Using api.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from './api';

const TwitterCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing Twitter authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const oauth_token = searchParams.get('oauth_token');
      const oauth_verifier = searchParams.get('oauth_verifier');
      const denied = searchParams.get('denied');

      // User cancelled authorization
      if (denied) {
        setStatus('❌ Twitter authentication cancelled');
        setTimeout(() => navigate('/home/connect'), 2000);
        return;
      }

      // Missing parameters
      if (!oauth_token || !oauth_verifier) {
        setStatus('❌ Invalid callback parameters');
        setTimeout(() => navigate('/home/connect'), 2000);
        return;
      }

      try {
        // Complete OAuth flow using api.js
        const response = await api.post('/user/twitter/auth/callback', {
          oauth_token,
          oauth_verifier
        });

        if (response.data.success) {
          setStatus(`✅ Twitter connected successfully as @${response.data.data.username}!`);
          
          // Update localStorage
          const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
          const updatedUser = { ...user, twitterConnected: true };
          localStorage.setItem("ms_user", JSON.stringify(updatedUser));
          
          setTimeout(() => navigate('/home/connect'), 2000);
        } else {
          setStatus(`❌ Error: ${response.data.message}`);
          setTimeout(() => navigate('/home/connect'), 3000);
        }
      } catch (error) {
        console.error('Twitter callback error:', error);
        const errorMsg = error.response?.data?.message || error.message;
        setStatus(`❌ Error: ${errorMsg}`);
        setTimeout(() => navigate('/home/connect'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="#1DA1F2" style={{ marginBottom: '20px' }}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>{status}</h2>
        {status.includes('Processing') && (
          <div style={{
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #1DA1F2',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '20px auto'
          }}></div>
        )}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TwitterCallback;
