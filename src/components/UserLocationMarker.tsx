import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { UserLocation } from '../types';
import { COLORS } from '../constants';

interface Props {
  location: UserLocation;
}

export default function UserLocationMarker({ location }: Props) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Marker
      coordinate={{ latitude: location.latitude, longitude: location.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={10}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.pulse,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />
        <View style={styles.dot} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.userMarker,
    borderWidth: 2.5,
    borderColor: '#fff',
    position: 'absolute',
  },
  pulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.userMarker,
    position: 'absolute',
  },
});
