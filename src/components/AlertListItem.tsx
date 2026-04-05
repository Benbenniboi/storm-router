import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ParsedAlert } from '../types';
import { COLORS, EVENT_COLORS, SEVERITY_COLORS } from '../constants';
import { formatExpires, shortEventLabel } from '../utils/alerts';

interface Props {
  alert: ParsedAlert;
  onPress: (alert: ParsedAlert) => void;
}

const AlertListItem = memo(({ alert, onPress }: Props) => {
  const color =
    EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.default;

  const distanceStr =
    alert.distanceMiles != null
      ? alert.distanceMiles < 1
        ? 'Inside'
        : `${alert.distanceMiles.toFixed(1)} mi`
      : '—';

  const motionStr = alert.stormMotion
    ? `${bearingToCardinal(alert.stormMotion.directionDeg)} @ ${Math.round(alert.stormMotion.speedMph)} mph`
    : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(alert)}
      activeOpacity={0.75}
    >
      <View style={[styles.colorBar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{shortEventLabel(alert.event)}</Text>
          </View>
          <Text style={styles.distance}>{distanceStr}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {alert.headline || alert.event}
        </Text>
        <Text style={styles.area} numberOfLines={1}>
          {alert.areaDesc}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={styles.meta}>Expires {formatExpires(alert.expires)}</Text>
          {motionStr && <Text style={styles.motion}>{motionStr}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
});

AlertListItem.displayName = 'AlertListItem';
export default AlertListItem;

function bearingToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  colorBar: {
    width: 5,
  },
  body: {
    flex: 1,
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 11,
  },
  distance: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  area: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  motion: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '600',
  },
});
