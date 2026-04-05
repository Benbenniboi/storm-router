import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { UserLocation } from '../types';

interface UseLocationResult {
  location: UserLocation | null;
  permissionDenied: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  setManualLocation: (loc: UserLocation) => void;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'StormRouter Location Permission',
          message: 'StormRouter needs your location to calculate distances to storm warnings.',
          buttonPositive: 'Grant',
          buttonNegative: 'Deny',
        },
      );
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      setPermissionDenied(!granted);
      return granted;
    }
    return true;
  }, []);

  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = Geolocation.watchPosition(
      pos => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      err => {
        setError(`GPS error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 50, // update every 50 meters
        interval: 5000,
        fastestInterval: 2000,
      },
    );
  }, []);

  const setManualLocation = useCallback((loc: UserLocation) => {
    // Stop GPS watch if user enters manual location
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocation(loc);
    setError(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const granted = await requestPermission();
      if (!mounted) {return;}

      if (granted) {
        Geolocation.getCurrentPosition(
          pos => {
            if (!mounted) {return;}
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? undefined,
              timestamp: pos.timestamp,
            });
          },
          err => {
            if (!mounted) {return;}
            setError(`GPS error: ${err.message}`);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
        );
        startWatching();
      }
    })();

    return () => {
      mounted = false;
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, permissionDenied, error, requestPermission, setManualLocation };
}
