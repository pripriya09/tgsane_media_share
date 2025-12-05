// Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";

const FB_APP_ID = (typeof import.meta !== "undefined" && import.meta.env?.VITE_FB_APP_ID) || process.env.REACT_APP_FB_APP_ID;

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("ms_token");
    const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
    if (token && user?._id) {
      // Redirect based on role
      if (user.role === "admin" || user.role === "superAdmin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/home");
      }
    }

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
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/admin/login", { username, password });
      const { token, user } = res.data || {};
      if (!token || !user) throw new Error("Invalid response from server");

      // Save auth info
      localStorage.setItem("ms_token", token);
      localStorage.setItem("ms_user", JSON.stringify(user));

      // Redirect by role
      if (user.role === "admin" || user.role === "superAdmin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFBLogin = () => {
    if (!window.FB) {
      alert("Facebook SDK not loaded. Please refresh and try again.");
      return;
    }

    FB.login(
      (response) => {
        if (response.authResponse) {
          const userAccessToken = response.authResponse.accessToken;
          localStorage.setItem("facebook_userAccessToken", userAccessToken);

          (async () => {
            try {
              // Try to login with FB
              const res = await api.post("/admin/login-with-facebook", { userAccessToken });
              
              if (res.data.token && res.data.user) {
                localStorage.setItem("ms_token", res.data.token);
                localStorage.setItem("ms_user", JSON.stringify(res.data.user));
                
                // Load pages
                const pagesRes = await api.get("/user/pages");
                const pages = pagesRes.data?.pages || [];
                localStorage.setItem("ms_pages", JSON.stringify(pages));
                
                alert("✅ Facebook connected successfully!");
                navigate("/home");
              }
            } catch (err) {
              // User not found in DB
              const errorMsg = err.response?.data?.error || err.message;
              if (err.response?.status === 403) {
                alert(
                  "❌ Account not found!\n\n" + 
                  errorMsg + 
                  "\n\nPlease ask your administrator to create an account for you."
                );
              } else {
                alert("Connection failed: " + errorMsg);
              }
            }
          })();
        } else {
          console.log("User cancelled Facebook login");
        }
      },
      {
        scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
      }
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
      padding: 20
    }}>
      <div style={{
        background: "white",
        padding: "40px 30px",
        borderRadius: 12,
        boxShadow: "0 15px 40px rgba(0,0,0,0.35)",
        maxWidth: 480,
        width: "100%"
      }}>
        <h1 style={{ 
          textAlign: "center", 
          marginBottom: 10, 
          fontSize: 24, 
          color: "#222" 
        }}>
          WELCOME TO TGSane-MediaShare
        </h1>
        <p style={{ 
          textAlign: "center", 
          marginTop: 0, 
          marginBottom: 30, 
          color: "#666", 
          fontSize: 14 
        }}>
          Login with your credentials or Facebook account
        </p>

        {/* Username / Password Login */}
        <div style={{ marginBottom: 30 }}>
          <h2 style={{ fontSize: 18, marginBottom: 15, textAlign: "center" }}>
            Login with Credentials
          </h2>
          <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Username
            </label>
            <input
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 14,
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
                boxSizing: "border-box"
              }}
            />
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 16,
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
                boxSizing: "border-box"
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                background: loading ? "#ccc" : "#1e88e5",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          {error && <p style={{ color: "red", marginTop: 10, textAlign: "center" }}>{error}</p>}
        </div>

        {/* Divider */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          margin: "20px 0",
          gap: 10
        }}>
          <div style={{ flex: 1, height: 1, background: "#eee" }} />
          <span style={{ color: "#999", fontSize: 12, fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#eee" }} />
        </div>

        {/* Facebook Login */}
        <div style={{ marginTop: 20 }}>
          <p style={{ 
            textAlign: "center", 
            color: "#666", 
            fontSize: 14, 
            marginBottom: 12 
          }}>
            Continue with Facebook (if admin approved your account):
          </p>
          <button
            type="button"
            onClick={handleFBLogin}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 15,
              background: "#1877f2",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            Continue with Facebook
          </button>
        </div>

        <p style={{ 
          marginTop: 20, 
          textAlign: "center",
          color: "#999", 
          fontSize: 12 
        }}>
          Need an account? Ask your administrator to create one.
        </p>
      </div>
    </div>
  );
}

export default Login;
