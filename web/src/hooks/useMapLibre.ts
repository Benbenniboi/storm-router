import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { ParsedAlert, RouteResult, UserLocation } from '../types';
import { EVENT_COLORS, SEVERITY_COLORS, SEVERITY_FILL_OPACITY } from '../constants';
import * as turf from '@turf/turf';

const POLYGON_SOURCE  = 'alert-polygons';
const MOTION_SOURCE   = 'storm-motion';
const ROUTE_SOURCE    = 'intercept-route';
const USER_SOURCE     = 'user-location';

export function useMapLibre(
  containerRef: React.RefObject<HTMLDivElement>,
  styleUrl: string,
) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) { return; }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [-96, 38.5],
      zoom: 4,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left');

    map.on('load', () => {
      // Alert polygon fill + outline layers
      map.addSource(POLYGON_SOURCE, { type: 'geojson', data: emptyCollection() });
      map.addLayer({ id: 'alert-fill', type: 'fill', source: POLYGON_SOURCE,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['get', 'fillOpacity'],
        },
      });
      map.addLayer({ id: 'alert-outline', type: 'line', source: POLYGON_SOURCE,
        paint: { 'line-color': ['get', 'color'], 'line-width': 2.5 },
      });

      // Storm motion shafts + labels
      map.addSource(MOTION_SOURCE, { type: 'geojson', data: emptyCollection() });
      map.addLayer({ id: 'motion-lines', type: 'line', source: MOTION_SOURCE,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-dasharray': [6, 3],
        },
      });
      map.addLayer({ id: 'motion-labels', type: 'symbol', source: MOTION_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.4],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#000',
          'text-halo-width': 1.5,
        },
      });

      // Intercept route
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data: emptyCollection() });
      map.addLayer({ id: 'route-casing', type: 'line', source: ROUTE_SOURCE,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.25 },
      });
      map.addLayer({ id: 'route-line', type: 'line', source: ROUTE_SOURCE,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#1F6FEB', 'line-width': 4 },
      });
      map.addLayer({ id: 'route-dest', type: 'circle', source: ROUTE_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': '#1F6FEB',
          'circle-radius': 8,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({ id: 'route-dest-label', type: 'symbol', source: ROUTE_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-anchor': 'bottom',
          'text-offset': [0, -1.2],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1.5 },
      });

      // User location
      map.addSource(USER_SOURCE, { type: 'geojson', data: emptyCollection() });
      map.addLayer({ id: 'user-dot-outer', type: 'circle', source: USER_SOURCE,
        paint: { 'circle-color': '#00BFFF', 'circle-radius': 11, 'circle-opacity': 0.3 },
      });
      map.addLayer({ id: 'user-dot', type: 'circle', source: USER_SOURCE,
        paint: {
          'circle-color': '#00BFFF',
          'circle-radius': 7,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });

      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, styleUrl]);

  return { map: mapRef.current, mapRef, mapReady };
}

/** Update alert polygon layers. Call whenever alerts list changes. */
export function updateAlertLayers(map: maplibregl.Map, alerts: ParsedAlert[]) {
  const src = map.getSource(POLYGON_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!src) { return; }

  src.setData({
    type: 'FeatureCollection',
    features: alerts
      .filter(a => a.geometry != null)
      .map(a => ({
        type: 'Feature' as const,
        id: a.id,
        geometry: a.geometry!,
        properties: {
          id: a.id,
          color: EVENT_COLORS[a.event] ?? SEVERITY_COLORS[a.severity] ?? SEVERITY_COLORS.default,
          fillOpacity: SEVERITY_FILL_OPACITY[a.severity] ?? SEVERITY_FILL_OPACITY.default,
        },
      })),
  });
}

/** Update storm motion arrow layers. */
export function updateMotionLayers(map: maplibregl.Map, alerts: ParsedAlert[]) {
  const src = map.getSource(MOTION_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!src) { return; }

  const features: GeoJSON.Feature[] = [];
  const ARROW_MILES = 20;

  for (const alert of alerts) {
    if (!alert.geometry || !alert.stormMotion) { continue; }
    try {
      const centroid =
        alert.geometry.type === 'Polygon'
          ? turf.centroid(turf.polygon(alert.geometry.coordinates))
          : turf.centroid(turf.multiPolygon((alert.geometry as any).coordinates));

      const tip = turf.destination(centroid, ARROW_MILES, alert.stormMotion.directionDeg, { units: 'miles' });
      const color = EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? '#fff';

      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [centroid.geometry.coordinates, tip.geometry.coordinates] },
        properties: { color },
      });
      features.push({
        type: 'Feature',
        geometry: tip.geometry,
        properties: { color, label: `${Math.round(alert.stormMotion.speedMph)} mph` },
      });
    } catch { /* skip */ }
  }

  src.setData({ type: 'FeatureCollection', features });
}

/** Update route layer from OSRM result. Pass null to clear. */
export function updateRouteLayer(map: maplibregl.Map, route: RouteResult | null) {
  const src = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!src) { return; }

  if (!route) {
    src.setData(emptyCollection());
    return;
  }

  const last = route.coordinates[route.coordinates.length - 1];
  src.setData({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: route.coordinates },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: last },
        properties: {
          label: `${route.distanceMiles.toFixed(1)} mi · ${Math.round(route.durationMinutes)} min`,
        },
      },
    ],
  });
}

/** Update user location dot. */
export function updateUserLayer(map: maplibregl.Map, loc: UserLocation | null) {
  const src = map.getSource(USER_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!src) { return; }

  src.setData(
    loc
      ? {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [loc.longitude, loc.latitude] }, properties: {} }],
        }
      : emptyCollection(),
  );
}

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}
