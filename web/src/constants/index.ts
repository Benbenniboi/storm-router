import { AlertSeverity, MapStyle } from '../types';

export const EVENT_COLORS: Record<string, string> = {
  'Tornado Warning':             '#FF2020',
  'Tornado Emergency':           '#FF2020',
  'Tornado Watch':               '#FFFF00',
  'Severe Thunderstorm Warning': '#FFA500',
  'Severe Thunderstorm Watch':   '#DB7093',
  'Flash Flood Warning':         '#00FF7F',
  'Flash Flood Watch':           '#2E8B57',
  'Special Weather Statement':   '#FFE4B5',
};

export const SEVERITY_COLORS: Record<AlertSeverity | 'default', string> = {
  extreme: '#FF2020',
  severe:  '#FFA500',
  moderate:'#FFFF00',
  minor:   '#00BFFF',
  unknown: '#AAAAAA',
  default: '#AAAAAA',
};

export const SEVERITY_FILL_OPACITY: Record<AlertSeverity | 'default', number> = {
  extreme: 0.35,
  severe:  0.30,
  moderate:0.25,
  minor:   0.20,
  unknown: 0.15,
  default: 0.15,
};

export const TRACKED_EVENTS = [
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

export const MAP_STYLES: MapStyle[] = [
  { id: 'streets',   label: 'Streets',   url: k => `https://api.maptiler.com/maps/streets-v2/style.json?key=${k}` },
  { id: 'dark',      label: 'Dark',      url: k => `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${k}` },
  { id: 'satellite', label: 'Satellite', url: k => `https://api.maptiler.com/maps/satellite/style.json?key=${k}` },
];

export const MAPTILER_VALIDATE_URL = (key: string) =>
  `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;

export const NWS_BASE_URL   = 'https://api.weather.gov';
export const OSRM_BASE_URL  = 'https://router.project-osrm.org';
export const INTERCEPT_LOOKAHEAD_MILES = 15;
export const AUTO_REFRESH_SECONDS = 60;
export const LOCALSTORAGE_KEY = 'stormrouter_maptiler_key';
