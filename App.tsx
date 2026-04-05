import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MapScreen from './src/screens/MapScreen';
import ListScreen from './src/screens/ListScreen';
import { COLORS } from './src/constants';

const Tab = createBottomTabNavigator();

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: COLORS.surface },
              headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
              headerTintColor: COLORS.text,
              tabBarStyle: {
                backgroundColor: COLORS.surface,
                borderTopColor: COLORS.border,
              },
              tabBarActiveTintColor: COLORS.accent,
              tabBarInactiveTintColor: COLORS.textSecondary,
            }}
          >
            <Tab.Screen
              name="Map"
              component={MapScreen}
              options={{
                title: 'StormRouter',
                tabBarLabel: 'Map',
              }}
            />
            <Tab.Screen
              name="Alerts"
              component={ListScreen}
              options={{
                title: 'Active Alerts',
                tabBarLabel: 'Alerts',
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
