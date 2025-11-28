// AutoPostApp.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";

function AutoPostApp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("ms_token");
    if (token) navigate("/home");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/admin/login", { username, password });
      localStorage.setItem("ms_token", res.data.token);
      localStorage.setItem("ms_user", JSON.stringify(res.data.user));
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>WELCOME TO TGSane-MediaShare</h1>

      <div style={{ margin: "30px 0" }}>
        <h2>Login with Username</h2>
        <form onSubmit={handleLogin} style={{ display: "inline-block" }}>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <br /><br />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <br /><br />
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>OR</h2>
        <p>Just click below to login with Facebook (easiest)</p>
        <button onClick={() => navigate("/home/connect")} style={{ padding: 12, fontSize: 16 }}>
          Continue with Facebook
        </button>
      </div>
    </div>
  );
}

export default AutoPostApp;