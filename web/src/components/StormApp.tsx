import React, { useCallback, useRef, useState } from 'react';
import MapContainer from './MapContainer';
import AlertSidebar from './AlertSidebar';
import AlertDetailPanel from './AlertDetailPanel';
import { useAlerts } from '../hooks/useAlerts';
import { getRoute } from '../api/osrmApi';
import { ParsedAlert, RouteResult, UserLocation } from '../types';
import { MAP_STYLES, LOCALSTORAGE_KEY } from '../constants';

interface Props {
  apiKey: string;
}

export default function StormApp({ apiKey }: Props) {
  const [userLocation] = useState<UserLocation | null>(() => {
    // Try browser geolocation on mount (best-effort, non-blocking)
    return null;
  });
  const [selectedAlert, setSelectedAlert] = useState<ParsedAlert | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [styleIndex, setStyleIndex] = useState(1); // default: dark
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { alerts, loading, error, lastUpdated, refresh } = useAlerts(userLocation);

  const styleUrl = MAP_STYLES[styleIndex].url(apiKey);

  const flyTo = useCallback((lon: number, lat: number, zoom?: number) => {
    (mapContainerRef.current as any)?.__flyTo?.(lon, lat, zoom);
  }, []);

  const fitToBounds = useCallback((coords: Array<[number, number]>) => {
    (mapContainerRef.current as any)?.__fitToBounds?.(coords);
  }, []);

  const handleAlertSelect = useCallback((alert: ParsedAlert) => {
    setSelectedAlert(alert);
    setActiveRoute(null);

    // Fly to polygon center
    const geo = alert.geometry;
    if (geo) {
      const ring = geo.type === 'Polygon' ? geo.coordinates[0] : geo.coordinates[0][0];
      const lons = ring.map((c: number[]) => c[0]);
      const lats = ring.map((c: number[]) => c[1]);
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      flyTo(centerLon, centerLat, 7);
    }
  }, [flyTo]);

  const handleNavigate = useCallback(async () => {
    if (!selectedAlert?.interceptPoint || !userLocation) { return; }
    setRouteLoading(true);
    try {
      const result = await getRoute(
        userLocation.longitude, userLocation.latitude,
        selectedAlert.interceptPoint[0], selectedAlert.interceptPoint[1],
        selectedAlert.id,
      );
      setActiveRoute(result);
      if (result?.coordinates.length) {
        fitToBounds(result.coordinates);
      }
    } finally {
      setRouteLoading(false);
    }
  }, [selectedAlert, userLocation, fitToBounds]);

  const handleCloseDetail = useCallback(() => {
    setSelectedAlert(null);
    setActiveRoute(null);
  }, []);

  const handleForgetKey = () => {
    localStorage.removeItem(LOCALSTORAGE_KEY);
    window.location.reload();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950">
      {/* Left sidebar: alert list */}
      <AlertSidebar
        alerts={alerts}
        loading={loading}
        lastUpdated={lastUpdated}
        selectedId={selectedAlert?.id ?? null}
        onSelect={handleAlertSelect}
        onRefresh={refresh}
      />

      {/* Map area */}
      <div className="flex-1 relative">
        {/* Attach the imperative-ref holder to mapContainerRef */}
        <div ref={mapContainerRef} className="w-full h-full">
          <MapContainer
            styleUrl={styleUrl}
            alerts={alerts}
            route={activeRoute}
            userLocation={userLocation}
            onAlertClick={handleAlertSelect}
          />
        </div>

        {/* Top-right controls */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          {/* Map style switcher */}
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg flex overflow-hidden text-xs">
            {MAP_STYLES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStyleIndex(i)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  i === styleIndex
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg z-10 max-w-sm text-center">
            {error}
          </div>
        )}

        {/* Settings / forget key button */}
        <div className="absolute bottom-8 left-3 z-10">
          <button
            onClick={handleForgetKey}
            className="bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            title="Remove API key and return to key entry"
          >
            Change API Key
          </button>
        </div>

        {/* Detail panel (slides in from right) */}
        {selectedAlert && (
          <AlertDetailPanel
            alert={selectedAlert}
            route={activeRoute}
            routeLoading={routeLoading}
            onClose={handleCloseDetail}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </div>
  );
}
