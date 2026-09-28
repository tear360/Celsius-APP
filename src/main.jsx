import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { setupNative } from './platform/index.js';
import './styles.css';

setupNative();

const container = document.getElementById('root');
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
