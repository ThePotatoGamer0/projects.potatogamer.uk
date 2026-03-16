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
    // Extract just the path to update the state
    setCurrentPath(url.split('?')[0]);
  };

  // Using .endsWith is foolproof across local Vite dev and Vercel production.
  // It instantly catches both "/settings" and "/time/settings".
  const isSettings = currentPath.endsWith('/settings') || currentPath.endsWith('/settings/');

  return (
    <React.StrictMode>
      {isSettings 
        ? <Settings navigate={navigate} /> 
        : <App navigate={navigate} />}
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppRouter />);