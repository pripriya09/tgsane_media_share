import React, { useEffect, useState } from "react";
import api from "./api";
import './dashboardmedia.css';

const FB_APP_ID = (typeof import.meta !== "undefined" && import.meta.env?.VITE_FB_APP_ID) || process.env.REACT_APP_FB_APP_ID;

function LogMedia() {
  const [userProfile, setUserProfile] = useState(null);
  const [connectedPages, setConnectedPages] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [instagramProfiles, setInstagramProfiles] = useState({}); 
  // Twitter states
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState("");
  const [twitterLoading, setTwitterLoading] = useState(false);

  // LinkedIn states
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [linkedInName, setLinkedInName] = useState("");
  const [linkedInLoading, setLinkedInLoading] = useState(false);

  // ✅ YouTube states - ADD THESE
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeChannelName, setYoutubeChannelName] = useState("");
  const [youtubeChannelImage, setYoutubeChannelImage] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("ms_tutorial_seen");
    if (seen === "true") {
      setHasSeenTutorial(true);
    } else {
      setShowTutorial(true);
    }

    checkFacebookConnection();
    checkTwitterConnection();
    checkLinkedInConnection();
    checkYouTubeConnection();

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

  const fetchInstagramProfiles = async (pages) => {
    try {
      const profiles = {};
      for (const page of pages) {
        if (page.instagramBusinessId) {
          try {
            // ✅ TEMPORARILY USE STATIC PROFILE PIC (backend not ready yet)
            profiles[page.instagramBusinessId] = {
              username: page.instagramUsername || 'instagram',
              profilePictureUrl: page.instagramProfilePicture || null,
            };
            console.log(`✅ Mock IG profile for ${page.instagramBusinessId}`);
          } catch (err) {
            console.warn(`Failed to fetch IG profile for ${page.instagramBusinessId}:`, err);
          }
        }
      }
      setInstagramProfiles(profiles);  // ✅ NOW THIS WORKS
    } catch (error) {
      console.error('Error fetching Instagram profiles:', error);
    }
  };
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
  }

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
          _id: realUserId,
          username: profile.username,
          email: profile.email,
          facebookConnected: profile.facebook?.connected || false,
          twitterConnected: profile.twitter?.connected || false,
          linkedInConnected: profile.linkedin?.connected || false,
          youtubeConnected: profile.youtube?.connected || false, // ✅ ADD THIS
          pages: profile.facebook?.pages || []
        };
        
        setUserProfile(user);
        localStorage.setItem("ms_user", JSON.stringify(user));
        
        console.log('✅ User profile loaded with real _id:', user._id);
        console.log('📊 Facebook connected:', user.facebookConnected);
        console.log('📺 YouTube connected:', user.youtubeConnected); // ✅ ADD THIS
        
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
          cachedUser._id = realUserId;
          
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
        
        // ✅ NEW: Fetch Instagram profiles for all pages
        // await fetchInstagramProfiles(pages);
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

  // ✅ ADD YOUTUBE CONNECTION CHECK
  const checkYouTubeConnection = async () => {
    try {
      const response = await api.get('/user/youtube/status');
      
      if (response.data.connected) {
        setYoutubeConnected(true);
        setYoutubeChannelName(response.data.channelName || '');
        setYoutubeChannelImage(response.data.channelImage || '');
        console.log('✅ YouTube connected:', response.data.channelName);
      }
    } catch (error) {
      console.error('Error checking YouTube status:', error);
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

  // ✅ ADD YOUTUBE CONNECT HANDLER

  const handleYouTubeConnect = async () => {
    setYoutubeLoading(true);
    try {
      console.log('🔗 Connecting to YouTube...');
      
      const response = await api.get('/user/youtube/auth');
  
      if (response.data.authUrl) {
        console.log('✅ Got auth URL:', response.data.authUrl);
        window.location.href = response.data.authUrl;
      } else {
        alert('Failed to get YouTube authorization URL');
        setYoutubeLoading(false);
      }
    } catch (error) {
      console.error('❌ YouTube connect error:', error);
      alert('Error connecting YouTube: ' + (error.response?.data?.error || error.message));
      setYoutubeLoading(false);
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

  // ✅ ADD YOUTUBE DISCONNECT HANDLER
  const handleYouTubeDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect YouTube?')) return;
  
    setYoutubeLoading(true);
    try {
      const response = await api.post('/user/youtube/disconnectYT');
  
      if (response.data.success) {
        setYoutubeConnected(false);
        setYoutubeChannelName('');
        setYoutubeChannelImage('');
        
        const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
        const updatedUser = { ...user, youtubeConnected: false };
        localStorage.setItem("ms_user", JSON.stringify(updatedUser));
        
        alert('✅ YouTube disconnected successfully');
      } else {
        alert('Failed to disconnect YouTube');
      }
    } catch (error) {
      console.error('YouTube disconnect error:', error);
      alert('Error disconnecting YouTube: ' + (error.response?.data?.error || error.message));
    } finally {
      setYoutubeLoading(false);
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

               // ✅ FIXED: Better success message for App Review!
               const hasInstagram = pages.some(page => page.instagramBusinessId);
               if (hasInstagram) {
                 alert("✅ Facebook & Instagram Connected Successfully!\n📄 Pages with Instagram: " + pages.filter(p => p.instagramBusinessId).length);
               } else {
                 alert("✅ Facebook Connected Successfully!\n⚠️ Connect Instagram Professional Account to your Facebook Page");
               }
 
               // ✅ NEW: Fetch Instagram profiles
               await fetchInstagramProfiles(pages);
              }
            } catch (err) {
              const errorMsg = err.response?.data?.error || err.message;
              alert("Connection failed: " + errorMsg);
            }
          })();
        }
      },
      {
        scope: "public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,business_management,pages_read_user_content,instagram_basic,instagram_content_publish,",

        // scope: "public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,business_management,pages_read_user_content,instagram_basic,instagram_content_publish,pages_messaging,pages_manage_metadata,pages_manage_engagement,instagram_manage_contents,",

      }
    );
  };

