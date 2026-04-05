import React, { useState } from 'react';
import { ParsedAlert } from '../types';
import { EVENT_COLORS, SEVERITY_COLORS } from '../constants';
import { formatExpires, shortEventLabel } from '../utils/alerts';

interface Props {
  alerts: ParsedAlert[];
  loading: boolean;
  lastUpdated: Date | null;
  selectedId: string | null;
  onSelect: (alert: ParsedAlert) => void;
  onRefresh: () => void;
}

export default function AlertSidebar({ alerts, loading, lastUpdated, selectedId, onSelect, onRefresh }: Props) {
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? alerts.filter(a =>
        a.event.toLowerCase().includes(filter.toLowerCase()) ||
        a.areaDesc.toLowerCase().includes(filter.toLowerCase()) ||
        a.senderName.toLowerCase().includes(filter.toLowerCase()),
      )
    : alerts;

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 w-72 shrink-0">
      {/* Top bar */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z"/>
              <path d="M11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fill="#000"/>
            </svg>
            <span className="text-white font-bold text-sm">
              {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded disabled:opacity-40"
            title="Refresh alerts"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>

        {lastUpdated && (
          <div className="text-gray-500 text-[10px] mb-2">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <span className="ml-1 text-gray-600">· auto-refreshes every 60s</span>
          </div>
        )}

        <input
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by event, area, WFO…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {loading && alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <svg className="w-8 h-8 text-blue-400 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <span className="text-gray-400 text-sm">Fetching NWS alerts…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-4xl mb-3">🌤</div>
            <div className="text-gray-300 font-medium text-sm">No active warnings</div>
            <div className="text-gray-500 text-xs mt-1">
              {filter ? 'Clear filter to see all alerts' : 'Auto-refreshing every 60 seconds'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                selected={alert.id === selectedId}
                onClick={() => onSelect(alert)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, selected, onClick }: { alert: ParsedAlert; selected: boolean; onClick: () => void }) {
  const color = EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? '#AAA';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-3 py-3 transition-colors hover:bg-gray-800/70 relative
        ${selected ? 'bg-gray-800' : ''}
      `}
    >
      {selected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: color }} />
      )}
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 px-2 py-0.5 rounded text-black font-black text-[10px] shrink-0"
          style={{ backgroundColor: color }}
        >
          {shortEventLabel(alert.event)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-semibold leading-snug truncate">{alert.headline || alert.event}</div>
          <div className="text-gray-400 text-[11px] mt-0.5 truncate">{alert.areaDesc}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 text-[10px]">Exp {formatExpires(alert.expires)}</span>
            {alert.distanceMiles != null && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-gray-300 text-[10px] font-medium">
                  {alert.distanceMiles < 0.5 ? 'Inside' : `${alert.distanceMiles.toFixed(1)} mi`}
                </span>
              </>
            )}
            {alert.stormMotion && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-yellow-500/80 text-[10px]">{Math.round(alert.stormMotion.speedMph)} mph</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
