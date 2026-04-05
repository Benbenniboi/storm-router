import React, { useState } from 'react';
import ApiKeyGate from './components/ApiKeyGate';
import StormApp from './components/StormApp';
import { LOCALSTORAGE_KEY } from './constants';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() =>
    localStorage.getItem(LOCALSTORAGE_KEY),
  );

  const handleKeyAccepted = (key: string) => {
    localStorage.setItem(LOCALSTORAGE_KEY, key);
    setApiKey(key);
  };

  if (!apiKey) {
    return <ApiKeyGate onKeyAccepted={handleKeyAccepted} />;
  }

  return <StormApp apiKey={apiKey} />;
}
