import React, { useState } from 'react';
import ApiKeyGate from './components/ApiKeyGate';
import StormApp from './components/StormApp';
import { ENV_MAPTILER_KEY, LOCALSTORAGE_KEY } from './constants';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    // Dev shortcut: if VITE_MAPTILER_KEY is set in .env, use it directly
    // and skip the gate. The .env file is gitignored — key never reaches git.
    if (ENV_MAPTILER_KEY) { return ENV_MAPTILER_KEY; }
    return localStorage.getItem(LOCALSTORAGE_KEY);
  });

  const handleKeyAccepted = (key: string) => {
    localStorage.setItem(LOCALSTORAGE_KEY, key);
    setApiKey(key);
  };

  if (!apiKey) {
    return <ApiKeyGate onKeyAccepted={handleKeyAccepted} />;
  }

  return <StormApp apiKey={apiKey} />;
}
