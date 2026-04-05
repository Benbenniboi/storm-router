import React from 'react';
import ReactDOM from 'react-dom/client';
// MapLibre CSS must be imported before index.css so Tailwind's base reset
// doesn't wipe MapLibre's canvas and control styles
import 'maplibre-gl/dist/maplibre-gl.css';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
