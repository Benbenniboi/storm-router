import { StormMotion } from '../types';

/**
 * Parse storm motion from NWS alert parameters.
 *
 * NWS encodes storm motion in the parameters field as:
 *   STORM MOTION: "270DEG 25KT" (moving toward 270°, at 25 knots)
 * or as separate fields:
 *   motionDeg, motionKnots
 */
export function parseStormMotion(
  parameters: Record<string, string[]>,
): StormMotion | null {
  if (!parameters) {return null;}

  // Try the STORM MOTION string field
  const motionRaw =
    parameters['STORM MOTION']?.[0] ||
    parameters['stormMotion']?.[0] ||
    parameters['eventMotionDescription']?.[0] ||
    '';

  if (motionRaw) {
    // Format: "270DEG 25KT" or "270 DEG 25 KT" or "270 25"
    const degMatch = motionRaw.match(/(\d+)\s*DEG/i);
    const ktMatch = motionRaw.match(/(\d+(?:\.\d+)?)\s*KT/i);

    if (degMatch && ktMatch) {
      const directionDeg = parseInt(degMatch[1], 10);
      const speedKnots = parseFloat(ktMatch[1]);
      return {
        directionDeg,
        speedKnots,
        speedMph: knotsToMph(speedKnots),
      };
    }
  }

  // Try separate motionDeg / motionKnots fields
  const degField = parameters['motionDeg']?.[0] || parameters['MOTION DEG']?.[0];
  const ktField = parameters['motionKnots']?.[0] || parameters['MOTION KNOTS']?.[0];
  if (degField && ktField) {
    const directionDeg = parseInt(degField, 10);
    const speedKnots = parseFloat(ktField);
    return {
      directionDeg,
      speedKnots,
      speedMph: knotsToMph(speedKnots),
    };
  }

  return null;
}

function knotsToMph(knots: number): number {
  return knots * 1.15078;
}

/**
 * Format an ISO date string to a human-readable expiration label.
 */
export function formatExpires(iso: string): string {
  if (!iso) {return 'Unknown';}
  const d = new Date(iso);
  if (isNaN(d.getTime())) {return iso;}
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

/**
 * Return a short label for the event type.
 */
export function shortEventLabel(event: string): string {
  const map: Record<string, string> = {
    'Tornado Warning': 'TOR',
    'Tornado Emergency': 'TOR EMERG',
    'Tornado Watch': 'TOA',
    'Severe Thunderstorm Warning': 'SVR',
    'Severe Thunderstorm Watch': 'SVA',
    'Flash Flood Warning': 'FFW',
    'Flash Flood Watch': 'FFA',
    'Special Weather Statement': 'SPS',
  };
  return map[event] ?? event.slice(0, 6).toUpperCase();
}

/**
 * Given distance in miles and speed in mph, return ETA in minutes.
 */
export function etaMinutes(distanceMiles: number, speedMph: number): number {
  if (!speedMph || speedMph <= 0) {return Infinity;}
  return (distanceMiles / speedMph) * 60;
}
