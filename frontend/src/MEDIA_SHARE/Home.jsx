// Home.jsx
import React from 'react';
import Dashboard from './Dashboard';
import Display from './Display';
import './autopost.css';

function Home() {
  return (
    <div className="contain">
      <div className="dashboard"><Dashboard /></div>
      <div className="display"><Display /></div>
    </div>
  );
}

export default Home;