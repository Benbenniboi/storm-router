import React, { useCallback, useEffect, useRef, useState } from 'react';
import MapContainer from './MapContainer';
import AlertSidebar from './AlertSidebar';
import AlertDetailPanel from './AlertDetailPanel';
import { useAlerts } from '../hooks/useAlerts';
import { getRoute } from '../api/osrmApi';
import { geocodeQuery } from '../api/nwsApi';
import { ParsedAlert, RouteResult, UserLocation } from '../types';
import { MAP_STYLES, LOCALSTORAGE_KEY } from '../constants';

interface Props {
  apiKey: string;
}

export default function StormApp({ apiKey }: Props) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'unsupported'>('pending');
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const [selectedAlert, setSelectedAlert] = useState<ParsedAlert | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [styleIndex, setStyleIndex] = useState(1); // default: dark
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { alerts, loading, error, lastUpdated, refresh } = useAlerts(userLocation);

  const styleUrl = MAP_STYLES[styleIndex].url(apiKey);

  // Request browser geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      setShowManualEntry(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
        setShowManualEntry(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const flyTo = useCallback((lon: number, lat: number, zoom?: number) => {
    (mapContainerRef.current as any)?.__flyTo?.(lon, lat, zoom);
  }, []);

  const fitToBounds = useCallback((coords: Array<[number, number]>) => {
    (mapContainerRef.current as any)?.__fitToBounds?.(coords);
  }, []);

  const handleAlertSelect = useCallback((alert: ParsedAlert) => {
    setSelectedAlert(alert);
    setActiveRoute(null);
    const geo = alert.geometry;
    if (geo) {
      const ring = geo.type === 'Polygon' ? geo.coordinates[0] : geo.coordinates[0][0];
      const lons = ring.map((c: number[]) => c[0]);
      const lats = ring.map((c: number[]) => c[1]);
      flyTo(
        (Math.min(...lons) + Math.max(...lons)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
        7,
      );
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
      if (result?.coordinates.length) { fitToBounds(result.coordinates); }
    } finally {
      setRouteLoading(false);
    }
  }, [selectedAlert, userLocation, fitToBounds]);

  const handleManualLocation = async () => {
    const input = manualInput.trim();
    if (!input) { setManualError('Enter a city, state, or lat,lon'); return; }
    setManualError('');

    // Try parsing as lat,lon first
    const latLonMatch = input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (latLonMatch) {
      const lat = parseFloat(latLonMatch[1]);
      const lon = parseFloat(latLonMatch[2]);
      setUserLocation({ latitude: lat, longitude: lon });
      flyTo(lon, lat, 6);
      setShowManualEntry(false);
      return;
    }

    // Otherwise geocode
    setGeocoding(true);
    try {
      const result = await geocodeQuery(input);
      if (result) {
        setUserLocation({ latitude: result.lat, longitude: result.lon });
        flyTo(result.lon, result.lat, 6);
        setShowManualEntry(false);
      } else {
        setManualError('Location not found — try "City, ST" or "lat, lon"');
      }
    } finally {
      setGeocoding(false);
    }
  };

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
      <AlertSidebar
        alerts={alerts}
        loading={loading}
        lastUpdated={lastUpdated}
        selectedId={selectedAlert?.id ?? null}
        onSelect={handleAlertSelect}
        onRefresh={refresh}
      />

      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full">
          <MapContainer
            styleUrl={styleUrl}
            alerts={alerts}
            route={activeRoute}
            userLocation={userLocation}
            onAlertClick={handleAlertSelect}
          />
        </div>

        {/* Map style switcher */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
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

        {/* Location bar — shown when denied or unsupported, or manually toggled */}
        {(showManualEntry || locationStatus === 'denied' || locationStatus === 'unsupported') && (
          <div className="absolute top-3 right-3 z-10 w-72">
            <div className="bg-gray-900/95 border border-gray-700 rounded-xl p-3 shadow-xl">
              <div className="text-gray-400 text-xs mb-2">
                {locationStatus === 'denied'
                  ? 'Location blocked — enter your position for distance and routing'
                  : locationStatus === 'unsupported'
                  ? 'Geolocation unavailable in this browser'
                  : 'Set your location'}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={e => { setManualInput(e.target.value); setManualError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleManualLocation()}
                  placeholder="City, ST  or  lat, lon"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleManualLocation}
                  disabled={geocoding}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  {geocoding ? '…' : 'Set'}
                </button>
              </div>
              {manualError && <p className="text-red-400 text-xs mt-1">{manualError}</p>}
              {userLocation && (
                <p className="text-green-400 text-xs mt-1">
                  Location set: {userLocation.latitude.toFixed(3)}, {userLocation.longitude.toFixed(3)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Location dot status — show when granted, let user override */}
        {locationStatus === 'granted' && userLocation && !showManualEntry && (
          <button
            onClick={() => setShowManualEntry(true)}
            className="absolute top-3 right-3 z-10 bg-gray-900/80 border border-gray-700 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            📍 {userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)}
          </button>
        )}

        {error && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg z-10 max-w-sm text-center">
            {error}
          </div>
        )}

        <div className="absolute bottom-8 left-3 z-10">
          <button
            onClick={handleForgetKey}
            className="bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            Change API Key
          </button>
        </div>

        {selectedAlert && (
          <AlertDetailPanel
            alert={selectedAlert}
            route={activeRoute}
            routeLoading={routeLoading}
            onClose={handleCloseDetail}
            onNavigate={handleNavigate}
            hasLocation={userLocation !== null}
            onSetLocation={() => setShowManualEntry(true)}
          />
        )}
      </div>
    </div>
  );
}
