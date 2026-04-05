import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';

import AlertPolygon from '../components/AlertPolygon';
import StormMotionArrow from '../components/StormMotionArrow';
import UserLocationMarker from '../components/UserLocationMarker';
import RouteOverlay from '../components/RouteOverlay';
import AlertBottomSheet from '../components/AlertBottomSheet';

import { useAlerts } from '../hooks/useAlerts';
import { useLocation } from '../hooks/useLocation';
import { getRoute } from '../api/osrmApi';
import { ParsedAlert, RouteResult } from '../types';
import { COLORS, DEFAULT_SETTINGS } from '../constants';

export default function MapScreen() {
  const { location, permissionDenied, error: locError } = useLocation();
  const { alerts, loading, lastUpdated, refresh } = useAlerts(
    location,
    DEFAULT_SETTINGS.autoRefreshInterval,
  );

  const [selectedAlert, setSelectedAlert] = useState<ParsedAlert | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleAlertPress = useCallback(
    (alert: ParsedAlert) => {
      setSelectedAlert(alert);
      setActiveRoute(null);
      bottomSheetRef.current?.expand();

      // Zoom to the polygon centroid
      if (alert.geometry) {
        const coords = getGeometryCenter(alert.geometry);
        if (coords) {
          mapRef.current?.animateToRegion(
            {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 2.5,
              longitudeDelta: 2.5,
            },
            800,
          );
        }
      }
    },
    [],
  );

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

        // Fit map to show route
        if (result?.coordinates.length) {
          const lats = result.coordinates.map(c => c[1]);
          const lons = result.coordinates.map(c => c[0]);
          mapRef.current?.fitToCoordinates(
            result.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon })),
            { edgePadding: { top: 60, right: 40, bottom: 300, left: 40 }, animated: true },
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

  const initialRegion = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 5,
        longitudeDelta: 5,
      }
    : {
        // Default to center of CONUS
        latitude: 38.5,
        longitude: -96,
        latitudeDelta: 20,
        longitudeDelta: 20,
      };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass
        rotateEnabled={false}
        mapType="standard"
      >
        {/* Warning polygons */}
        {alerts.map(alert => (
          <AlertPolygon key={alert.id} alert={alert} onPress={handleAlertPress} />
        ))}

        {/* Storm motion arrows */}
        {alerts.map(alert => (
          <StormMotionArrow key={`motion-${alert.id}`} alert={alert} />
        ))}

        {/* Route overlay */}
        {activeRoute && <RouteOverlay route={activeRoute} />}

        {/* User marker */}
        {location && <UserLocationMarker location={location} />}
      </MapView>

      {/* Status bar */}
      <View style={styles.statusBar}>
        {loading || routeLoading ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : (
          <TouchableOpacity onPress={refresh}>
            <Text style={styles.statusText}>
              {alerts.length} alerts
              {lastUpdated
                ? ` · ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Permission / error banners */}
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

      {/* Alert detail bottom sheet */}
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
): { latitude: number; longitude: number } | null {
  if (!geometry) {return null;}
  try {
    let ring: number[][];
    if (geometry.type === 'Polygon') {ring = geometry.coordinates[0];}
    else if (geometry.type === 'MultiPolygon') {ring = geometry.coordinates[0][0];}
    else {return null;}

    const lats = ring.map(c => c[1]);
    const lons = ring.map(c => c[0]);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
    };
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
