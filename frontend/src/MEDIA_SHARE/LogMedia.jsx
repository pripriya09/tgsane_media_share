// src/MEDIA_SHARE/LogMedia.jsx
import React, { useEffect, useState } from "react";
import api from "./api";

const FB_APP_ID = (typeof import.meta !== "undefined" && import.meta.env?.VITE_FB_APP_ID) || process.env.REACT_APP_FB_APP_ID;

function LogMedia() {
  const [userData, setUserData] = useState(null);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false); // ← ADDED THIS LINE

  useEffect(() => {
    // Load Facebook SDK
    (function (d, s, id) {
      let js,
        fjs = d.getElementsByTagName(s)[0];
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

  const loginToAppWithFB = async (userAccessToken) => {
    try {
      const res = await api.post("/admin/login-with-facebook", { userAccessToken });
      const { token, user } = res.data || {};
      if (token && user) {
        localStorage.setItem("ms_token", token);
        localStorage.setItem("ms_user", JSON.stringify(user));
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
    <div style={{ padding: 16, textAlign: "center" }}>
      <h2>Connect Your Facebook Page & Instagram</h2>

      {/* TUTORIAL MODAL — ONLY SHOWS FIRST TIME */}
      {!hasSeenTutorial && (
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
            }}
          >
            <h2>Quick Guide: How to Connect (30 sec)</h2>
            {/* Meta’s Official Tutorial (they LOVE this in review)
https://www.youtube.com/watch?v=Zp6J5wzb2Zc
(embed ID: Zp6J5wzb2Zc) */}

{/* Short & Sweet (25 seconds)
https://www.youtube.com/watch?v=9t6m1d0fX8k
(embed ID: 9t6m1d0fX8k) */}

            <iframe
                 width="100%"
               height="315"
               src="https://www.youtube.com/embed/Zp6J5wzb2Zc"   // ← THIS ONE IS BEST
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
              onClick={() => setHasSeenTutorial(true)}
              style={{ padding: "12px 24px", fontSize: 18, background: "#1877f2", color: "white", border: "none", borderRadius: 8 }}
            >
              I Understand → Connect Now
            </button>
          </div>
        </div>
      )}

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

      {userData && (
        <div style={{ marginTop: 20, padding: 16, background: "#f0f2f5", borderRadius: 8 }}>
          <strong>Connected Page:</strong> {userData.pageName} <br />
          <strong>Instagram Ready:</strong> Yes
        </div>
      )}
    </div>
  );
}

export default LogMedia;