import { Feature, Polygon, MultiPolygon, Point, LineString } from 'geojson';

export type AlertSeverity = 'extreme' | 'severe' | 'moderate' | 'minor' | 'unknown';

export type AlertEvent =
  | 'Tornado Warning'
  | 'Tornado Watch'
  | 'Severe Thunderstorm Warning'
  | 'Severe Thunderstorm Watch'
  | 'Flash Flood Warning'
  | 'Flash Flood Watch'
  | 'Special Weather Statement'
  | 'Tornado Emergency'
  | string;

export interface StormMotion {
  /** Direction the storm is moving TOWARD, in degrees (meteorological FROM) */
  directionDeg: number;
  speedKnots: number;
  speedMph: number;
}

export interface NWSAlertProperties {
  id: string;
  areaDesc: string;
  sent: string;
  effective: string;
  onset: string;
  expires: string;
  ends: string | null;
  status: string;
  messageType: string;
  category: string;
  severity: AlertSeverity;
  certainty: string;
  urgency: string;
  event: AlertEvent;
  sender: string;
  senderName: string;
  headline: string | null;
  description: string;
  instruction: string | null;
  response: string;
  parameters: Record<string, string[]>;
}

export interface NWSAlert {
  id: string;
  type: string;
  geometry: Feature<Polygon | MultiPolygon>['geometry'] | null;
  properties: NWSAlertProperties;
}

export interface NWSAlertsResponse {
  type: string;
  features: Array<{
    id: string;
    type: string;
    geometry: NWSAlert['geometry'];
    properties: NWSAlertProperties;
  }>;
}

export interface ParsedAlert {
  id: string;
  event: AlertEvent;
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
  /** Closest edge point on the polygon to user location */
  nearestEdgePoint: [number, number] | null;
  /** Straight-line distance in miles to nearest polygon edge */
  distanceMiles: number | null;
  /** Suggested intercept coordinate [lon, lat] */
  interceptPoint: [number, number] | null;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface RouteResult {
  alertId: string;
  coordinates: Array<[number, number]>; // [lon, lat] pairs
  distanceMiles: number;
  durationMinutes: number;
}

export type MapStyle = 'standard' | 'dark' | 'satellite';

export interface AppSettings {
  autoRefreshInterval: number; // seconds
  notificationRadiusMiles: number;
  mapStyle: MapStyle;
  filterSeverities: AlertSeverity[];
}
