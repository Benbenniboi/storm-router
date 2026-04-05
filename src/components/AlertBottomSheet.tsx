import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ParsedAlert, RouteResult } from '../types';
import { COLORS, EVENT_COLORS, SEVERITY_COLORS } from '../constants';
import { formatExpires, shortEventLabel, etaMinutes } from '../utils/alerts';

interface Props {
  alert: ParsedAlert | null;
  route: RouteResult | null;
  onClose: () => void;
  onNavigate: (alert: ParsedAlert) => void;
}

const AlertBottomSheet = forwardRef<BottomSheet, Props>(
  ({ alert, route, onClose, onNavigate }, ref) => {
    const snapPoints = useMemo(() => ['35%', '75%'], []);

    const handleClose = useCallback(() => {
      onClose();
      (ref as React.RefObject<BottomSheet>)?.current?.close();
    }, [onClose, ref]);

    if (!alert) {return null;}

    const color =
      EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.default;

    const distanceStr =
      alert.distanceMiles != null
        ? alert.distanceMiles < 1
          ? 'Inside warning area'
          : `${alert.distanceMiles.toFixed(1)} miles away`
        : 'Distance unknown';

    const etaStr = (() => {
      if (!route) {return null;}
      const mins = Math.round(route.durationMinutes);
      return `~${mins} min drive`;
    })();

    const stormEtaStr = (() => {
      if (!alert.stormMotion || !alert.distanceMiles) {return null;}
      const mins = etaMinutes(alert.distanceMiles, alert.stormMotion.speedMph);
      if (!isFinite(mins)) {return null;}
      return `Storm arrives in ~${Math.round(mins)} min`;
    })();

    return (
      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.eventBadge, { backgroundColor: color }]}>
              <Text style={styles.eventBadgeText}>{shortEventLabel(alert.event)}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.eventTitle}>{alert.event}</Text>
              <Text style={styles.senderName}>{alert.senderName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Key stats row */}
          <View style={styles.statsRow}>
            <StatCard label="Distance" value={distanceStr} />
            {etaStr && <StatCard label="Drive" value={etaStr} />}
            <StatCard label="Expires" value={formatExpires(alert.expires)} />
          </View>

          {/* Storm motion */}
          {alert.stormMotion && (
            <View style={styles.motionRow}>
              <Text style={styles.motionText}>
                Storm moving{' '}
                <Text style={[styles.motionHighlight, { color }]}>
                  {bearingToCardinal(alert.stormMotion.directionDeg)}
                </Text>{' '}
                at{' '}
                <Text style={[styles.motionHighlight, { color }]}>
                  {Math.round(alert.stormMotion.speedMph)} mph
                </Text>
              </Text>
              {stormEtaStr && <Text style={styles.stormEta}>{stormEtaStr}</Text>}
            </View>
          )}

          {/* Navigate button */}
          <TouchableOpacity
            style={[styles.navButton, { borderColor: color }]}
            onPress={() => onNavigate(alert)}
          >
            <Text style={[styles.navButtonText, { color }]}>
              {route ? 'Re-Route to Intercept' : 'Route to Intercept Point'}
            </Text>
          </TouchableOpacity>

          {/* Area description */}
          <Text style={styles.sectionLabel}>Affected Area</Text>
          <Text style={styles.bodyText}>{alert.areaDesc}</Text>

          {/* Headline + description */}
          {alert.headline ? (
            <>
              <Text style={styles.sectionLabel}>Headline</Text>
              <Text style={styles.bodyText}>{alert.headline}</Text>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.bodyText}>{alert.description}</Text>

          {alert.instruction ? (
            <>
              <Text style={styles.sectionLabel}>Protective Actions</Text>
              <Text style={[styles.bodyText, styles.instruction]}>{alert.instruction}</Text>
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

AlertBottomSheet.displayName = 'AlertBottomSheet';
export default AlertBottomSheet;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function bearingToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handle: {
    backgroundColor: COLORS.border,
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  eventBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 56,
    alignItems: 'center',
  },
  eventBadgeText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 12,
  },
  headerText: {
    flex: 1,
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  senderName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  motionRow: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  motionText: {
    color: COLORS.text,
    fontSize: 14,
  },
  motionHighlight: {
    fontWeight: '700',
  },
  stormEta: {
    color: COLORS.warning,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  navButton: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
  },
  bodyText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  instruction: {
    color: COLORS.warning,
    fontWeight: '500',
  },
});
