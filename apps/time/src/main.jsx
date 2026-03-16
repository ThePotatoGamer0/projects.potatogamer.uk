// src/main.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Settings from './Settings.jsx';
import './index.css';

function AppRouter() {
  // 1. Initialize state securely with the browser's natively parsed pathname
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // 2. Handle browser Back/Forward buttons smoothly
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (url) => {
    // 3. Push the new URL to the browser history
    window.history.pushState({}, '', url);
    // 4. Ask the browser for the clean pathname *after* it processes the push
    setCurrentPath(window.location.pathname);
  };

  // 5. Bulletproof check: catches /settings, /time/settings, and /time/settings/
  const isSettings = currentPath.toLowerCase().includes('/settings');

  return (
    <React.StrictMode>
      {isSettings 
        ? <Settings navigate={navigate} /> 
        : <App navigate={navigate} />}
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppRouter />);