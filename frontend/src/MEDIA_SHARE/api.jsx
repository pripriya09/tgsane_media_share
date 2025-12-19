// src/api.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ;

const api = axios.create({
  baseURL,
  withCredentials: true,
  // do NOT set a global Content-Type here — let browser set it for FormData
});

// remove any accidental default that sets JSON for post
if (api.defaults && api.defaults.headers && api.defaults.headers.post) {
  delete api.defaults.headers.post["Content-Type"];
}

// attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ms_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

export default api;
