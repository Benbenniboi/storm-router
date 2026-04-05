import { Feature, Polygon, MultiPolygon } from 'geojson';

export type AlertSeverity = 'extreme' | 'severe' | 'moderate' | 'minor' | 'unknown';

export interface StormMotion {
  directionDeg: number;
  speedKnots: number;
  speedMph: number;
}

export interface ParsedAlert {
  id: string;
  event: string;
  severity: AlertSeverity;
  headline: string;
  description: string;
  instruction: string;
  senderName: string;
  areaDesc: string;
  expires: string;
  sent: string;
  geometry: Feature<Polygon | MultiPolygon>['geometry'] | null;
  stormMotion: StormMotion | null;
  nearestEdgePoint: [number, number] | null;
  distanceMiles: number | null;
  interceptPoint: [number, number] | null;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  alertId: string;
  coordinates: Array<[number, number]>;
  distanceMiles: number;
  durationMinutes: number;
}

export interface MapStyle {
  id: 'streets' | 'dark' | 'satellite';
  label: string;
  url: (key: string) => string;
}
