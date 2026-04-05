import axios from 'axios';
import { RouteResult } from '../types';
import { OSRM_BASE_URL } from '../constants';

interface OSRMRouteResponse {
  code: string;
  routes: Array<{
    distance: number; // meters
    duration: number; // seconds
    geometry: {
      coordinates: Array<[number, number]>; // [lon, lat]
    };
  }>;
}

/**
 * Get a driving route from origin to destination using the free OSRM API.
 * Returns coordinates as [lon, lat] pairs.
 */
export async function getRoute(
  originLon: number,
  originLat: number,
  destLon: number,
  destLat: number,
  alertId: string,
): Promise<RouteResult | null> {
  try {
    const coords = `${originLon},${originLat};${destLon},${destLat}`;
    const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}`;

    const response = await axios.get<OSRMRouteResponse>(url, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: false,
        alternatives: false,
      },
      timeout: 15000,
    });

    if (response.data.code !== 'Ok' || !response.data.routes.length) {
      return null;
    }

    const route = response.data.routes[0];
    const METERS_PER_MILE = 1609.344;

    return {
      alertId,
      coordinates: route.geometry.coordinates as Array<[number, number]>,
      distanceMiles: route.distance / METERS_PER_MILE,
      durationMinutes: route.duration / 60,
    };
  } catch (error) {
    console.warn('OSRM routing failed:', error);
    return null;
  }
}
