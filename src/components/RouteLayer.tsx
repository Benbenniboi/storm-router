import React, { memo, useMemo } from 'react';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Feature, LineString, Point } from 'geojson';
import { RouteResult } from '../types';
import { COLORS } from '../constants';

interface Props {
  route: RouteResult;
}

const RouteLayer = memo(({ route }: Props) => {
  const lineGeoJSON = useMemo<Feature<LineString>>(
    () => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: route.coordinates },
      properties: {},
    }),
    [route.coordinates],
  );

  const destinationGeoJSON = useMemo<Feature<Point>>(() => {
    const last = route.coordinates[route.coordinates.length - 1];
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: last },
      properties: {
        label: `${route.distanceMiles.toFixed(1)}mi · ${Math.round(route.durationMinutes)}min`,
      },
    };
  }, [route]);

  return (
    <>
      {/* Route polyline */}
      <MapLibreGL.ShapeSource id="route-line" shape={lineGeoJSON}>
        {/* Glow / casing underneath */}
        <MapLibreGL.LineLayer
          id="route-casing"
          style={{
            lineColor: '#FFFFFF',
            lineWidth: 8,
            lineOpacity: 0.3,
          }}
        />
        {/* Main line */}
        <MapLibreGL.LineLayer
          id="route-main"
          style={{
            lineColor: COLORS.routePolyline,
            lineWidth: 4,
          }}
        />
      </MapLibreGL.ShapeSource>

      {/* Intercept destination label */}
      <MapLibreGL.ShapeSource id="route-destination" shape={destinationGeoJSON}>
        <MapLibreGL.CircleLayer
          id="route-dest-dot"
          style={{
            circleColor: COLORS.routePolyline,
            circleRadius: 8,
            circleStrokeColor: '#FFFFFF',
            circleStrokeWidth: 2,
          }}
        />
        <MapLibreGL.SymbolLayer
          id="route-dest-label"
          style={{
            textField: ['get', 'label'],
            textSize: 12,
            textColor: '#FFFFFF',
            textHaloColor: '#000000',
            textHaloWidth: 1.5,
            textAnchor: 'bottom',
            textOffset: [0, -1.2],
            textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
          }}
        />
      </MapLibreGL.ShapeSource>
    </>
  );
});

RouteLayer.displayName = 'RouteLayer';
export default RouteLayer;
