import axios from 'axios';
import { RouteResult, RouteStep } from '../types';
import { OSRM_BASE_URL } from '../constants';
import { bearingToCardinal } from '../utils/alerts';

export async function getRoute(
  originLon: number, originLat: number,
  destLon: number,   destLat: number,
  alertId: string,
): Promise<RouteResult | null> {
  try {
    const { data } = await axios.get(
      `${OSRM_BASE_URL}/route/v1/driving/${originLon},${originLat};${destLon},${destLat}`,
      {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: true,
          annotations: false,
        },
        timeout: 15000,
      },
    );

    if (data.code !== 'Ok' || !data.routes.length) { return null; }

    const r = data.routes[0];
    const steps: RouteStep[] = [];

    for (const leg of r.legs) {
      for (const step of leg.steps) {
        steps.push({
          instruction: buildInstruction(step),
          streetName: step.name || '',
          distanceMiles: step.distance / 1609.344,
          durationSeconds: step.duration,
          maneuverType: step.maneuver?.type ?? 'continue',
          maneuverModifier: step.maneuver?.modifier,
          bearingAfter: step.maneuver?.bearing_after ?? 0,
          coordinate: step.maneuver?.location ?? [originLon, originLat],
        });
      }
    }

    return {
      alertId,
      coordinates: r.geometry.coordinates as Array<[number, number]>,
      distanceMiles: r.distance / 1609.344,
      durationMinutes: r.duration / 60,
      steps,
    };
  } catch (e) {
    console.error('OSRM error:', e);
    return null;
  }
}

function buildInstruction(step: any): string {
  const type: string     = step.maneuver?.type ?? 'continue';
  const modifier: string = step.maneuver?.modifier ?? '';
  const road: string     = step.name ? `onto ${step.name}` : '';
  const bearing: number  = step.maneuver?.bearing_after ?? 0;

  switch (type) {
    case 'depart':
      return `Head ${bearingToCardinal(bearing)}${road ? ' ' + road : ''}`;
    case 'arrive':
      return 'Arrive at intercept point';
    case 'turn':
      return `Turn ${modifier}${road ? ' ' + road : ''}`;
    case 'new name':
      return `Continue${road ? ' ' + road : ' straight'}`;
    case 'merge':
      return `Merge ${modifier}${road ? ' ' + road : ''}`;
    case 'on ramp':
      return `Take ramp on the ${modifier || 'right'}`;
    case 'off ramp':
      return `Take exit on the ${modifier || 'right'}${road ? ' ' + road : ''}`;
    case 'fork':
      return `Keep ${modifier || 'right'} at the fork`;
    case 'end of road':
      return `Turn ${modifier}${road ? ' ' + road : ''}`;
    case 'continue':
      return `Continue${road ? ' ' + road : ' straight'}`;
    case 'roundabout':
    case 'rotary':
      return `Enter roundabout`;
    case 'exit roundabout':
    case 'exit rotary':
      return `Exit roundabout${road ? ' ' + road : ''}`;
    default:
      return `Continue${road ? ' ' + road : ''}`;
  }
}
