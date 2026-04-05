import React, { memo, useMemo } from 'react';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as turf from '@turf/turf';
import { FeatureCollection, LineString, Point } from 'geojson';
import { ParsedAlert } from '../types';
import { EVENT_COLORS, SEVERITY_COLORS } from '../constants';

interface Props {
  alerts: ParsedAlert[];
}

const ARROW_LENGTH_MILES = 20;

/**
 * Renders storm motion vectors as dashed lines + arrowhead dots.
 */
const StormMotionLayer = memo(({ alerts }: Props) => {
  /** Arrow shaft lines */
  const linesGeoJSON = useMemo<FeatureCollection<LineString>>(() => {
    const features: FeatureCollection<LineString>['features'] = [];

    for (const alert of alerts) {
      if (!alert.geometry || !alert.stormMotion) {continue;}

      try {
        const centroidFt =
          alert.geometry.type === 'Polygon'
            ? turf.centroid(turf.polygon(alert.geometry.coordinates))
            : turf.centroid(turf.multiPolygon((alert.geometry as any).coordinates));

        const tip = turf.destination(centroidFt, ARROW_LENGTH_MILES, alert.stormMotion.directionDeg, {
          units: 'miles',
        });

        const color =
          EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.default;

        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              centroidFt.geometry.coordinates,
              tip.geometry.coordinates,
            ],
          },
          properties: { color, speedMph: Math.round(alert.stormMotion.speedMph) },
        });
      } catch {
        // skip malformed geometry
      }
    }

    return { type: 'FeatureCollection', features };
  }, [alerts]);

  /** Arrowhead tip points */
  const tipsGeoJSON = useMemo<FeatureCollection<Point>>(() => {
    const features: FeatureCollection<Point>['features'] = [];

    for (const alert of alerts) {
      if (!alert.geometry || !alert.stormMotion) {continue;}

      try {
        const centroidFt =
          alert.geometry.type === 'Polygon'
            ? turf.centroid(turf.polygon(alert.geometry.coordinates))
            : turf.centroid(turf.multiPolygon((alert.geometry as any).coordinates));

        const tip = turf.destination(centroidFt, ARROW_LENGTH_MILES, alert.stormMotion.directionDeg, {
          units: 'miles',
        });

        const color =
          EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.default;

        features.push({
          type: 'Feature',
          geometry: tip.geometry,
          properties: {
            color,
            speedLabel: `${Math.round(alert.stormMotion.speedMph)} mph`,
            // bearing for rotating the arrow icon
            bearing: alert.stormMotion.directionDeg,
          },
        });
      } catch {
        // skip
      }
    }

    return { type: 'FeatureCollection', features };
  }, [alerts]);

  if (linesGeoJSON.features.length === 0) {return null;}

  return (
    <>
      {/* Dashed shaft */}
      <MapLibreGL.ShapeSource id="storm-motion-lines" shape={linesGeoJSON}>
        <MapLibreGL.LineLayer
          id="storm-motion-shaft"
          style={{
            lineColor: ['get', 'color'],
            lineWidth: 3,
            lineDasharray: [6, 3],
          }}
        />
      </MapLibreGL.ShapeSource>

      {/* Speed label at tip */}
      <MapLibreGL.ShapeSource id="storm-motion-tips" shape={tipsGeoJSON}>
        <MapLibreGL.SymbolLayer
          id="storm-motion-label"
          style={{
            textField: ['get', 'speedLabel'],
            textSize: 11,
            textColor: ['get', 'color'],
            textHaloColor: '#000000',
            textHaloWidth: 1.5,
            textAnchor: 'bottom',
            textOffset: [0, -0.5],
            textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
          }}
        />
      </MapLibreGL.ShapeSource>
    </>
  );
});

StormMotionLayer.displayName = 'StormMotionLayer';
export default StormMotionLayer;
