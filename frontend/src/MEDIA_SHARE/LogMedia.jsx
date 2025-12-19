// LogMedia.jsx - Complete with Popup Windows for Twitter & LinkedIn
import React, { useEffect, useState } from "react";
import api from "./api";

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
    // Check tutorial
    const seen = localStorage.getItem("ms_tutorial_seen");
    if (seen === "true") {
      setHasSeenTutorial(true);
    } else {
      setShowTutorial(true);
    }

    // Load user profile
    loadUserProfile();
    loadConnectedPages();
    checkTwitterConnection();
    checkLinkedInConnection();

    // ✅ Listen for popup window messages
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

  // ✅ Handle messages from popup windows
  const handleOAuthMessage = (event) => {
    // Security: validate origin
    if (event.origin !== window.location.origin) return;
     // ✅ For development, accept from any origin
    // ⚠️ In production, validate: if (event.origin !== window.location.origin) return;
    console.log('Received message:', event.data);

    if (event.data.type === 'TWITTER_CONNECTED') {
      setTwitterConnected(true);
      setTwitterUsername(event.data.username || '');
      setTwitterLoading(false);
      alert('✅ Twitter connected successfully!');
    } else if (event.data.type === 'TWITTER_ERROR') {
      setTwitterLoading(false);
      alert('❌ Twitter connection failed: ' + event.data.error);
    }  else if (event.data.type === 'LINKEDIN_CONNECTED') {
      console.log('LinkedIn connected!', event.data.name);
      setLinkedInConnected(true);
      setLinkedInName(event.data.name || '');
      setLinkedInLoading(false);
      alert('✅ LinkedIn connected successfully!');
    } else if (event.data.type === 'LINKEDIN_ERROR') {
      console.log('LinkedIn error:', event.data.error);
      setLinkedInLoading(false);
      alert('❌ LinkedIn connection failed: ' + event.data.error);
    }
  };

  const loadUserProfile = () => {
    try {
      const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (user?._id) {
        setUserProfile(user);
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
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

  // ✅ Connect Twitter with popup
  const handleTwitterConnect = async () => {
    setTwitterLoading(true);
    try {
      const response = await api.post('/user/twitter/auth/request');

      if (response.data.success) {
        // Open popup window
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

  // ✅ Connect LinkedIn with popup
  const handleLinkedInConnect = async () => {
    setLinkedInLoading(true);
    try {
      const response = await api.get('/user/linkedin/auth');
  
      if (response.data.authUrl) {
        // ✅ Instead of popup, redirect current window
        window.location.href = response.data.authUrl;
        // User will be redirected back after OAuth
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
      const response = await api.post('/user/twitter/disconnect');

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
      const response = await api.post('/user/linkedin/disconnect');

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
        } else {
          console.log("User cancelled login");
        }
      },
      {
        scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
      }
    );
  };

  return (
    <div style={{ padding: 16 }}>
      {/* TUTORIAL MODAL - keep your existing code */}
      {showTutorial && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.8)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            background: "white",
            padding: 20,
            borderRadius: 12,
            maxWidth: 600,
            textAlign: "center",
            position: "relative",
          }}>
            <button
              onClick={closeTutorial}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "transparent",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <h2>How to Connect Facebook & Instagram (30 sec)</h2>
            <iframe
              width="100%"
              height="315"
              src="https://www.youtube.com/embed/Zp6J5wzb2Zc"
              title="How to connect Facebook Page & Instagram"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <p style={{ margin: "20px 0", fontSize: 16 }}>
              You need: <br />
              • A Facebook Page (not personal profile) <br />
              • Connected to Instagram Professional/Business account
            </p>
            <button
              onClick={closeTutorial}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                background: "#1877f2",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              I Understand → Connect Now
            </button>
          </div>
        </div>
      )}

      {/* USER PROFILE SECTION - keep your existing code */}
      {userProfile ? (
        <div style={{ marginBottom: 30, padding: 20, background: "#f0f2f5", borderRadius: 8 }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: 5 }}>
              👤 {userProfile.username}
            </h3>
            <p style={{ margin: 0, color: "#666", fontSize: 12 }}>
              {userProfile.facebookConnected ? "✅ Facebook Connected" : "❌ Facebook Not Connected"}
              <br />
              {twitterConnected ? `✅ Twitter Connected (@${twitterUsername})` : "❌ Twitter Not Connected"}
              <br />
              {linkedInConnected ? `✅ LinkedIn Connected (${linkedInName})` : "❌ LinkedIn Not Connected"}
            </p>
          </div>

          {userProfile.facebookConnected && connectedPages.length > 0 && (
            <div style={{ marginTop: 15, paddingTop: 15, borderTop: "1px solid #ddd" }}>
              <strong>📄 Connected Pages:</strong>
              {connectedPages.map((page, idx) => (
                <div key={idx} style={{ marginTop: 8, padding: 10, background: "white", borderRadius: 6 }}>
                  <div>{page.pageName}</div>
                  {page.instagramBusinessId && (
                    <div style={{ fontSize: 12, color: "#666" }}>
                      📷 Instagram: Connected
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
      <div style={{ textAlign: "center", display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={handleFBLogin}
          style={{
            padding: "14px 32px",
            fontSize: 16,
            background: userProfile?.facebookConnected ? "#42b72a" : "#1877f2",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {userProfile?.facebookConnected ? "📘 Reconnect / Add More Pages" : "📘 Connect Facebook"}
        </button>

        <button
          onClick={twitterConnected ? handleTwitterDisconnect : handleTwitterConnect}
          disabled={twitterLoading}
          style={{
            padding: "14px 32px",
            fontSize: 16,
            background: twitterConnected ? "#42b72a" : "#1DA1F2",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: twitterLoading ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: twitterLoading ? 0.6 : 1,
          }}
        >
          {twitterLoading ? "⏳ Loading..." : twitterConnected ? "🐦 Disconnect Twitter" : "🐦 Connect Twitter"}
        </button>

        <button
          onClick={linkedInConnected ? handleLinkedInDisconnect : handleLinkedInConnect}
          disabled={linkedInLoading}
          style={{
            padding: "14px 32px",
            fontSize: 16,
            background: linkedInConnected ? "#42b72a" : "#0077B5",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: linkedInLoading ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: linkedInLoading ? 0.6 : 1,
          }}
        >
          {linkedInLoading ? "⏳ Loading..." : linkedInConnected ? "🔗 Disconnect LinkedIn" : "🔗 Connect LinkedIn"}
        </button>

        <button
          onClick={openTutorial}
          style={{
            padding: "14px 32px",
            fontSize: 16,
            background: "#fff",
            color: "#1877f2",
            border: "2px solid #1877f2",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📹 View Tutorial
        </button>
      </div>

      {/* Info boxes - keep your existing code */}
      {twitterConnected && (
        <div style={{
          marginTop: 20,
          padding: 15,
          background: "#e7f3ff",
          border: "1px solid #1DA1F2",
          borderRadius: 8,
          textAlign: "center"
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#1DA1F2" style={{ verticalAlign: 'middle', marginRight: 10 }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <strong style={{ color: "#1DA1F2", fontSize: 18 }}>
            @{twitterUsername}
          </strong>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#666" }}>
            ✅ Ready to post to Twitter
          </p>
        </div>
      )}

      {linkedInConnected && (
        <div style={{
          marginTop: 20,
          padding: 15,
          background: "#e7f4ff",
          border: "1px solid #0077B5",
          borderRadius: 8,
          textAlign: "center"
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#0077B5" style={{ verticalAlign: 'middle', marginRight: 10 }}>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <strong style={{ color: "#0077B5", fontSize: 18 }}>
            {linkedInName}
          </strong>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#666" }}>
            ✅ Ready to post to LinkedIn
          </p>
        </div>
      )}
    </div>
  );
}

export default LogMedia;
