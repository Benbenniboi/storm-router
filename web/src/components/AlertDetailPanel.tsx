import React from 'react';
import { ParsedAlert, RouteResult } from '../types';
import { EVENT_COLORS, SEVERITY_COLORS } from '../constants';
import { bearingToCardinal, etaMinutes, formatExpires, shortEventLabel } from '../utils/alerts';

interface Props {
  alert: ParsedAlert;
  route: RouteResult | null;
  routeLoading: boolean;
  onClose: () => void;
  onNavigate: () => void;
  hasLocation: boolean;
  onSetLocation: () => void;
}

export default function AlertDetailPanel({ alert, route, routeLoading, onClose, onNavigate, hasLocation, onSetLocation }: Props) {
  const color = EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? '#AAA';

  const distStr = alert.distanceMiles != null
    ? alert.distanceMiles < 0.5 ? 'Inside warning' : `${alert.distanceMiles.toFixed(1)} mi away`
    : 'Distance unknown';

  const stormEta = (() => {
    if (!alert.stormMotion || !alert.distanceMiles) { return null; }
    const mins = etaMinutes(alert.distanceMiles, alert.stormMotion.speedMph);
    return mins != null ? `~${Math.round(mins)} min` : null;
  })();

  return (
    <div className="animate-slide-in absolute right-0 top-0 bottom-0 w-[380px] bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-gray-800">
        <div
          className="mt-0.5 px-2.5 py-1 rounded-md text-black font-black text-xs shrink-0"
          style={{ backgroundColor: color }}
        >
          {shortEventLabel(alert.event)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm leading-snug">{alert.event}</div>
          <div className="text-gray-400 text-xs mt-0.5">{alert.senderName}</div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 -mt-1 -mr-1 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-gray-800">
        <StatCard label="Distance" value={distStr} />
        <StatCard label="Expires" value={formatExpires(alert.expires)} />
        <StatCard
          label="Drive ETA"
          value={route ? `${Math.round(route.durationMinutes)} min` : '—'}
        />
      </div>

      {/* Storm motion */}
      {alert.stormMotion && (
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Storm motion</span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm">
              Moving <span className="font-bold" style={{ color }}>{bearingToCardinal(alert.stormMotion.directionDeg)}</span>
            </span>
            <span className="text-gray-500">·</span>
            <span className="text-white text-sm">
              <span className="font-bold" style={{ color }}>{Math.round(alert.stormMotion.speedMph)} mph</span>
            </span>
            {stormEta && (
              <>
                <span className="text-gray-500">·</span>
                <span className="text-yellow-400 text-sm font-semibold">{stormEta} to arrival</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Intercept button */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={hasLocation ? onNavigate : onSetLocation}
            disabled={routeLoading || !alert.interceptPoint}
            className={`
              w-full py-2.5 px-4 rounded-lg text-sm font-semibold border transition-all duration-200
              ${routeLoading || !alert.interceptPoint
                ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                : 'border-opacity-100 hover:opacity-80 active:scale-[0.98]'
              }
            `}
            style={alert.interceptPoint && !routeLoading
              ? { borderColor: color, color }
              : undefined
            }
          >
            {routeLoading
              ? 'Routing…'
              : !hasLocation
                ? 'Set your location to route'
                : route
                  ? `Re-route — ${route.distanceMiles.toFixed(1)} mi · ${Math.round(route.durationMinutes)} min`
                  : 'Route to Intercept Point'
            }
          </button>
          {!alert.interceptPoint && (
            <p className="text-gray-500 text-xs mt-2 text-center">No storm motion data — intercept unavailable</p>
          )}
          {!hasLocation && alert.interceptPoint && (
            <p className="text-gray-500 text-xs mt-2 text-center">Click above to enter your starting location</p>
          )}
        </div>

        <div className="p-4 space-y-4">
          <Section label="Affected Area">
            <p className="text-gray-300 text-sm leading-relaxed">{alert.areaDesc}</p>
          </Section>

          {alert.headline && (
            <Section label="Headline">
              <p className="text-gray-300 text-sm leading-relaxed">{alert.headline}</p>
            </Section>
          )}

          <Section label="Description">
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{alert.description}</p>
          </Section>

          {alert.instruction && (
            <Section label="Protective Actions">
              <p className="text-yellow-300/90 text-sm leading-relaxed whitespace-pre-wrap">{alert.instruction}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-2.5 text-center">
      <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">{label}</div>
      <div className="text-white text-xs font-semibold leading-snug">{value}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-gray-500 text-[10px] uppercase tracking-widest mb-1.5">{label}</h3>
      {children}
    </div>
  );
}
