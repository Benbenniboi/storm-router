import * as turf from '@turf/turf';
import { Feature, Polygon, MultiPolygon, Point } from 'geojson';
import { ParsedAlert, StormMotion, UserLocation } from '../types';
import { INTERCEPT_LOOKAHEAD_MILES } from '../constants';

/**
 * Find the nearest point on a polygon's boundary to a given coordinate.
 * Returns [lon, lat] or null.
 */
export function nearestPointOnPolygon(
  geometry: Feature<Polygon | MultiPolygon>['geometry'],
  userLon: number,
  userLat: number,
): [number, number] | null {
  if (!geometry) {return null;}

  try {
    const userPt = turf.point([userLon, userLat]);
    let minDist = Infinity;
    let nearest: [number, number] | null = null;

    const processRing = (ring: number[][]) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const segment = turf.lineString([ring[i], ring[i + 1]]);
        const snapped = turf.nearestPointOnLine(segment, userPt, { units: 'miles' });
        const d = snapped.properties.dist ?? Infinity;
        if (d < minDist) {
          minDist = d;
          nearest = snapped.geometry.coordinates as [number, number];
        }
      }
    };

    if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach(processRing);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(poly => poly.forEach(processRing));
    }

    return nearest;
  } catch {
    return null;
  }
}

/**
 * Distance in miles from a point to the nearest edge of a polygon.
 */
export function distanceToPolygonMiles(
  geometry: Feature<Polygon | MultiPolygon>['geometry'],
  userLon: number,
  userLat: number,
): number | null {
  if (!geometry) {return null;}

  try {
    const userPt = turf.point([userLon, userLat]);

    // Check if user is inside the polygon first
    let inside = false;
    if (geometry.type === 'Polygon') {
      inside = turf.booleanPointInPolygon(userPt, turf.polygon(geometry.coordinates));
    } else if (geometry.type === 'MultiPolygon') {
      inside = geometry.coordinates.some(poly =>
        turf.booleanPointInPolygon(userPt, turf.polygon(poly)),
      );
    }

    if (inside) {return 0;}

    const nearest = nearestPointOnPolygon(geometry, userLon, userLat);
    if (!nearest) {return null;}

    return turf.distance(userPt, turf.point(nearest), { units: 'miles' });
  } catch {
    return null;
  }
}

/**
 * Calculate the suggested intercept point for a storm given:
 * - The warning polygon
 * - The storm motion vector
 * - The user's location
 *
 * Strategy: project the storm centroid forward by INTERCEPT_LOOKAHEAD_MILES
 * in the storm's travel direction.
 */
export function calculateInterceptPoint(
  geometry: Feature<Polygon | MultiPolygon>['geometry'],
  motion: StormMotion,
): [number, number] | null {
  if (!geometry || !motion) {return null;}

  try {
    let centroid: Feature<Point>;

    if (geometry.type === 'Polygon') {
      centroid = turf.centroid(turf.polygon(geometry.coordinates));
    } else if (geometry.type === 'MultiPolygon') {
      centroid = turf.centroid(turf.multiPolygon(geometry.coordinates));
    } else {
      return null;
    }

    // Storm motion direction is the direction the storm MOVES TOWARD
    const bearing = motion.directionDeg;

    // Project the centroid forward by lookahead distance
    const projected = turf.destination(centroid, INTERCEPT_LOOKAHEAD_MILES, bearing, {
      units: 'miles',
    });

    return projected.geometry.coordinates as [number, number];
  } catch {
    return null;
  }
}

/**
 * Enrich a list of parsed alerts with distance, nearest edge, and intercept point
 * relative to the user's location.
 */
export function enrichAlertsWithLocation(
  alerts: ParsedAlert[],
  location: UserLocation,
): ParsedAlert[] {
  return alerts.map(alert => {
    if (!alert.geometry) {
      return alert;
    }

    const distanceMiles = distanceToPolygonMiles(
      alert.geometry,
      location.longitude,
      location.latitude,
    );

    const nearestEdgePoint = nearestPointOnPolygon(
      alert.geometry,
      location.longitude,
      location.latitude,
    );

    const interceptPoint = alert.stormMotion
      ? calculateInterceptPoint(alert.geometry, alert.stormMotion)
      : null;

    return {
      ...alert,
      distanceMiles,
      nearestEdgePoint,
      interceptPoint,
    };
  });
}

/**
 * Sort alerts by distance ascending. Alerts with null distance go to the end.
 */
export function sortAlertsByDistance(alerts: ParsedAlert[]): ParsedAlert[] {
  return [...alerts].sort((a, b) => {
    if (a.distanceMiles == null) {return 1;}
    if (b.distanceMiles == null) {return -1;}
    return a.distanceMiles - b.distanceMiles;
  });
}

/**
 * Convert a GeoJSON geometry into react-native-maps coordinate arrays.
 * Returns array of { latitude, longitude } arrays (one per polygon ring).
 */
export function geometryToLatLng(
  geometry: Feature<Polygon | MultiPolygon>['geometry'],
): Array<Array<{ latitude: number; longitude: number }>> {
  if (!geometry) {return [];}

  const rings: Array<Array<{ latitude: number; longitude: number }>> = [];

  const processRing = (ring: number[][]) => {
    rings.push(
      ring.map(([lon, lat]) => ({ latitude: lat, longitude: lon })),
    );
  };

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(processRing);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(poly => poly.forEach(processRing));
  }

  return rings;
}

/**
 * Convert a route coordinate array [[lon, lat], ...] to react-native-maps LatLng format.
 */
export function routeToLatLng(coords: Array<[number, number]>): Array<{ latitude: number; longitude: number }> {
  return coords.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
}
