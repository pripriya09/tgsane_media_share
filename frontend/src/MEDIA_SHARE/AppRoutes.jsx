// AppRoutes.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AutoPostApp from './AutoPostApp';
import Home from './Home';
import LogMedia from './LogMedia';
import CreatePost from './CreatePost';
import PostsHistory from './PostsHistory'; // ← NEW IMPORT

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AutoPostApp />} />
        <Route path="/home" element={<Home />}>
          <Route index element={<LogMedia />} />
          <Route path="connect" element={<LogMedia />} />
          <Route path="create" element={<CreatePost />} />
          <Route path="history" element={<PostsHistory />} /> {/* ← NEW ROUTE */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
