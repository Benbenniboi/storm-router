import axios from 'axios';
import { ParsedAlert } from '../types';
import { NWS_BASE_URL, TRACKED_EVENTS } from '../constants';
import { parseStormMotion } from '../utils/alerts';

const client = axios.create({
  baseURL: NWS_BASE_URL,
  headers: {
    'User-Agent': '(StormRouter Web, contact@stormrouter.app)',
    Accept: 'application/geo+json',
  },
  timeout: 15000,
});

export async function fetchActiveAlerts(state?: string): Promise<ParsedAlert[]> {
  const params: Record<string, string> = {
    status: 'actual',
    message_type: 'alert,update',
    urgency: 'Immediate,Future',
    severity: 'Extreme,Severe,Moderate',
  };
  if (state) { params.area = state.toUpperCase(); }

  const { data } = await client.get('/alerts/active', { params });
  const features: any[] = data.features ?? [];

  return features
    .filter(f => TRACKED_EVENTS.some(e => f.properties.event?.includes(e)))
    .map(f => ({
      id: f.id,
      event: f.properties.event,
      severity: f.properties.severity,
      headline: f.properties.headline ?? f.properties.event,
      description: f.properties.description ?? '',
      instruction: f.properties.instruction ?? '',
      senderName: f.properties.senderName ?? '',
      areaDesc: f.properties.areaDesc ?? '',
      expires: f.properties.expires ?? '',
      sent: f.properties.sent ?? '',
      geometry: f.geometry,
      stormMotion: parseStormMotion(f.properties.parameters ?? {}),
      nearestEdgePoint: null,
      distanceMiles: null,
      interceptPoint: null,
    }));
}

export async function geocodeQuery(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const { data } = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: { q: query, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'StormRouter/1.0' },
        timeout: 8000,
      },
    );
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch { /* ignore */ }
  return null;
}
