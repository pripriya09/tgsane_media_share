// Home.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Dashboard from './Dashboard';
import './autopost.css';

function Home() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar Navigation */}
      <Dashboard />
      
      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "20px", backgroundColor: "#fafafa" }}>
        <Outlet />
      </div>
    </div>
  );
}

export default Home;
