import React, { memo } from 'react';
import { Marker, Polyline } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';
import * as turf from '@turf/turf';
import { ParsedAlert } from '../types';
import { EVENT_COLORS, SEVERITY_COLORS } from '../constants';

interface Props {
  alert: ParsedAlert;
}

const ARROW_LENGTH_MILES = 20;

const StormMotionArrow = memo(({ alert }: Props) => {
  if (!alert.geometry || !alert.stormMotion) {return null;}

  try {
    let centroid: [number, number];
    const { geometry } = alert;

    if (geometry.type === 'Polygon') {
      const c = turf.centroid(turf.polygon(geometry.coordinates));
      centroid = c.geometry.coordinates as [number, number];
    } else if (geometry.type === 'MultiPolygon') {
      const c = turf.centroid(turf.multiPolygon(geometry.coordinates));
      centroid = c.geometry.coordinates as [number, number];
    } else {
      return null;
    }

    const { directionDeg, speedMph } = alert.stormMotion;

    // Arrow tip: project centroid in storm's direction of travel
    const tip = turf.destination(
      turf.point(centroid),
      ARROW_LENGTH_MILES,
      directionDeg,
      { units: 'miles' },
    );

    const tipCoord = tip.geometry.coordinates as [number, number];

    const color = EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? '#FFF';

    const lineCoords = [
      { latitude: centroid[1], longitude: centroid[0] },
      { latitude: tipCoord[1], longitude: tipCoord[0] },
    ];

    return (
      <>
        <Polyline
          coordinates={lineCoords}
          strokeColor={color}
          strokeWidth={3}
          lineDashPattern={[8, 4]}
        />
        <Marker
          coordinate={{ latitude: tipCoord[1], longitude: tipCoord[0] }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={[styles.arrowHead, { borderBottomColor: color }]} />
        </Marker>
        <Marker
          coordinate={{
            latitude: (centroid[1] + tipCoord[1]) / 2,
            longitude: (centroid[0] + tipCoord[0]) / 2,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={[styles.speedBadge, { backgroundColor: color }]}>
            <Text style={styles.speedText}>{Math.round(speedMph)}mph</Text>
          </View>
        </Marker>
      </>
    );
  } catch {
    return null;
  }
});

StormMotionArrow.displayName = 'StormMotionArrow';
export default StormMotionArrow;

const styles = StyleSheet.create({
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  speedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  speedText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
});
