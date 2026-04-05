import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import AlertPolygonsLayer from '../components/AlertPolygonsLayer';
import StormMotionLayer from '../components/StormMotionLayer';
import RouteLayer from '../components/RouteLayer';
import AlertBottomSheet from '../components/AlertBottomSheet';

import { useAlerts } from '../hooks/useAlerts';
import { useLocation } from '../hooks/useLocation';
import { getRoute } from '../api/osrmApi';
import { ParsedAlert, RouteResult } from '../types';
import { COLORS, DEFAULT_SETTINGS, MAP_STYLES } from '../constants';

// Initialize MapLibre — no Mapbox token needed, key is in the tile URL
MapLibreGL.setAccessToken(null);

export default function MapScreen() {
  const { location, permissionDenied, error: locError } = useLocation();
  const { alerts, loading, lastUpdated, refresh } = useAlerts(
    location,
    DEFAULT_SETTINGS.autoRefreshInterval,
  );

  const [selectedAlert, setSelectedAlert] = useState<ParsedAlert | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleAlertPress = useCallback((alert: ParsedAlert) => {
    setSelectedAlert(alert);
    setActiveRoute(null);
    bottomSheetRef.current?.expand();

    // Fly camera to polygon center
    const center = getGeometryCenter(alert.geometry);
    if (center && cameraRef.current) {
      cameraRef.current.flyTo(center, 800);
      cameraRef.current.zoomTo(6, 800);
    }
  }, []);

  const handleNavigate = useCallback(
    async (alert: ParsedAlert) => {
      if (!location || !alert.interceptPoint) {return;}
      setRouteLoading(true);
      try {
        const result = await getRoute(
          location.longitude,
          location.latitude,
          alert.interceptPoint[0],
          alert.interceptPoint[1],
          alert.id,
        );
        setActiveRoute(result);

        if (result?.coordinates.length && cameraRef.current) {
          const lons = result.coordinates.map(c => c[0]);
          const lats = result.coordinates.map(c => c[1]);
          cameraRef.current.fitBounds(
            [Math.max(...lons), Math.max(...lats)],
            [Math.min(...lons), Math.min(...lats)],
            [60, 40, 320, 40],
            800,
          );
        }
      } finally {
        setRouteLoading(false);
      }
    },
    [location],
  );

  const handleBottomSheetClose = useCallback(() => {
    setSelectedAlert(null);
    setActiveRoute(null);
  }, []);

  const initialCenter: [number, number] = location
    ? [location.longitude, location.latitude]
    : [-96, 38.5]; // CONUS center

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={MAP_STYLES.streets}
        compassEnabled
        logoEnabled={false}
        attributionEnabled
        attributionPosition={{ bottom: 8, right: 8 }}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          zoomLevel={location ? 5 : 4}
          centerCoordinate={initialCenter}
          animationMode="flyTo"
          animationDuration={800}
        />

        {/* GPS dot — built-in MapLibre user location */}
        <MapLibreGL.UserLocation
          visible
          renderMode={MapLibreGL.UserLocationRenderMode.Native}
          androidRenderMode="compass"
        />

        {/* Warning polygons */}
        <AlertPolygonsLayer alerts={alerts} onAlertPress={handleAlertPress} />

        {/* Storm motion arrows */}
        <StormMotionLayer alerts={alerts} />

        {/* Active intercept route */}
        {activeRoute && <RouteLayer route={activeRoute} />}
      </MapLibreGL.MapView>

      {/* Status pill */}
      <View style={styles.statusBar}>
        {loading || routeLoading ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : (
          <TouchableOpacity onPress={refresh}>
            <Text style={styles.statusText}>
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
              {lastUpdated
                ? ` · ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {permissionDenied && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Location permission denied — distances unavailable
          </Text>
        </View>
      )}
      {locError && (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerText}>{locError}</Text>
        </View>
      )}

      <AlertBottomSheet
        ref={bottomSheetRef}
        alert={selectedAlert}
        route={activeRoute}
        onClose={handleBottomSheetClose}
        onNavigate={handleNavigate}
      />
    </View>
  );
}

function getGeometryCenter(
  geometry: ParsedAlert['geometry'],
): [number, number] | null {
  if (!geometry) {return null;}
  try {
    let ring: number[][];
    if (geometry.type === 'Polygon') {ring = geometry.coordinates[0];}
    else if (geometry.type === 'MultiPolygon') {ring = geometry.coordinates[0][0];}
    else {return null;}

    const lons = ring.map(c => c[0]);
    const lats = ring.map(c => c[1]);
    return [
      (Math.min(...lons) + Math.max(...lons)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2,
    ];
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  statusBar: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: COLORS.surface + 'E0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  banner: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    backgroundColor: COLORS.warning + 'CC',
    borderRadius: 8,
    padding: 10,
  },
  bannerError: {
    backgroundColor: COLORS.danger + 'CC',
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
});
