import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import MapContainer, { MapHandle } from './MapContainer';
import AlertSidebar from './AlertSidebar';
import AlertDetailPanel from './AlertDetailPanel';
import DirectionsPanel from './DirectionsPanel';
import { useAlerts } from '../hooks/useAlerts';
import { getRoute } from '../api/osrmApi';
import { geocodeQuery } from '../api/nwsApi';
import { ParsedAlert, RouteResult, UserLocation } from '../types';
import { MAP_STYLES, LOCALSTORAGE_KEY } from '../constants';

interface Props { apiKey: string; }

export default function StormApp({ apiKey }: Props) {
  // Raw GPS position
  const [userLocation, setUserLocation]   = useState<UserLocation | null>(null);
  // Snapped-to-route position shown on the road while navigating
  const [snappedLocation, setSnappedLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'unsupported'>('pending');
  const [manualInput, setManualInput]     = useState('');
  const [manualError, setManualError]     = useState('');
  const [geocoding, setGeocoding]         = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const [selectedAlert, setSelectedAlert] = useState<ParsedAlert | null>(null);
  const [activeRoute, setActiveRoute]     = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading]   = useState(false);
  const [navigating, setNavigating]       = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [styleIndex, setStyleIndex]       = useState(1);

  const mapRef  = useRef<MapHandle>(null);
  const watchId = useRef<number | null>(null);

  const { alerts, loading, error, lastUpdated, refresh } = useAlerts(userLocation);

  // ── One-shot initial location ──────────────────────────────────────────────
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
      () => { setLocationStatus('denied'); setShowManualEntry(true); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // ── Live GPS watch — started when user begins navigation ───────────────────
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchId.current !== null) { return; }
    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      err => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true, maximumAge: 2000 },
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  useEffect(() => () => stopWatching(), [stopWatching]);

  // ── Snap user to route + advance step index while navigating ───────────────
  useEffect(() => {
    if (!navigating || !activeRoute || !userLocation) {
      setSnappedLocation(null);
      return;
    }

    const routeLine = turf.lineString(activeRoute.coordinates);
    const pt = turf.point([userLocation.longitude, userLocation.latitude]);

    // Snap to nearest point on route
    const snapped = turf.nearestPointOnLine(routeLine, pt, { units: 'miles' });
    setSnappedLocation({
      latitude:  snapped.geometry.coordinates[1],
      longitude: snapped.geometry.coordinates[0],
    });

    // Determine which step we're on by finding the step whose start coordinate
    // is closest (and not yet passed)
    if (activeRoute.steps.length > 1) {
      let closestIdx = 0;
      let minDist = Infinity;
      activeRoute.steps.forEach((step, i) => {
        const d = turf.distance(pt, turf.point(step.coordinate), { units: 'miles' });
        if (d < minDist) { minDist = d; closestIdx = i; }
      });
      // Advance one ahead so the panel shows the upcoming maneuver
      const nextIdx = Math.min(closestIdx + 1, activeRoute.steps.length - 1);
      setCurrentStepIndex(nextIdx);
    }
  }, [userLocation, activeRoute, navigating]);

  // ── Routing ────────────────────────────────────────────────────────────────
  const handleNavigate = useCallback(async () => {
    if (!selectedAlert?.interceptPoint || !userLocation) { return; }
    setRouteLoading(true);
    try {
      const result = await getRoute(
        userLocation.longitude, userLocation.latitude,
        selectedAlert.interceptPoint[0], selectedAlert.interceptPoint[1],
        selectedAlert.id,
      );

      if (!result) {
        console.error('OSRM returned no route');
        return;
      }

      setActiveRoute(result);
      setCurrentStepIndex(0);
      setNavigating(true);
      startWatching();

      mapRef.current?.fitToBounds(result.coordinates);
    } finally {
      setRouteLoading(false);
    }
  }, [selectedAlert, userLocation, startWatching]);

  const stopNavigation = useCallback(() => {
    setNavigating(false);
    setActiveRoute(null);
    setSnappedLocation(null);
    setCurrentStepIndex(0);
    stopWatching();
  }, [stopWatching]);

  // ── Alert selection ────────────────────────────────────────────────────────
  const handleAlertSelect = useCallback((alert: ParsedAlert) => {
    setSelectedAlert(alert);
    setActiveRoute(null);
    setNavigating(false);

    const geo = alert.geometry;
    if (geo) {
      const ring = geo.type === 'Polygon' ? geo.coordinates[0] : geo.coordinates[0][0];
      const lons = ring.map((c: number[]) => c[0]);
      const lats = ring.map((c: number[]) => c[1]);
      mapRef.current?.flyTo(
        (Math.min(...lons) + Math.max(...lons)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
        7,
      );
    }
  }, []);

  // ── Manual location ────────────────────────────────────────────────────────
  const handleManualLocation = async () => {
    const input = manualInput.trim();
    if (!input) { setManualError('Enter a city, state, or lat, lon'); return; }
    setManualError('');

    const latLon = input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (latLon) {
      const loc = { latitude: parseFloat(latLon[1]), longitude: parseFloat(latLon[2]) };
      setUserLocation(loc);
      mapRef.current?.flyTo(loc.longitude, loc.latitude, 6);
      setShowManualEntry(false);
      return;
    }

    setGeocoding(true);
    try {
      const result = await geocodeQuery(input);
      if (result) {
        const loc = { latitude: result.lat, longitude: result.lon };
        setUserLocation(loc);
        mapRef.current?.flyTo(result.lon, result.lat, 6);
        setShowManualEntry(false);
      } else {
        setManualError('Location not found — try "City, ST" or "lat, lon"');
      }
    } finally {
      setGeocoding(false);
    }
  };

  const distanceRemainingMiles = (() => {
    if (!activeRoute || !snappedLocation) { return activeRoute?.distanceMiles ?? 0; }
    try {
      const routeLine = turf.lineString(activeRoute.coordinates);
      const pt = turf.point([snappedLocation.longitude, snappedLocation.latitude]);
      const snappedPt = turf.nearestPointOnLine(routeLine, pt, { units: 'miles' });
      const along = snappedPt.properties.location ?? 0;
      const total = turf.length(routeLine, { units: 'miles' });
      return Math.max(0, total - along);
    } catch { return activeRoute.distanceMiles; }
  })();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950">
      {/* Left: alert list */}
      <AlertSidebar
        alerts={alerts}
        loading={loading}
        lastUpdated={lastUpdated}
        selectedId={selectedAlert?.id ?? null}
        onSelect={handleAlertSelect}
        onRefresh={refresh}
      />

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          ref={mapRef}
          styleUrl={MAP_STYLES[styleIndex].url(apiKey)}
          alerts={alerts}
          route={activeRoute}
          userLocation={userLocation}
          snappedLocation={snappedLocation}
          onAlertClick={handleAlertSelect}
        />

        {/* Style switcher */}
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg flex overflow-hidden text-xs">
            {MAP_STYLES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStyleIndex(i)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  i === styleIndex ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location pill / manual entry */}
        {(showManualEntry || locationStatus === 'denied' || locationStatus === 'unsupported') ? (
          <div className="absolute top-3 right-3 z-10 w-72">
            <div className="bg-gray-900/95 border border-gray-700 rounded-xl p-3 shadow-xl">
              <div className="text-gray-400 text-xs mb-2">
                {locationStatus === 'denied'
                  ? 'Location blocked — enter your starting position'
                  : locationStatus === 'unsupported'
                  ? 'Geolocation not available — enter manually'
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
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg"
                >
                  {geocoding ? '…' : 'Set'}
                </button>
              </div>
              {manualError && <p className="text-red-400 text-xs mt-1">{manualError}</p>}
              {userLocation && (
                <p className="text-green-400 text-xs mt-1">
                  Set: {userLocation.latitude.toFixed(3)}, {userLocation.longitude.toFixed(3)}
                </p>
              )}
            </div>
          </div>
        ) : locationStatus === 'granted' && userLocation && (
          <button
            onClick={() => setShowManualEntry(true)}
            className="absolute top-3 right-3 z-10 bg-gray-900/80 border border-gray-700 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            📍 {userLocation.latitude.toFixed(3)}, {userLocation.longitude.toFixed(3)}
          </button>
        )}

        {error && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg z-10 max-w-sm text-center">
            {error}
          </div>
        )}

        <div className="absolute bottom-8 left-3 z-10">
          <button
            onClick={() => { localStorage.removeItem(LOCALSTORAGE_KEY); window.location.reload(); }}
            className="bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            Change API Key
          </button>
        </div>

        {/* Alert detail panel — hidden while directions are open */}
        {selectedAlert && !navigating && (
          <AlertDetailPanel
            alert={selectedAlert}
            route={activeRoute}
            routeLoading={routeLoading}
            onClose={() => { setSelectedAlert(null); setActiveRoute(null); }}
            onNavigate={handleNavigate}
            hasLocation={userLocation !== null}
            onSetLocation={() => setShowManualEntry(true)}
          />
        )}

        {/* Turn-by-turn directions panel */}
        {navigating && activeRoute && (
          <DirectionsPanel
            route={activeRoute}
            currentStepIndex={currentStepIndex}
            distanceRemainingMiles={distanceRemainingMiles}
            onClose={stopNavigation}
          />
        )}
      </div>
    </div>
  );
}
