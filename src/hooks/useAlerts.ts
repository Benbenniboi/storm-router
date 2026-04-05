import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { fetchActiveAlerts } from '../api/nwsApi';
import { enrichAlertsWithLocation, sortAlertsByDistance } from '../utils/geometry';
import { ParsedAlert, UserLocation } from '../types';

interface UseAlertsResult {
  alerts: ParsedAlert[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useAlerts(
  location: UserLocation | null,
  autoRefreshSeconds: number = 60,
  stateFilter?: string,
): UseAlertsResult {
  const [alerts, setAlerts] = useState<ParsedAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef(location);

  // Keep ref current so the timer closure always sees latest location
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fetched = await fetchActiveAlerts(stateFilter);
      if (locationRef.current) {
        fetched = enrichAlertsWithLocation(fetched, locationRef.current);
        fetched = sortAlertsByDistance(fetched);
      }
      setAlerts(fetched);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  // Initial fetch + auto-refresh timer
  useEffect(() => {
    refresh();

    if (autoRefreshSeconds > 0) {
      timerRef.current = setInterval(refresh, autoRefreshSeconds * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [refresh, autoRefreshSeconds]);

  // Re-enrich when location changes without a full re-fetch
  useEffect(() => {
    if (!location || alerts.length === 0) {return;}
    setAlerts(prev => sortAlertsByDistance(enrichAlertsWithLocation(prev, location)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {refresh();}
    });
    return () => sub.remove();
  }, [refresh]);

  return { alerts, loading, error, lastUpdated, refresh };
}
