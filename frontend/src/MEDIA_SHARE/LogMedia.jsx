// src/MEDIA_SHARE/LogMedia.jsx
import React, { useEffect, useState } from "react";
import api from "./api";

const FB_APP_ID = (typeof import.meta !== "undefined" && import.meta.env?.VITE_FB_APP_ID) || process.env.REACT_APP_FB_APP_ID;

function LogMedia() {
  const [userData, setUserData] = useState(null);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [connectedPages, setConnectedPages] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Check if user has seen tutorial before
    const seen = localStorage.getItem("ms_tutorial_seen");
    if (seen === "true") {
      setHasSeenTutorial(true);
    } else {
      setShowTutorial(true); // Show on first visit
    }

    // Load user profile if logged in
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

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    
    localStorage.removeItem("ms_token");
    localStorage.removeItem("ms_user");
    localStorage.removeItem("ms_pages");
    localStorage.removeItem("facebook_userAccessToken");
    
    setUserProfile(null);
    setConnectedPages([]);
    
    alert("Logged out successfully");
    window.location.href = "/"; // Redirect to landing page
  };

  const loginToAppWithFB = async (userAccessToken) => {
    try {
      const res = await api.post("/admin/login-with-facebook", { userAccessToken });
      const { token, user } = res.data || {};
      if (token && user) {
        localStorage.setItem("ms_token", token);
        localStorage.setItem("ms_user", JSON.stringify(user));
        setUserProfile(user);
        console.log("DEBUG: App login via FB success", user);
      }
    } catch (err) {
      console.error("Error logging in to app via FB:", err.response?.data || err.message);
    }
  };

  async function connectToBackend(userAccessToken) {
    try {
      const ms_user = JSON.parse(localStorage.getItem("ms_user") || "{}");
      if (!ms_user?._id) {
        console.warn("connectToBackend: no ms_user in storage");
        return null;
      }
      console.log("Connecting FB to backend for user:", ms_user._id);
      const res = await api.post("/user/connect/facebook", {
        userAccessToken,
        userId: ms_user._id,
      });
      console.log("connect/facebook response:", res.data);

      if (res.data?.pages) {
        localStorage.setItem("ms_pages", JSON.stringify(res.data.pages));
        setConnectedPages(res.data.pages);
      }

      return res.data;
    } catch (err) {
      console.error("Error connecting FB to backend:", err.response?.data || err.message);
      return null;
    }
  }

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
              await loginToAppWithFB(userAccessToken);
              const connectResponse = await connectToBackend(userAccessToken);
              const newPages = connectResponse?.pages || [];

              window.dispatchEvent(new CustomEvent("pagesUpdated", { detail: { pages: newPages } }));
              alert("Facebook connected successfully!");
              loadConnectedPages();
            } catch (err) {
              console.error("Facebook connect failed:", err);
              alert("Connection failed: " + (err.response?.data?.error || err.message));
            }
          })();
        } else {
          console.log("User cancelled login or didn't authorize");
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
        <div
          style={{
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
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 12,
              maxWidth: 600,
              textAlign: "center",
              position: "relative",
            }}
          >
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
            <h2>Quick Guide: How to Connect (30 sec)</h2>
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
              • A Facebook Page (not profile) <br />
              • That Page connected to an Instagram Professional/Business account
            </p>
            <button
              onClick={closeTutorial}
              style={{
                padding: "12px 24px",
                fontSize: 18,
                background: "#1877f2",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, marginBottom: 5 }}>👤 {userProfile.username}</h3>
              <p style={{ margin: 0, color: "#666" }}>Role: {userProfile.role}</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>

          {/* Connected Pages */}
          {connectedPages.length > 0 && (
            <div style={{ marginTop: 15, paddingTop: 15, borderTop: "1px solid #ddd" }}>
              <strong>Connected Pages:</strong>
              {connectedPages.map((page, idx) => (
                <div key={idx} style={{ marginTop: 8, padding: 10, background: "white", borderRadius: 6 }}>
                  <div>📄 {page.pageName}</div>
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
          <p style={{ color: "#666" }}>Login to start posting to your social media</p>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div style={{ textAlign: "center" }}>
        {!userProfile ? (
          <button
            onClick={handleFBLogin}
            style={{
              padding: "14px 32px",
              fontSize: 18,
              background: "#1877f2",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Login with Facebook
          </button>
        ) : (
          <button
            onClick={handleFBLogin}
            style={{
              padding: "14px 32px",
              fontSize: 18,
              background: "#42b72a",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Reconnect / Add More Pages
          </button>
        )}

        {/* Tutorial Button */}
        <button
          onClick={openTutorial}
          style={{
            marginLeft: 10,
            padding: "14px 32px",
            fontSize: 18,
            background: "#fff",
            color: "#1877f2",
            border: "2px solid #1877f2",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          📹 View Tutorial
        </button>
      </div>
    </div>
  );
}

export default LogMedia;
