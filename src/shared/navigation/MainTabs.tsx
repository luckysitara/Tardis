import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { RootNavigationProp } from '../hooks/useAppNavigation';

import COLORS from '@/assets/colors'; 
import Icons from '@/assets/svgs'; 

import AnimatedTabIcon from './AnimatedTabIcon';

// Import our placeholder screens
import { 
  TownSquareScreen, 
  CommsListScreen, 
  CommunitiesScreen, 
  ProfileScreen 
} from '@/screens';

const Tab = createBottomTabNavigator();

const iconStyle = {
  shadowColor: COLORS.black,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
};

export default function MainTabs() {
  const navigation = useNavigation<RootNavigationProp>();
  
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="TownSquare"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: COLORS.brandPrimary,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0.5,
            borderTopColor: 'rgba(255, 255, 255, 0.12)',
            position: 'absolute',
            elevation: 0,
            height: Platform.OS === 'android' ? 64 : 88,
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: Platform.OS === 'ios' ? 30 : 0,
          },
          tabBarBackground: () => (
            <View style={StyleSheet.absoluteFill}>
              <BlurView
                tint="dark"
                intensity={Platform.OS === 'android' ? 40 : 60}
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12, 16, 26, 0.5)' }]} />
            </View>
          ),
        }}>
        <Tab.Screen
          name="TownSquare"
          component={TownSquareScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1.15}
                icon={Icons.TownSquareIcon}
                iconSelected={Icons.TownSquareIconSelected}
                style={iconStyle}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Comms"
          component={CommsListScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1.15}
                icon={Icons.CommsIcon}
                iconSelected={Icons.CommsIconSelected}
                style={iconStyle}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Communities"
          component={CommunitiesScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1.15}
                icon={Icons.CommunitiesIcon}
                iconSelected={Icons.CommunitiesIconSelected}
                style={iconStyle}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Seeker"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1.15}
                icon={Icons.SeekerIcon}
                iconSelected={Icons.SeekerIconSelected}
                style={iconStyle}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android'
      ? 'rgba(12, 16, 26, 0.95)'
      : 'rgba(12, 16, 26, 0.75)',
  },
});

