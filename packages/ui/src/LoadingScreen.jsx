import React from 'react';
import './LoadingScreen.css';

export const LoadingScreen = ({ isVisible }) => {
  return (
    <div className={`loader-overlay ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="loader-content">
        <div className="loader-bar"></div>
        <p>POTATOGAMER.UK</p>
      </div>
    </div>
  );
};