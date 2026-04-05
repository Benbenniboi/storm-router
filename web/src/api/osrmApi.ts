import axios from 'axios';
import { RouteResult } from '../types';
import { OSRM_BASE_URL } from '../constants';

export async function getRoute(
  originLon: number, originLat: number,
  destLon: number,   destLat: number,
  alertId: string,
): Promise<RouteResult | null> {
  try {
    const { data } = await axios.get(
      `${OSRM_BASE_URL}/route/v1/driving/${originLon},${originLat};${destLon},${destLat}`,
      {
        params: { overview: 'full', geometries: 'geojson', steps: false },
        timeout: 15000,
      },
    );
    if (data.code !== 'Ok' || !data.routes.length) { return null; }
    const r = data.routes[0];
    return {
      alertId,
      coordinates: r.geometry.coordinates as Array<[number, number]>,
      distanceMiles: r.distance / 1609.344,
      durationMinutes: r.duration / 60,
    };
  } catch {
    return null;
  }
}
