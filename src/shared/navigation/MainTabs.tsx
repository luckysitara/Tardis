import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur'; // Assuming expo-blur is available or can be added
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { RootNavigationProp } from '../hooks/useAppNavigation';

import COLORS from '@/assets/colors'; // Using alias
import Icons from '@/assets/svgs'; // Import the new Icons object

import AnimatedTabIcon from './AnimatedTabIcon'; // Import our new AnimatedTabIcon

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
  
  // Detect current active tab name
  const state = useNavigationState(s => s);
  const route = state?.routes[state.index];
  const currentTabName = route?.name || 'TownSquare';

  const handleCreatePost = () => {
    navigation.navigate('CreatePost', {});
  };

  // We are not using showFab here anymore as it's moved to TownSquareScreen
  // but keeping logic for future global needs if any.

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="TownSquare"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: COLORS.brandPrimary,
          tabBarStyle: {
            paddingTop: Platform.OS === 'android' ? 5 : 10,
            paddingBottom: Platform.OS === 'android' ? 5 : 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            position: 'absolute',
            elevation: 0,
            height: Platform.OS === 'android' ? 60 : 80, // Slightly taller
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarBackground: () => (
            <BlurView
              tint="dark"
              intensity={Platform.OS === 'android' ? 25 : 45} // Higher intensity
              style={StyleSheet.absoluteFill}
            >
              <View style={styles.tabBarOverlay} />
            </BlurView>
          ),
        }}>
        <Tab.Screen
          name="TownSquare"
          component={TownSquareScreen}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <AnimatedTabIcon
                focused={focused}
                size={size * 1.15} // Slightly larger for emphasis
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
