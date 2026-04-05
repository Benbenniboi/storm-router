import React, { memo, useMemo } from 'react';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { OnPressEvent } from '@maplibre/maplibre-react-native/javascript/types/OnPressEvent';
import { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { ParsedAlert } from '../types';
import { EVENT_COLORS, SEVERITY_COLORS } from '../constants';

interface Props {
  alerts: ParsedAlert[];
  onAlertPress?: (alert: ParsedAlert) => void;
}

/**
 * Renders all alert polygons as a single MapLibre ShapeSource with data-driven styling.
 * Far more efficient than one Polygon component per alert.
 */
const AlertPolygonsLayer = memo(({ alerts, onAlertPress }: Props) => {
  const geojson = useMemo<FeatureCollection<Polygon | MultiPolygon>>(() => ({
    type: 'FeatureCollection',
    features: alerts
      .filter(a => a.geometry != null)
      .map(alert => ({
        type: 'Feature',
        id: alert.id,
        geometry: alert.geometry as Polygon | MultiPolygon,
        properties: {
          id: alert.id,
          event: alert.event,
          severity: alert.severity,
          color: EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.default,
        },
      })),
  }), [alerts]);

  const handlePress = (e: OnPressEvent) => {
    const feature = e.features[0];
    if (!feature?.properties?.id) {return;}
    const alert = alerts.find(a => a.id === feature.properties!.id);
    if (alert) {onAlertPress?.(alert);}
  };

  return (
    <MapLibreGL.ShapeSource
      id="alert-polygons"
      shape={geojson}
      onPress={handlePress}
    >
      {/* Semi-transparent fill */}
      <MapLibreGL.FillLayer
        id="alert-fill"
        style={{
          fillColor: ['get', 'color'],
          fillOpacity: [
            'match', ['get', 'severity'],
            'extreme', 0.35,
            'severe', 0.30,
            'moderate', 0.25,
            'minor', 0.20,
            0.15,
          ],
        }}
      />
      {/* Solid outline */}
      <MapLibreGL.LineLayer
        id="alert-outline"
        style={{
          lineColor: ['get', 'color'],
          lineWidth: 2.5,
        }}
      />
    </MapLibreGL.ShapeSource>
  );
});

AlertPolygonsLayer.displayName = 'AlertPolygonsLayer';
export default AlertPolygonsLayer;
