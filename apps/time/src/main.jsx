// src/main.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Settings from './Settings.jsx';
import './index.css';

function AppRouter() {
  // Store the current URL path in React state
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen for the user clicking the browser's native Back/Forward arrows
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // A custom function to change the URL without refreshing the page
  const navigate = (url) => {
    window.history.pushState({}, '', url);
    // Extract just the path (e.g., '/time/settings') to update the state
    setCurrentPath(url.split('?')[0]);
  };

  // Strict path checking to ensure we route correctly within the /time app
  const isSettings = currentPath === '/time/settings' || currentPath === '/time/settings/';

  return (
    <React.StrictMode>
      {isSettings 
        ? <Settings navigate={navigate} /> 
        : <App navigate={navigate} />}
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppRouter />);