// LogMedia.jsx - Fix to check facebookConnected
import React, { useEffect, useState } from "react";
import api from "./api";

const FB_APP_ID = (typeof import.meta !== "undefined" && import.meta.env?.VITE_FB_APP_ID) || process.env.REACT_APP_FB_APP_ID;

function LogMedia() {
  const [userProfile, setUserProfile] = useState(null);
  const [connectedPages, setConnectedPages] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

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
  }, []);

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
              // Connect Facebook to existing user account
              const res = await api.post("/user/connect/facebook", { 
                userAccessToken,
                userId: userProfile._id 
              });

              if (res.data.success) {
                // Update user profile to show FB connected
                const updatedUser = { ...userProfile, facebookConnected: true };
                localStorage.setItem("ms_user", JSON.stringify(updatedUser));
                setUserProfile(updatedUser);

                // Load pages
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
      {/* TUTORIAL MODAL */}
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

      {/* USER PROFILE SECTION */}
      {userProfile ? (
        <div style={{ marginBottom: 30, padding: 20, background: "#f0f2f5", borderRadius: 8 }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: 5 }}>
              👤 {userProfile.username}
            </h3>
            <p style={{ margin: 0, color: "#666", fontSize: 12 }}>
              {userProfile.facebookConnected ? "✅ Facebook Connected" : "❌ Facebook Not Connected"}
            </p>
          </div>

          {/* Connected Pages (only show if facebookConnected) */}
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
          <h2>Connect Your Facebook Page & Instagram</h2>
          <p style={{ color: "#666" }}>Click below to connect your social media</p>
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
          {userProfile?.facebookConnected ? "Reconnect / Add More Pages" : "Connect Facebook"}
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
    </div>
  );
}

export default LogMedia;
