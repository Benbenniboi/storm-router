import React, { memo } from 'react';
import { Marker, Polyline } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';
import { RouteResult } from '../types';
import { COLORS } from '../constants';
import { routeToLatLng } from '../utils/geometry';

interface Props {
  route: RouteResult;
}

const RouteOverlay = memo(({ route }: Props) => {
  if (!route.coordinates.length) {return null;}

  const latLngs = routeToLatLng(route.coordinates);
  const destination = latLngs[latLngs.length - 1];

  return (
    <>
      <Polyline
        coordinates={latLngs}
        strokeColor={COLORS.routePolyline}
        strokeWidth={4}
        lineDashPattern={undefined}
        zIndex={5}
      />
      <Marker
        coordinate={destination}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
        zIndex={9}
      >
        <View style={styles.interceptBadge}>
          <Text style={styles.interceptText}>
            {Math.round(route.distanceMiles)}mi
          </Text>
          <Text style={styles.interceptSub}>
            {Math.round(route.durationMinutes)}min
          </Text>
        </View>
      </Marker>
    </>
  );
});

RouteOverlay.displayName = 'RouteOverlay';
export default RouteOverlay;

const styles = StyleSheet.create({
  interceptBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  interceptText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  interceptSub: {
    color: '#cde',
    fontSize: 10,
  },
});