// LogMedia.jsx - UPDATE YOUR checkFacebookConnection FUNCTION

const checkFacebookConnection = async () => {
  try {
    console.log('📡 Checking Facebook connection status from server...');
    
    // ✅ ADD RETRY LOGIC
    let retries = 3;
    let profile = null;
    
    while (retries > 0 && !profile) {
      try {
        const response = await api.get('/user/profile');
        
        if (response.data.success && response.data.profile) {
          profile = response.data.profile;
          
          // ✅ VERIFY PROFILE HAS REQUIRED FIELDS
          if (!profile._id && !profile.id) {
            console.warn('⚠️ Profile missing _id, retrying...', retries);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }
          break;
        }
      } catch (err) {
        console.error(`❌ Profile fetch attempt failed (${retries} left):`, err.message);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!profile) {
      console.error('❌ Failed to load profile after retries');
      alert('⚠️ Failed to load profile. Please refresh the page.');
      return;
    }
    
    console.log('📊 Server response:', profile);
    
    // ✅ Get real _id from JWT token as fallback
    const token = localStorage.getItem("ms_token");
    if (!token) {
      alert('⚠️ No authentication token. Please log in again.');
      window.location.href = '/login';
      return;
    }
    
    let realUserId;
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      realUserId = tokenPayload.userId;
    } catch (tokenErr) {
      console.error('Failed to parse token:', tokenErr);
      alert('⚠️ Invalid session. Please log in again.');
      window.location.href = '/login';
      return;
    }
    
    // Update user profile with server data
    const updatedUser = {
      _id: profile._id || profile.id || realUserId, // ✅ TRIPLE FALLBACK
      username: profile.username || 'User',
      email: profile.email || '',
      facebookConnected: profile.facebook?.connected || false,
      twitterConnected: profile.twitter?.connected || false,
      linkedInConnected: profile.linkedin?.connected || false,
      youtubeConnected: profile.youtube?.connected || false
    };
    
    // ✅ VALIDATE BEFORE SETTING STATE
    if (!updatedUser._id) {
      console.error('❌ Could not determine user ID');
      alert('⚠️ Session error. Please log out and log in again.');
      return;
    }
    
    // Update state
    setUserProfile(updatedUser);
    
    // Update localStorage with fresh data
    localStorage.setItem("ms_user", JSON.stringify(updatedUser));
    
    // Update connection states
    setTwitterConnected(profile.twitter?.connected || false);
    setTwitterUsername(profile.twitter?.username || '');
    
    setLinkedInConnected(profile.linkedin?.connected || false);
    setLinkedInName(profile.linkedin?.name || '');
    
    setYoutubeConnected(profile.youtube?.connected || false);
    setYoutubeChannelName(profile.youtube?.channelName || '');
    setYoutubeChannelImage(profile.youtube?.channelImage || '');
    
    console.log('✅ User _id:', updatedUser._id);
    console.log('✅ Facebook connected:', updatedUser.facebookConnected);
    console.log('✅ Twitter connected:', updatedUser.twitterConnected);
    console.log('✅ LinkedIn connected:', updatedUser.linkedInConnected);
    console.log('✅ YouTube connected:', updatedUser.youtubeConnected);
    
    // Load pages if Facebook is connected
    if (profile.facebook?.connected) {
      await loadConnectedPages();
    }
    
  } catch (error) {
    console.error('❌ Error checking Facebook connection:', error);
    alert('⚠️ Failed to check connection status. Please refresh the page.');
  }
};


  const renderPageCard = (page, idx) => {
    return (
      <div key={idx} className="page-card">
        <div className="page-card-name">{page.pageName}</div>
        {page.instagramBusinessId && (
          <div className="instagram-info">
            📷 Instagram: 
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* ✅ DIRECT FROM BACKEND - No state needed! */}
              {page.instagramProfilePicture ? (
                <img 
                  src={page.instagramProfilePicture} 
                  alt={`@${page.instagramUsername}`}
                  style={{
                    width: '32px', height: '32px', 
                    borderRadius: '50%', 
                    border: '2px solid #E4405F'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <div style={{
                  width: '32px', height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: '#E4405F',
                  display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: 'white', 
                  fontSize: '12px', fontWeight: 'bold'
                }}>
                  IG
                </div>
              )}
              <strong>@{page.instagramUsername || 'Connected'}</strong>
              <span className="instagram-id">ID: {page.instagramBusinessId}</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  
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
              <br />
              {/* ✅ ADD YOUTUBE STATUS */}
              {youtubeConnected ? `✅ YouTube Connected (${youtubeChannelName})` : "❌ YouTube Not Connected"}
            </p>
          </div>
          

          {userProfile.facebookConnected && connectedPages.length > 0 && (
            <div className="connected-pages">
              <strong>📄 Connected Pages:</strong>
              {connectedPages.map((page, idx) => renderPageCard(page, idx))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h2>Connect Your Social Media</h2>
          <p style={{ color: "#666" }}>Connect Facebook, Instagram, Twitter, LinkedIn & YouTube</p>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="action-buttons">
        <button
          onClick={userProfile?.facebookConnected ? handleFacebookDisconnect : handleFBLogin}
          className={`platform-btn btn-facebook ${userProfile?.facebookConnected ? 'disconnect' : ''}`}
        >
          {userProfile?.facebookConnected ? "📘 Disconnect Facebook/IG" : "📘 Connect Facebook"}
        </button>

        <button
          onClick={twitterConnected ? handleTwitterDisconnect : handleTwitterConnect}
          disabled={twitterLoading}
          className={`platform-btn btn-twitter ${twitterConnected ? 'connected' : ''}`}
        >
          {twitterLoading ? "⏳ Loading..." : twitterConnected ? "🐦 Disconnect Twitter" : "🐦 Connect Twitter"}
        </button>

        <button
          onClick={linkedInConnected ? handleLinkedInDisconnect : handleLinkedInConnect}
          disabled={linkedInLoading}
          className={`platform-btn btn-linkedin ${linkedInConnected ? 'connected' : ''}`}
        >
          {linkedInLoading ? "⏳ Loading..." : linkedInConnected ? "🔗 Disconnect LinkedIn" : "🔗 Connect LinkedIn"}
        </button>

        {/* ✅ ADD YOUTUBE BUTTON */}
        <button
          onClick={youtubeConnected ? handleYouTubeDisconnect : handleYouTubeConnect}
          disabled={youtubeLoading}
          className={`platform-btn btn-youtube ${youtubeConnected ? 'connected' : ''}`}
        >
          {youtubeLoading ? "⏳ Loading..." : youtubeConnected ? "📺 Disconnect YouTube" : "📺 Connect YouTube"}
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

      {/* ✅ ADD YOUTUBE INFO BOX */}
      {youtubeConnected && (
        <div className="platform-info-box youtube">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#FF0000">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          {youtubeChannelImage && (
            <img 
              src={youtubeChannelImage} 
              alt={youtubeChannelName}
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                marginRight: '10px',
                border: '2px solid #FF0000'
              }}
            />
          )}
          <strong>{youtubeChannelName}</strong>
          <p>✅ Ready to upload videos to YouTube</p>
        </div>
      )}
    </div>
  );
}

export default LogMedia;
