// Home.jsx - NO MAJOR CHANGES NEEDED
import React from 'react';
import { Outlet } from 'react-router-dom';
import Dashboard from './Dashboard';
import './autopost.css';

function Home() {
  return (
    <div style={{ display: "flex" }}>
      <Dashboard />
      <div style={{ 
        marginLeft: "280px", // Match sidebar width
        flex: 1, 
        padding: "20px",
        transition: "margin-left 0.3s"
      }}>
        <Outlet />
      </div>
    </div>
  );
}

export default Home;
