import React, { memo } from 'react';
import { Polygon } from 'react-native-maps';
import { ParsedAlert } from '../types';
import { EVENT_COLORS, SEVERITY_COLORS, SEVERITY_FILL_OPACITY } from '../constants';
import { geometryToLatLng } from '../utils/geometry';

interface Props {
  alert: ParsedAlert;
  onPress?: (alert: ParsedAlert) => void;
}

const AlertPolygon = memo(({ alert, onPress }: Props) => {
  if (!alert.geometry) {return null;}

  const rings = geometryToLatLng(alert.geometry);
  if (rings.length === 0) {return null;}

  const strokeColor =
    EVENT_COLORS[alert.event] ?? SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.default;
  const fillOpacity = SEVERITY_FILL_OPACITY[alert.severity] ?? SEVERITY_FILL_OPACITY.default;

  return (
    <>
      {rings.map((coords, idx) => (
        <Polygon
          key={`${alert.id}-ring-${idx}`}
          coordinates={coords}
          strokeColor={strokeColor}
          strokeWidth={2}
          fillColor={`${strokeColor}${Math.round(fillOpacity * 255).toString(16).padStart(2, '0')}`}
          tappable
          onPress={() => onPress?.(alert)}
        />
      ))}
    </>
  );
});

AlertPolygon.displayName = 'AlertPolygon';
export default AlertPolygon;
