// // AppRoutes.jsx
// import React from 'react';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import AutoPostApp from './AutoPostApp';
// import Home from './Home';
// import LogMedia from './LogMedia';
// import CreatePost from './CreatePost';
// import PostsHistory from './PostsHistory'; // ← NEW IMPORT

// function AppRoutes() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<AutoPostApp />} />
//         <Route path="/home" element={<Home />}>
//           <Route index element={<LogMedia />} />
//           <Route path="connect" element={<LogMedia />} />
//           <Route path="create" element={<CreatePost />} />
//           <Route path="history" element={<PostsHistory />} /> {/* ← NEW ROUTE */}
//         </Route>
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default AppRoutes;

// AppRoutes.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import Home from './Home';
import LogMedia from './LogMedia';
import CreatePost from './CreatePost';
import PostsHistory from './PostsHistory';
import TwitterCallback from './TwitterCallback'; // ✅ ADD THIS
import SchedulePost from './SchedulePost'
// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }) {
  const user = JSON.parse(localStorage.getItem("ms_user") || "{}");
  
  if (!user?._id) {
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && user.role !== "admin" && user.role !== "superAdmin") {
    return <Navigate to="/home" />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main entry point - Login page */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* ✅ ADD: Twitter OAuth Callback Route (outside protected routes) */}
        <Route path="/auth/twitter/callback" element={<TwitterCallback />} />
      
        {/* Admin Routes */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* User Routes */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        >
          <Route index element={<LogMedia />} />
          <Route path="connect" element={<LogMedia />} />
          <Route path="create" element={<CreatePost />} />
          <Route path="schedule" element={<SchedulePost />} />
          <Route path="history" element={<PostsHistory />} />
        </Route>

        {/* Catch-all for undefined routes */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
