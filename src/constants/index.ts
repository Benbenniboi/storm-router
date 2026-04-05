import { AlertEvent, AlertSeverity, AppSettings } from '../types';

/** Color palette for alert polygons and UI */
export const SEVERITY_COLORS: Record<AlertSeverity | 'default', string> = {
  extreme: '#FF0000',  // Tornado Warning / Emergency — red
  severe: '#FFA500',   // Severe Thunderstorm Warning — orange
  moderate: '#FFFF00', // Flash Flood Warning — yellow
  minor: '#00BFFF',    // Special Weather Statement — sky blue
  unknown: '#AAAAAA',
  default: '#AAAAAA',
};

export const EVENT_COLORS: Partial<Record<string, string>> = {
  'Tornado Warning': '#FF0000',
  'Tornado Emergency': '#FF0000',
  'Tornado Watch': '#FFFF00',
  'Severe Thunderstorm Warning': '#FFA500',
  'Severe Thunderstorm Watch': '#DB7093',
  'Flash Flood Warning': '#00FF00',
  'Flash Flood Watch': '#2E8B57',
  'Special Weather Statement': '#FFE4B5',
};

export const SEVERITY_FILL_OPACITY: Record<AlertSeverity | 'default', number> = {
  extreme: 0.35,
  severe: 0.30,
  moderate: 0.25,
  minor: 0.20,
  unknown: 0.15,
  default: 0.15,
};

/** Events that warrant display on the map */
export const TRACKED_EVENTS: AlertEvent[] = [
  'Tornado Warning',
  'Tornado Emergency',
  'Tornado Watch',
  'Severe Thunderstorm Warning',
  'Severe Thunderstorm Watch',
  'Flash Flood Warning',
  'Flash Flood Watch',
  'Special Weather Statement',
  'Particularly Dangerous Situation',
];

/** Severity rank — higher = more dangerous */
export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
  unknown: 0,
};

export const DEFAULT_SETTINGS: AppSettings = {
  autoRefreshInterval: 60,
  notificationRadiusMiles: 50,
  mapStyle: 'standard',
  filterSeverities: ['extreme', 'severe', 'moderate', 'minor', 'unknown'],
};

/** How many miles ahead of storm to place intercept point */
export const INTERCEPT_LOOKAHEAD_MILES = 15;

/** OSRM public routing server */
export const OSRM_BASE_URL = 'https://router.project-osrm.org';

/** NWS alerts base URL */
export const NWS_BASE_URL = 'https://api.weather.gov';

/**
 * MapTiler API key — free tier: 100k tile loads/month.
 * Sign up at https://cloud.maptiler.com/auth/widget?mode=add
 * Replace this placeholder with your key.
 */
export const MAPTILER_KEY = 'YOUR_MAPTILER_API_KEY_HERE';

export const MAP_STYLES = {
  streets: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
  dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
} as const;

export const COLORS = {
  background: '#0D1117',
  surface: '#161B22',
  border: '#30363D',
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  accent: '#1F6FEB',
  danger: '#F85149',
  warning: '#D29922',
  success: '#3FB950',
  userMarker: '#00BFFF',
  routePolyline: '#1F6FEB',
};
