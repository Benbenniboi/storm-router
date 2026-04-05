import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import {
  useMapLibre,
  updateAlertLayers,
  updateMotionLayers,
  updateRouteLayer,
  updateUserLayer,
} from '../hooks/useMapLibre';
import { ParsedAlert, RouteResult, UserLocation } from '../types';

export interface MapHandle {
  flyTo: (lon: number, lat: number, zoom?: number) => void;
  fitToBounds: (coords: Array<[number, number]>) => void;
}

interface Props {
  styleUrl: string;
  alerts: ParsedAlert[];
  route: RouteResult | null;
  userLocation: UserLocation | null;
  snappedLocation: UserLocation | null;
  onAlertClick: (alert: ParsedAlert) => void;
}

const MapContainer = forwardRef<MapHandle, Props>(
  ({ styleUrl, alerts, route, userLocation, snappedLocation, onAlertClick }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { mapRef, mapReady } = useMapLibre(containerRef, styleUrl);
    const alertsRef = useRef(alerts);
    useEffect(() => { alertsRef.current = alerts; }, [alerts]);

    // Expose flyTo and fitToBounds directly to parent via ref — fixes the
    // imperative ref mismatch that was preventing route rendering
    useImperativeHandle(ref, () => ({
      flyTo: (lon, lat, zoom = 7) => {
        mapRef.current?.flyTo({ center: [lon, lat], zoom, duration: 900, essential: true });
      },
      fitToBounds: (coords) => {
        const map = mapRef.current;
        if (!map || !coords.length) { return; }
        const bounds = coords.reduce(
          (b, [lon, lat]) => b.extend([lon, lat] as [number, number]),
          new maplibregl.LngLatBounds(coords[0], coords[0]),
        );
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 200, left: 340, right: 420 },
          duration: 900,
          essential: true,
        });
      },
    }), [mapRef]);

    // Alert polygon click
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady) { return; }

      const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature?.properties?.id) { return; }
        const alert = alertsRef.current.find(a => a.id === feature.properties!.id);
        if (alert) { onAlertClick(alert); }
      };

      map.on('click', 'alert-fill', handleClick);
      map.on('mouseenter', 'alert-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'alert-fill', () => { map.getCanvas().style.cursor = ''; });
      return () => { map.off('click', 'alert-fill', handleClick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, onAlertClick]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady) { return; }
      updateAlertLayers(map, alerts);
      updateMotionLayers(map, alerts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, alerts]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady) { return; }
      updateRouteLayer(map, route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, route]);

    // Show snapped position on road when navigating, raw GPS dot otherwise
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapReady) { return; }
      updateUserLayer(map, snappedLocation ?? userLocation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, snappedLocation, userLocation]);

    return <div ref={containerRef} className="w-full h-full" />;
  },
);

MapContainer.displayName = 'MapContainer';
export default MapContainer;
