import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchActiveAlerts } from '../api/nwsApi';
import { enrichAlertsWithLocation, sortByDistance } from '../utils/geometry';
import { ParsedAlert, UserLocation } from '../types';
import { AUTO_REFRESH_SECONDS } from '../constants';

export function useAlerts(location: UserLocation | null) {
  const [alerts, setAlerts]         = useState<ParsedAlert[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const locationRef = useRef(location);

  useEffect(() => { locationRef.current = location; }, [location]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fetched = await fetchActiveAlerts();
      if (locationRef.current) {
        fetched = sortByDistance(enrichAlertsWithLocation(fetched, locationRef.current));
      }
      setAlerts(fetched);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-enrich when location changes without re-fetching
  useEffect(() => {
    if (!location || alerts.length === 0) { return; }
    setAlerts(prev => sortByDistance(enrichAlertsWithLocation(prev, location)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, AUTO_REFRESH_SECONDS * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  return { alerts, loading, error, lastUpdated, refresh };
}
