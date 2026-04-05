import axios from 'axios';
import { NWSAlertsResponse, ParsedAlert } from '../types';
import { NWS_BASE_URL, TRACKED_EVENTS } from '../constants';
import { parseStormMotion } from '../utils/alerts';

const nwsClient = axios.create({
  baseURL: NWS_BASE_URL,
  headers: {
    'User-Agent': '(StormRouter App, contact@stormrouter.app)',
    Accept: 'application/geo+json',
  },
  timeout: 15000,
});

/**
 * Fetch all active severe weather alerts from NWS.
 * Filters to tracked event types only.
 */
export async function fetchActiveAlerts(state?: string): Promise<ParsedAlert[]> {
  const params: Record<string, string> = {
    status: 'actual',
    message_type: 'alert,update',
    urgency: 'Immediate,Future',
    severity: 'Extreme,Severe,Moderate',
  };

  if (state) {
    params.area = state.toUpperCase();
  }

  const response = await nwsClient.get<NWSAlertsResponse>('/alerts/active', { params });
  const features = response.data.features ?? [];

  const parsed: ParsedAlert[] = features
    .filter(f => TRACKED_EVENTS.some(e => f.properties.event?.includes(e)))
    .map(feature => {
      const props = feature.properties;
      const motion = parseStormMotion(props.parameters);

      return {
        id: feature.id,
        event: props.event,
        severity: props.severity,
        headline: props.headline ?? props.event,
        description: props.description ?? '',
        instruction: props.instruction ?? '',
        senderName: props.senderName ?? '',
        areaDesc: props.areaDesc ?? '',
        expires: props.expires ?? '',
        sent: props.sent ?? '',
        geometry: feature.geometry,
        stormMotion: motion,
        nearestEdgePoint: null,
        distanceMiles: null,
        interceptPoint: null,
      };
    });

  return parsed;
}

/**
 * Geocode a city/state string using the NWS points endpoint (free, no key).
 * Falls back to a simple nominatim call.
 */
export async function geocodeLocation(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      {
        headers: { 'User-Agent': 'StormRouter/1.0' },
        timeout: 10000,
      },
    );
    const results = resp.data;
    if (results?.length > 0) {
      return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
    }
  } catch (_) {
    // ignore
  }
  return null;
}
