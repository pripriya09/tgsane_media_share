// LogMedia.jsx - UPDATED WITH EXTERNAL CSS
import React, { useEffect, useState } from "react";
import api from "./api";
import './dashboardmedia.css';

const FB_APP_ID = (typeof import.meta !== "undefined" && import.meta.env?.VITE_FB_APP_ID) || process.env.REACT_APP_FB_APP_ID;

function LogMedia() {
  const [userProfile, setUserProfile] = useState(null);
  const [connectedPages, setConnectedPages] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  // Twitter states
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState("");
  const [twitterLoading, setTwitterLoading] = useState(false);

  // LinkedIn states
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [linkedInName, setLinkedInName] = useState("");
  const [linkedInLoading, setLinkedInLoading] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("ms_tutorial_seen");
    if (seen === "true") {
      setHasSeenTutorial(true);
    } else {
      setShowTutorial(true);
    }

    loadUserProfile();
    loadConnectedPages();
    checkTwitterConnection();
    checkLinkedInConnection();

    window.addEventListener('message', handleOAuthMessage);

    // Load Facebook SDK
    (function (d, s, id) {
      let js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s);
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    })(document, "script", "facebook-jssdk");

    window.fbAsyncInit = function () {
      FB.init({
        appId: FB_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v24.0",
      });
    };

    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, []);

  const handleOAuthMessage = (event) => {
    if (event.origin !== window.location.origin) return;

    if (event.data.type === 'TWITTER_CONNECTED') {
      setTwitterConnected(true);
      setTwitterUsername(event.data.username || '');
      setTwitterLoading(false);
      alert('✅ Twitter connected successfully!');
    } else if (event.data.type === 'TWITTER_ERROR') {
      setTwitterLoading(false);
      alert('❌ Twitter connection failed: ' + event.data.error);
    } else if (event.data.type === 'LINKEDIN_CONNECTED') {
      setLinkedInConnected(true);
      setLinkedInName(event.data.name || '');
      setLinkedInLoading(false);
      alert('✅ LinkedIn connected successfully!');
    } else if (event.data.type === 'LINKEDIN_ERROR') {
      setLinkedInLoading(false);
      alert('❌ LinkedIn connection failed: ' + event.data.error);
    }
  };

  const loadUserProfile = async () => {
    try {
      console.log('📡 Fetching user profile from server...');
      
      const response = await api.get('/user/profile');
      
      if (response.data.success) {
        const profile = response.data.profile;
        
        console.log('✅ Server profile:', profile);
        
        // ✅ IMPORTANT: Get real _id from token or API response
        const tokenPayload = JSON.parse(atob(localStorage.getItem("ms_token").split('.')[1]));
        const realUserId = tokenPayload.userId;
        
        console.log('🔑 Real user ID from token:', realUserId);
        
        // Update user state with REAL _id
        const user = {
          _id: realUserId,  // ✅ Use real MongoDB _id from JWT token
          username: profile.username,
          email: profile.email,
          facebookConnected: profile.facebook?.connected || false,
          twitterConnected: profile.twitter?.connected || false,
          linkedInConnected: profile.linkedin?.connected || false,
          pages: profile.facebook?.pages || []
        };
        
        setUserProfile(user);
        localStorage.setItem("ms_user", JSON.stringify(user));
        
        console.log('✅ User profile loaded with real _id:', user._id);
        console.log('📊 Facebook connected:', user.facebookConnected);
        
        return user;
      }
    } catch (err) {
      console.error("❌ Failed to load user profile from server:", err.message);
      
      // Fallback: Get _id from token
      try {
        const token = localStorage.getItem("ms_token");
        if (token) {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          const realUserId = tokenPayload.userId;
          
          const cachedUser = JSON.parse(localStorage.getItem("ms_user") || "{}");
          cachedUser._id = realUserId; // ✅ Fix _id if it's wrong
          
          setUserProfile(cachedUser);
          localStorage.setItem("ms_user", JSON.stringify(cachedUser));
          
          console.log('⚠️ Using cached data with corrected _id:', realUserId);
        }
      } catch (tokenErr) {
        console.error("Failed to extract _id from token:", tokenErr);
      }
    }
  };

  const loadConnectedPages = async () => {
    try {
      const res = await api.get("/user/pages");
      const pages = res.data?.pages || [];
      setConnectedPages(pages);
      if (pages.length > 0) {
        localStorage.setItem("ms_pages", JSON.stringify(pages));
      }
    } catch (err) {
      console.warn("Could not load pages:", err);
    }
  };

  const checkTwitterConnection = async () => {
    try {
      const response = await api.get('/user/twitter/status');
      if (response.data.success && response.data.connected) {
        setTwitterConnected(true);
        setTwitterUsername(response.data.username || '');
      }
    } catch (error) {
      console.error('Error checking Twitter status:', error);
    }
  };

  const checkLinkedInConnection = async () => {
    try {
      const response = await api.get('/user/linkedin/status');
      if (response.data.connected) {
        setLinkedInConnected(true);
        setLinkedInName(response.data.name || '');
      }
    } catch (error) {
      console.error('Error checking LinkedIn status:', error);
    }
  };

  const handleTwitterConnect = async () => {
    setTwitterLoading(true);
    try {
      const response = await api.post('/user/twitter/auth/request');

      if (response.data.success) {
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        window.open(
          response.data.authUrl,
          'Twitter OAuth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );
      } else {
        alert('Failed to connect Twitter: ' + response.data.message);
        setTwitterLoading(false);
      }
    } catch (error) {
      console.error('Twitter connect error:', error);
      alert('Error connecting Twitter: ' + (error.response?.data?.message || error.message));
      setTwitterLoading(false);
    }
  };

  const handleLinkedInConnect = async () => {
    setLinkedInLoading(true);
    try {
      const response = await api.get('/user/linkedin/auth');
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        alert('Failed to get LinkedIn authorization URL');
        setLinkedInLoading(false);
      }
    } catch (error) {
      console.error('LinkedIn connect error:', error);
      alert('Error connecting LinkedIn: ' + (error.response?.data?.error || error.message));
      setLinkedInLoading(false);
    }
  };

  const handleTwitterDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Twitter?')) return;

    setTwitterLoading(true);
    try {
      const response = await api.post('/user/twitter/disconnectX');

      if (response.data.success) {
        setTwitterConnected(false);
        setTwitterUsername('');
        
        const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
        const updatedUser = { ...user, twitterConnected: false };
        localStorage.setItem("ms_user", JSON.stringify(updatedUser));
        
        alert('✅ Twitter disconnected successfully');
      } else {
        alert('Failed to disconnect Twitter');
      }
    } catch (error) {
      console.error('Twitter disconnect error:', error);
      alert('Error disconnecting Twitter: ' + (error.response?.data?.message || error.message));
    } finally {
      setTwitterLoading(false);
    }
  };

  const handleLinkedInDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect LinkedIn?')) return;

    setLinkedInLoading(true);
    try {
      const response = await api.post('/user/linkedin/disconnectLD');

      if (response.data.success) {
        setLinkedInConnected(false);
        setLinkedInName('');
        
        const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
        const updatedUser = { ...user, linkedInConnected: false };
        localStorage.setItem("ms_user", JSON.stringify(updatedUser));
        
        alert('✅ LinkedIn disconnected successfully');
      } else {
        alert('Failed to disconnect LinkedIn');
      }
    } catch (error) {
      console.error('LinkedIn disconnect error:', error);
      alert('Error disconnecting LinkedIn: ' + (error.response?.data?.error || error.message));
    } finally {
      setLinkedInLoading(false);
    }
  };

  const handleFacebookDisconnect = async () => {
    if (!confirm('⚠️ This will disconnect Facebook and all Instagram accounts. Continue?')) return;

    try {
      const response = await api.post('/user/facebook/disconnectFB');

      if (response.data.success) {
        const updatedUser = { ...userProfile, facebookConnected: false };
        localStorage.setItem("ms_user", JSON.stringify(updatedUser));
        setUserProfile(updatedUser);
        setConnectedPages([]);
        
        localStorage.removeItem("ms_pages");
        localStorage.removeItem("facebook_userAccessToken");
        
        alert('✅ Facebook and Instagram disconnected successfully');
      }
    } catch (error) {
      console.error('Facebook disconnect error:', error);
      alert('Error disconnecting Facebook: ' + (error.response?.data?.error || error.message));
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    setHasSeenTutorial(true);
    localStorage.setItem("ms_tutorial_seen", "true");
  };

  const openTutorial = () => {
    setShowTutorial(true);
  };

  const handleFBLogin = () => {
    if (!window.FB) {
      alert("Facebook SDK not loaded");
      return;
    }

    FB.login(
      (response) => {
        if (response.authResponse) {
          const userAccessToken = response.authResponse.accessToken;
          localStorage.setItem("facebook_userAccessToken", userAccessToken);

          (async () => {
            try {
              const res = await api.post("/user/connect/facebook", { 
                userAccessToken,
                userId: userProfile._id 
              });

              if (res.data.success) {
                const updatedUser = { ...userProfile, facebookConnected: true };
                localStorage.setItem("ms_user", JSON.stringify(updatedUser));
                setUserProfile(updatedUser);

                const pages = res.data.pages || [];
                localStorage.setItem("ms_pages", JSON.stringify(pages));
                setConnectedPages(pages);

                alert("✅ Facebook connected successfully!");
              }
            } catch (err) {
              const errorMsg = err.response?.data?.error || err.message;
              alert("Connection failed: " + errorMsg);
            }
          })();
        }
      },
      {
        scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,email,pages_read_user_content,business_management",
      }
    );
  };


const checkFacebookConnection = async () => {
  try {
    console.log('📡 Checking Facebook connection status from server...');
    
    const response = await api.get('/user/profile');
    
    if (response.data.success) {
      const profile = response.data.profile;
      
      console.log('📊 Server response:', profile);
      
      // ✅ Get real _id from JWT token
      const token = localStorage.getItem("ms_token");
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const realUserId = tokenPayload.userId;
      
      // Update user profile with server data
      const updatedUser = {
        _id: realUserId,  // ✅ Always use real _id from token
        username: profile.username,
        email: profile.email,
        facebookConnected: profile.facebook?.connected || false,
        twitterConnected: profile.twitter?.connected || false,
        linkedInConnected: profile.linkedin?.connected || false
      };
      
      // Update state
      setUserProfile(updatedUser);
      
      // Update localStorage with fresh data
      localStorage.setItem("ms_user", JSON.stringify(updatedUser));
      
      // Update connection states
      setTwitterConnected(profile.twitter?.connected || false);
      setTwitterUsername(profile.twitter?.username || '');
      
      setLinkedInConnected(profile.linkedin?.connected || false);
      setLinkedInName(profile.linkedin?.name || '');
      
      console.log('✅ User _id:', updatedUser._id);
      console.log('✅ Facebook connected:', updatedUser.facebookConnected);
      console.log('✅ Twitter connected:', updatedUser.twitterConnected);
      console.log('✅ LinkedIn connected:', updatedUser.linkedInConnected);
      
      // Load pages if Facebook is connected
      if (profile.facebook?.connected) {
        await loadConnectedPages();
      }
    }
  } catch (error) {
    console.error('❌ Error checking Facebook connection:', error);
  }
};


// Update useEffect to call checkFacebookConnection
useEffect(() => {
  const seen = localStorage.getItem("ms_tutorial_seen");
  if (seen === "true") {
    setHasSeenTutorial(true);
  } else {
    setShowTutorial(true);
  }

  // ✅ Check connection status from server first
  checkFacebookConnection();
  
  // Then check Twitter and LinkedIn
  checkTwitterConnection();
  checkLinkedInConnection();

  window.addEventListener('message', handleOAuthMessage);

  // Load Facebook SDK
  (function (d, s, id) {
    let js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  })(document, "script", "facebook-jssdk");

  window.fbAsyncInit = function () {
    FB.init({
      appId: FB_APP_ID,
      cookie: true,
      xfbml: true,
      version: "v24.0",
    });
  };

  return () => {
    window.removeEventListener('message', handleOAuthMessage);
  };
}, []);


  return (
    <div className="logmedia-container">
      {/* TUTORIAL MODAL */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-modal">
            <button onClick={closeTutorial} className="tutorial-close-btn">
              ×
            </button>
            <h2>How to Connect Facebook & Instagram (30 sec)</h2>
            <iframe
              src="https://www.youtube.com/embed/Zp6J5wzb2Zc"
              title="How to connect Facebook Page & Instagram"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <p>
              You need: <br />
              • A Facebook Page (not personal profile) <br />
              • Connected to Instagram Professional/Business account
            </p>
            <button onClick={closeTutorial} className="tutorial-cta-btn">
              I Understand → Connect Now
            </button>
          </div>
        </div>
      )}

      {/* USER PROFILE SECTION */}
      {userProfile ? (
        <div className="user-profile-box">
          <div>
            <h3>👤 {userProfile.username}</h3>
            <p>
              {userProfile.facebookConnected ? "✅ Facebook Connected" : "❌ Facebook Not Connected"}
              <br />
              {twitterConnected ? `✅ Twitter Connected (@${twitterUsername})` : "❌ Twitter Not Connected"}
              <br />
              {linkedInConnected ? `✅ LinkedIn Connected (${linkedInName})` : "❌ LinkedIn Not Connected"}
            </p>
          </div>

          {userProfile.facebookConnected && connectedPages.length > 0 && (
            <div className="connected-pages">
              <strong>📄 Connected Pages:</strong>
              {connectedPages.map((page, idx) => (
                <div key={idx} className="page-card">
                  <div className="page-card-name">{page.pageName}</div>
                  {page.instagramBusinessId && (
                    <div className="instagram-info">
                      📷 Instagram: <strong>
                        {page.instagramUsername ? `@${page.instagramUsername}` : 'Connected'}
                      </strong>
                      <span className="instagram-id">ID: {page.instagramBusinessId}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h2>Connect Your Social Media</h2>
          <p style={{ color: "#666" }}>Connect Facebook, Instagram, Twitter & LinkedIn</p>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="action-buttons">
        <button
          onClick={userProfile?.facebookConnected ? handleFacebookDisconnect : handleFBLogin}
          className={`platform-btn btn-facebook ${userProfile?.facebookConnected ? 'disconnect' : ''}`}
        >
          {userProfile?.facebookConnected ? " Disconnect Facebook/IG" : "📘 Connect Facebook"}
        </button>

        <button
          onClick={twitterConnected ? handleTwitterDisconnect : handleTwitterConnect}
          disabled={twitterLoading}
          className={`platform-btn btn-twitter ${twitterConnected ? 'connected' : ''}`}
        >
          {twitterLoading ? "⏳ Loading..." : twitterConnected ? "Disconnect Twitter" : "Connect Twitter"}
        </button>

        <button
          onClick={linkedInConnected ? handleLinkedInDisconnect : handleLinkedInConnect}
          disabled={linkedInLoading}
          className={`platform-btn btn-linkedin ${linkedInConnected ? 'connected' : ''}`}
        >
          {linkedInLoading ? "⏳ Loading..." : linkedInConnected ? "🔗 Disconnect LinkedIn" : "🔗 Connect LinkedIn"}
        </button>

        <button onClick={openTutorial} className="platform-btn btn-tutorial">
          📹 View Tutorial
        </button>
      </div>

      {/* Twitter Info Box */}
      {twitterConnected && (
        <div className="platform-info-box twitter">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#1DA1F2">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <strong>@{twitterUsername}</strong>
          <p>✅ Ready to post to Twitter</p>
        </div>
      )}

      {/* LinkedIn Info Box */}
      {linkedInConnected && (
        <div className="platform-info-box linkedin">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#0077B5">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <strong>{linkedInName}</strong>
          <p>✅ Ready to post to LinkedIn</p>
        </div>
      )}
    </div>
  );
}

export default LogMedia;
