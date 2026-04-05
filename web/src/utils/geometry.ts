import * as turf from '@turf/turf';
import { ParsedAlert, UserLocation } from '../types';
import { INTERCEPT_LOOKAHEAD_MILES } from '../constants';

export function distanceToPolygonMiles(
  geometry: ParsedAlert['geometry'],
  lon: number, lat: number,
): number | null {
  if (!geometry) { return null; }
  try {
    const pt = turf.point([lon, lat]);
    let inside = false;

    if (geometry.type === 'Polygon') {
      inside = turf.booleanPointInPolygon(pt, turf.polygon(geometry.coordinates));
    } else if (geometry.type === 'MultiPolygon') {
      inside = geometry.coordinates.some(p => turf.booleanPointInPolygon(pt, turf.polygon(p)));
    }
    if (inside) { return 0; }

    // Nearest edge
    let minDist = Infinity;
    const rings =
      geometry.type === 'Polygon'
        ? geometry.coordinates
        : geometry.coordinates.flat();

    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const seg = turf.lineString([ring[i], ring[i + 1]]);
        const snapped = turf.nearestPointOnLine(seg, pt, { units: 'miles' });
        const d = snapped.properties.dist ?? Infinity;
        if (d < minDist) { minDist = d; }
      }
    }
    return minDist === Infinity ? null : minDist;
  } catch {
    return null;
  }
}

export function nearestEdgePoint(
  geometry: ParsedAlert['geometry'],
  lon: number, lat: number,
): [number, number] | null {
  if (!geometry) { return null; }
  try {
    const pt = turf.point([lon, lat]);
    let minDist = Infinity;
    let nearest: [number, number] | null = null;

    const rings =
      geometry.type === 'Polygon'
        ? geometry.coordinates
        : geometry.coordinates.flat() as number[][][];

    for (const ring of rings) {
      for (let i = 0; i < (ring as number[][]).length - 1; i++) {
        const seg = turf.lineString([(ring as number[][])[i], (ring as number[][])[i + 1]]);
        const snapped = turf.nearestPointOnLine(seg, pt, { units: 'miles' });
        const d = snapped.properties.dist ?? Infinity;
        if (d < minDist) {
          minDist = d;
          nearest = snapped.geometry.coordinates as [number, number];
        }
      }
    }
    return nearest;
  } catch {
    return null;
  }
}

export function calculateInterceptPoint(
  geometry: ParsedAlert['geometry'],
  directionDeg: number,
): [number, number] | null {
  if (!geometry) { return null; }
  try {
    const centroid =
      geometry.type === 'Polygon'
        ? turf.centroid(turf.polygon(geometry.coordinates))
        : turf.centroid(turf.multiPolygon((geometry as any).coordinates));

    const projected = turf.destination(centroid, INTERCEPT_LOOKAHEAD_MILES, directionDeg, { units: 'miles' });
    return projected.geometry.coordinates as [number, number];
  } catch {
    return null;
  }
}

export function enrichAlertsWithLocation(alerts: ParsedAlert[], loc: UserLocation): ParsedAlert[] {
  return alerts.map(alert => ({
    ...alert,
    distanceMiles:   distanceToPolygonMiles(alert.geometry, loc.longitude, loc.latitude),
    nearestEdgePoint: nearestEdgePoint(alert.geometry, loc.longitude, loc.latitude),
    interceptPoint:  alert.stormMotion
      ? calculateInterceptPoint(alert.geometry, alert.stormMotion.directionDeg)
      : null,
  }));
}

export function sortByDistance(alerts: ParsedAlert[]): ParsedAlert[] {
  return [...alerts].sort((a, b) => {
    if (a.distanceMiles == null) { return 1; }
    if (b.distanceMiles == null) { return -1; }
    return a.distanceMiles - b.distanceMiles;
  });
}
