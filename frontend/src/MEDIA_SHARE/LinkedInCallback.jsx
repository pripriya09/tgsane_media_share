// src/LinkedInCallback.jsx - Clean White Popup (Like Twitter)
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from './api';

function LinkedInCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing LinkedIn authentication...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const error_description = searchParams.get('error_description');

      const isPopup = window.opener && !window.opener.closed;

      // Handle error from LinkedIn
      if (error) {
        setStatus(`❌ ${error_description || error}`);
        
        if (isPopup) {
          window.opener.postMessage({
            type: 'LINKEDIN_ERROR',
            error: error_description || error
          }, window.location.origin);
          
          setTimeout(() => window.close(), 2000);
        } else {
          setTimeout(() => navigate('/home/connect'), 3000);
        }
        return;
      }

      // Validate params
      if (!code || !state) {
        setStatus('❌ Invalid callback parameters');
        setTimeout(() => {
          if (isPopup) window.close();
          else navigate('/home/connect');
        }, 2000);
        return;
      }

      // Exchange code for token
      try {
        const response = await api.post('/user/linkedin/callback', {
          code,
          state
        });

        if (response.data.success) {
          setIsSuccess(true);
          setUserName(response.data.name);
          setStatus(`✅ LinkedIn connected successfully as ${response.data.name}!`);
          
          if (isPopup) {
            window.opener.postMessage({
              type: 'LINKEDIN_CONNECTED',
              name: response.data.name
            }, window.location.origin);
            
            setTimeout(() => window.close(), 1500);
          } else {
            setTimeout(() => navigate('/home/connect'), 2000);
          }
        } else {
          throw new Error(response.data.error || 'Connection failed');
        }
      } catch (err) {
        console.error('LinkedIn exchange error:', err);
        const errorMsg = err.response?.data?.error || err.message;
        setStatus(`❌ Connection failed: ${errorMsg}`);
        
        if (isPopup) {
          window.opener.postMessage({
            type: 'LINKEDIN_ERROR',
            error: errorMsg
          }, window.location.origin);
          
          setTimeout(() => window.close(), 2000);
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
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* LinkedIn Logo */}
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>
        {isSuccess ? (
          // Success Checkmark
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        ) : status.includes('❌') ? (
          // Error Icon
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        ) : (
          // LinkedIn Logo
          <svg width="80" height="80" viewBox="0 0 24 24" fill="#0077B5">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        )}
      </div>

      {/* Title */}
      <h2 style={{ 
        color: '#333', 
        marginBottom: '10px',
        fontSize: '24px',
        fontWeight: '600'
      }}>
        {isSuccess ? 'LinkedIn Connected!' : status.includes('❌') ? 'Connection Failed' : 'LinkedIn Connection'}
      </h2>

      {/* Status Message */}
      <p style={{ 
        color: '#666', 
        fontSize: '16px',
        marginBottom: '20px',
        lineHeight: '1.5'
      }}>
        {status}
      </p>

      {/* Success Info Box */}
      {isSuccess && userName && (
        <div style={{
          background: '#E7F4FF',
          border: '1px solid #0077B5',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '10px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0077B5">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <strong style={{ color: '#0077B5', fontSize: '18px' }}>
              {userName}
            </strong>
          </div>
          <p style={{ 
            margin: '10px 0 0 0', 
            fontSize: '14px', 
            color: '#666' 
          }}>
            ✅ Ready to post to LinkedIn
          </p>
        </div>
      )}

      {/* Loading Spinner */}
      {!isSuccess && !status.includes('❌') && (
        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#0077B5',
            animation: 'bounce 1.4s ease-in-out infinite'
          }}></div>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#0077B5',
            animation: 'bounce 1.4s ease-in-out 0.2s infinite'
          }}></div>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#0077B5',
            animation: 'bounce 1.4s ease-in-out 0.4s infinite'
          }}></div>
        </div>
      )}

      {/* Closing Message */}
      {isSuccess && (
        <p style={{ 
          fontSize: '14px', 
          color: '#999', 
          marginTop: '20px',
          fontStyle: 'italic'
        }}>
          {window.opener ? 'This window will close automatically...' : 'Redirecting to dashboard...'}
        </p>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-12px);
          }
        }
      `}</style>
    </div>
  );
}

export default LinkedInCallback;
