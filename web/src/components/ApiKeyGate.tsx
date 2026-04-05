import React, { useState } from 'react';
import { MAPTILER_VALIDATE_URL } from '../constants';

interface Props {
  onKeyAccepted: (key: string) => void;
}

type ValidationState = 'idle' | 'checking' | 'valid' | 'invalid' | 'network-error';

export default function ApiKeyGate({ onKeyAccepted }: Props) {
  const [key, setKey] = useState('');
  const [state, setState] = useState<ValidationState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const validate = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setErrorMsg('Paste your MapTiler API key above.');
      setState('invalid');
      return;
    }

    setState('checking');
    setErrorMsg('');

    try {
      const res = await fetch(MAPTILER_VALIDATE_URL(trimmed), { method: 'HEAD' });

      if (res.ok) {
        setState('valid');
        // Brief pause so the user sees the success state
        setTimeout(() => onKeyAccepted(trimmed), 600);
      } else if (res.status === 401 || res.status === 403) {
        setState('invalid');
        setErrorMsg('Key rejected by MapTiler — double-check it and try again.');
      } else {
        setState('invalid');
        setErrorMsg(`Unexpected response (HTTP ${res.status}). Try again.`);
      }
    } catch {
      setState('network-error');
      setErrorMsg('Could not reach MapTiler — check your internet connection.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validate();
  };

  const isChecking = state === 'checking';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated storm background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Logo / title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-900 border border-gray-800 mb-5 shadow-xl">
            <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Cloud */}
              <ellipse cx="32" cy="28" rx="18" ry="10" fill="#374151"/>
              <ellipse cx="22" cy="31" rx="10" ry="8" fill="#374151"/>
              <ellipse cx="42" cy="31" rx="10" ry="8" fill="#374151"/>
              {/* Lightning */}
              <path d="M35 18 L26 34 L33 34 L29 50 L42 28 L34 28 Z" fill="#F59E0B"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">StormRouter</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            Storm chaser intercept planner<br />
            Live NWS alerts · Free OSRM routing · No subscriptions
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-1">Enter your MapTiler API key</h2>
          <p className="text-gray-400 text-sm mb-5">
            StormRouter uses{' '}
            <a
              href="https://www.maptiler.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              MapTiler
            </a>{' '}
            for map tiles.{' '}
            <a
              href="https://cloud.maptiler.com/auth/widget?mode=add"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              Create a free account
            </a>{' '}
            — the free tier gives you 100,000 tile loads per month. Your key is stored only in your browser.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-1.5">
                API Key
              </label>
              <div className="relative">
                <input
                  id="api-key"
                  type="text"
                  value={key}
                  onChange={e => { setKey(e.target.value); setState('idle'); setErrorMsg(''); }}
                  onKeyDown={e => e.key === 'Enter' && validate()}
                  placeholder="Paste your MapTiler key here…"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isChecking || state === 'valid'}
                  className={`
                    w-full px-4 py-3 rounded-lg bg-gray-800 text-white text-sm font-mono
                    border outline-none transition-all duration-200 pr-10
                    placeholder:text-gray-600
                    ${state === 'valid'   ? 'border-green-500 bg-green-950/30' : ''}
                    ${state === 'invalid' || state === 'network-error' ? 'border-red-500 bg-red-950/20' : ''}
                    ${state === 'idle' || state === 'checking' ? 'border-gray-700 focus:border-blue-500' : ''}
                    disabled:opacity-60
                  `}
                />
                {/* Status icon inside input */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {state === 'checking' && (
                    <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  )}
                  {state === 'valid' && (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                  {(state === 'invalid' || state === 'network-error') && (
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  )}
                </div>
              </div>

              {/* Error / success messages */}
              {errorMsg && (
                <p className="mt-2 text-sm text-red-400 flex items-start gap-1.5">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {errorMsg}
                </p>
              )}
              {state === 'valid' && (
                <p className="mt-2 text-sm text-green-400 flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  Key verified — loading StormRouter…
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isChecking || state === 'valid' || !key.trim()}
              className={`
                w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200
                ${isChecking || state === 'valid'
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : !key.trim()
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 active:scale-[0.98]'
                }
              `}
            >
              {isChecking ? 'Verifying with MapTiler…' : state === 'valid' ? 'Launching…' : 'Verify & Enter StormRouter'}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-gray-600 text-xs mt-5">
          Your key is saved in <code className="text-gray-500">localStorage</code> and never leaves your browser.
          &nbsp;·&nbsp;
          <a
            href="https://github.com/Benbenniboi/storm-router"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors"
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
