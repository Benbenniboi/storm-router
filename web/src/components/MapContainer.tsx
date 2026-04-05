import React, { useCallback, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import {
  useMapLibre,
  updateAlertLayers,
  updateMotionLayers,
  updateRouteLayer,
  updateUserLayer,
} from '../hooks/useMapLibre';
import { ParsedAlert, RouteResult, UserLocation } from '../types';

interface Props {
  styleUrl: string;
  alerts: ParsedAlert[];
  route: RouteResult | null;
  userLocation: UserLocation | null;
  onAlertClick: (alert: ParsedAlert) => void;
}

export default function MapContainer({ styleUrl, alerts, route, userLocation, onAlertClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mapRef, mapReady } = useMapLibre(containerRef, styleUrl);
  const alertsRef = useRef(alerts);
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  // Wire up alert polygon click handler once map is ready
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

    return () => {
      map.off('click', 'alert-fill', handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, onAlertClick]);

  // Update layers when data changes
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) { return; }
    updateUserLayer(map, userLocation);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, userLocation]);

  /** Exposed: fly camera to a coordinate */
  const flyTo = useCallback((lon: number, lat: number, zoom = 7) => {
    mapRef.current?.flyTo({ center: [lon, lat], zoom, duration: 1000 });
  }, [mapRef]);

  /** Exposed: fit map to route bounds */
  const fitToBounds = useCallback((coords: Array<[number, number]>) => {
    if (!coords.length || !mapRef.current) { return; }
    const bounds = coords.reduce(
      (b, [lon, lat]) => b.extend([lon, lat] as [number, number]),
      new maplibregl.LngLatBounds(coords[0], coords[0]),
    );
    mapRef.current.fitBounds(bounds, { padding: { top: 60, bottom: 320, left: 40, right: 40 }, duration: 900 });
  }, [mapRef]);

  // Expose flyTo / fitToBounds via imperative ref — we attach them to the container div
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).__flyTo = flyTo;
      (containerRef.current as any).__fitToBounds = fitToBounds;
    }
  }, [flyTo, fitToBounds]);

  return <div ref={containerRef} className="w-full h-full" />;
}
