import { StormMotion } from '../types';

export function parseStormMotion(params: Record<string, string[]>): StormMotion | null {
  const raw =
    params['STORM MOTION']?.[0] ||
    params['stormMotion']?.[0] ||
    params['eventMotionDescription']?.[0] || '';

  if (raw) {
    const deg = raw.match(/(\d+)\s*DEG/i);
    const kt  = raw.match(/(\d+(?:\.\d+)?)\s*KT/i);
    if (deg && kt) {
      const speedKnots = parseFloat(kt[1]);
      return { directionDeg: parseInt(deg[1], 10), speedKnots, speedMph: speedKnots * 1.15078 };
    }
  }

  const df = params['motionDeg']?.[0];
  const kf = params['motionKnots']?.[0];
  if (df && kf) {
    const speedKnots = parseFloat(kf);
    return { directionDeg: parseInt(df, 10), speedKnots, speedMph: speedKnots * 1.15078 };
  }
  return null;
}

export function formatExpires(iso: string): string {
  if (!iso) { return 'Unknown'; }
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return iso; }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

export function shortEventLabel(event: string): string {
  const map: Record<string, string> = {
    'Tornado Warning':             'TOR',
    'Tornado Emergency':           'TOR EMRG',
    'Tornado Watch':               'TOA',
    'Severe Thunderstorm Warning': 'SVR',
    'Severe Thunderstorm Watch':   'SVA',
    'Flash Flood Warning':         'FFW',
    'Flash Flood Watch':           'FFA',
    'Special Weather Statement':   'SPS',
  };
  return map[event] ?? event.slice(0, 6).toUpperCase();
}

export function bearingToCardinal(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export function etaMinutes(distanceMiles: number, speedMph: number): number | null {
  if (!speedMph || speedMph <= 0) { return null; }
  return (distanceMiles / speedMph) * 60;
}
