import React, { useRef, useMemo, createContext, useContext, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useNavigation, ParamListBase } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';

import Icons from '@/assets/svgs';
import COLORS from '@/assets/colors';

import AnimatedTabIcon from './AnimatedTabIcon';
import TownSquareScreen from '@/screens/TownSquareScreen';
import SwapScreen from '@/modules/swap/screens/SwapScreen';

import { ChatListScreen } from '@/screens/sample-ui/chat';
import ModuleScreen from '@/screens/Common/launch-modules-screen/LaunchModules';

interface ScrollUIContextType {
  hideTabBar: () => void;
  showTabBar: () => void;
}

const ScrollUIContext = createContext<ScrollUIContextType | null>(null);

export const useScrollUI = () => {
  const context = useContext(ScrollUIContext);
  if (!context) {
    throw new Error('useScrollUI must be used within ScrollUIProvider');
  }
  return context;
};

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

const TAB_WIDTH = width / 4;

const iconStyle = {
  shadowColor: COLORS.black,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
};

const HIDE_OFFSET = 100; // How much to translate the tab bar vertically to hide it
const ANIMATION_DURATION = 300; // Duration of the animation

export default function MainTabs() {
  const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;

  const hideTabBar = useCallback(() => {
    Animated.timing(tabBarTranslateY, {
      toValue: HIDE_OFFSET,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslateY]);

  const showTabBar = useCallback(() => {
    Animated.timing(tabBarTranslateY, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslateY]);

  const scrollUIContextValue = useMemo(() => ({
    hideTabBar,
    showTabBar,
  }), [hideTabBar, showTabBar]);

  return (
    <ScrollUIContext.Provider value={scrollUIContextValue}>
      {/* Platform Selection Menu - Removed for now */}

      <Tab.Navigator
        initialRouteName="TownSquare" // Changed initial route name
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: COLORS.brandPrimary,
          tabBarStyle: [
            {
              paddingTop: Platform.OS === 'android' ? 5 : 10,
              paddingBottom: Platform.OS === 'android' ? 5 : 0,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              position: 'absolute',
              elevation: 0,
              height: Platform.OS === 'android' ? 55 : 75,
              bottom: Platform.OS === 'android' ? 0 : 0,
              left: 0,
              right: 0,
            },
            {
              transform: [{ translateY: tabBarTranslateY }],
            },
          ],
          tabBarBackground: () => (
            <BlurView
              tint="dark"
              intensity={Platform.OS === 'android' ? 15 : 35}
              style={StyleSheet.absoluteFill}
            >
              <View style={platformStyles.tabBarOverlay} />
            </BlurView>
          ),
        }}>
        <Tab.Screen
          name="TownSquare" // New name for the feed tab
          component={TownSquareScreen} // Directly use TownSquareScreen
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1.15}
                icon={
                  Icons.FeedIcon as React.ComponentType<{
                    width: number;
                    height: number;
                  }>
                }
                iconSelected={
                  Icons.FeedIconSelected as React.ComponentType<{
                    width: number;
                    height: number;
                  }>
                }
                style={{
                  shadowColor: COLORS.black,
                  shadowOffset: { width: 0, height: 15 },
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Swap"
          component={SwapScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1}
                icon={
                  Icons.SwapNavIcon as React.ComponentType<{
                    width: number;
                    height: number;
                  }>
                }
                iconSelected={
                  Icons.SwapNavIconSelected as React.ComponentType<{
                    width: number;
                    height: number;
                  }>
                }
                style={iconStyle}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={ChatListScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1.25}
                icon={
                  Icons.ChatIcon as React.ComponentType<{
                    width: number;
                    height: number;
                  }>
                }
                iconSelected={
                  Icons.ChatIconSelected as React.ComponentType<{
                    width: number;
                    height: number;
                  }>
                }
                style={iconStyle}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Modules"
          component={ModuleScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1.2}
                icon={
                  Icons.RocketIcon as React.ComponentType<{
                    width: number;
                    height: number;
                  }>
                }
                iconSelected={
                  Icons.RocketIconSelected as React.ComponentType<{
                    width: number;
                    height: number;
                  }>
                }
                style={iconStyle}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </ScrollUIContext.Provider>
  );
}

const platformStyles = StyleSheet.create({
  menuContainer: {
    position: 'absolute',
    bottom: 90, // Position just above the tab bar
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  menuContent: {
    flexDirection: 'row',
    backgroundColor: COLORS.lighterBackground,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    width: width * 0.58, // Smaller width
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
  },
  platformButton: {
    width: 50, // Smaller buttons
    height: 50, // Smaller buttons
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkerBackground,
    marginHorizontal: 4, // Less space between buttons
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  platformIcon: {
    width: 28, // Smaller icons
    height: 28, // Smaller icons
  },
  activePlatform: {
    backgroundColor: `${COLORS.brandPrimary}20`, // 20% opacity
    borderColor: COLORS.brandPrimary,
    transform: [{ scale: 1.06 }], // Slightly less scaling for subtlety
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android'
      ? 'rgba(12, 16, 26, 0.95)' // Much higher opacity for Android
      : 'rgba(12, 16, 26, 0.75)', // Original opacity for iOS
  }
});
