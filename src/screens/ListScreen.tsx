import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import AlertListItem from '../components/AlertListItem';
import AlertBottomSheet from '../components/AlertBottomSheet';

import { useAlerts } from '../hooks/useAlerts';
import { useLocation } from '../hooks/useLocation';
import { getRoute } from '../api/osrmApi';
import { ParsedAlert, RouteResult } from '../types';
import { COLORS, DEFAULT_SETTINGS } from '../constants';

export default function ListScreen() {
  const { location } = useLocation();
  const { alerts, loading, refresh } = useAlerts(
    location,
    DEFAULT_SETTINGS.autoRefreshInterval,
  );

  const [selectedAlert, setSelectedAlert] = useState<ParsedAlert | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [filterText, setFilterText] = useState('');

  const bottomSheetRef = useRef<BottomSheet>(null);

  const filtered = filterText
    ? alerts.filter(
        a =>
          a.event.toLowerCase().includes(filterText.toLowerCase()) ||
          a.areaDesc.toLowerCase().includes(filterText.toLowerCase()) ||
          a.senderName.toLowerCase().includes(filterText.toLowerCase()),
      )
    : alerts;

  const handlePress = useCallback((alert: ParsedAlert) => {
    setSelectedAlert(alert);
    setActiveRoute(null);
    bottomSheetRef.current?.expand();
  }, []);

  const handleNavigate = useCallback(
    async (alert: ParsedAlert) => {
      if (!location || !alert.interceptPoint) {return;}
      const result = await getRoute(
        location.longitude,
        location.latitude,
        alert.interceptPoint[0],
        alert.interceptPoint[1],
        alert.id,
      );
      setActiveRoute(result);
    },
    [location],
  );

  const handleClose = useCallback(() => {
    setSelectedAlert(null);
    setActiveRoute(null);
  }, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Filter by event, area, or WFO…"
        placeholderTextColor={COLORS.textSecondary}
        value={filterText}
        onChangeText={setFilterText}
        returnKeyType="search"
      />

      {loading && alerts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Fetching alerts…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AlertListItem alert={item} onPress={handlePress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={COLORS.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🌤</Text>
              <Text style={styles.emptyText}>No active severe weather alerts</Text>
              <Text style={styles.emptySubtext}>Pull down to refresh</Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        />
      )}

      <AlertBottomSheet
        ref={bottomSheetRef}
        alert={selectedAlert}
        route={activeRoute}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    margin: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  list: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
});
