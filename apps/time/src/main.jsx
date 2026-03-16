// src/main.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Settings from './Settings.jsx';
import './index.css';

function AppRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  // Add a state to track when we are animating between pages
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Handle browser Back/Forward buttons with a fade
    const handlePopState = () => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentPath(window.location.pathname);
        setIsFading(false);
      }, 250);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (url) => {
    // Start the fade out
    setIsFading(true);

    // Wait 250ms for the fade to complete, then change the route
    setTimeout(() => {
      window.history.pushState({}, '', url);
      setCurrentPath(window.location.pathname);
      
      // Let React render the new page, then fade it back in
      requestAnimationFrame(() => {
        setIsFading(false);
      });
    }, 250); 
  };

  const isSettings = currentPath.toLowerCase().includes('/settings');

  return (
    <React.StrictMode>
      {/* Wrapper div that handles the smooth opacity transition */}
      <div 
        style={{ 
          opacity: isFading ? 0 : 1, 
          transition: 'opacity 0.25s ease-in-out',
          width: '100%',
          height: '100%'
        }}
      >
        {isSettings 
          ? <Settings navigate={navigate} /> 
          : <App navigate={navigate} />}
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppRouter />);