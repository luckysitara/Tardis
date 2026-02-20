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
  const currentTabName = useNavigationState(state => {
    if (!state) return 'TownSquare';
    const route = state.routes[state.index];
    return route.name;
  });

  const handleCreatePost = () => {
    navigation.navigate('CreatePost');
  };

  const showFab = currentTabName !== 'Comms';

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
            height: Platform.OS === 'android' ? 55 : 75,
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarBackground: () => (
            <BlurView
              tint="dark"
              intensity={Platform.OS === 'android' ? 15 : 35}
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

      {/* Floating Action Button for Posting - hidden on Comms tab */}
      {showFab && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreatePost}
          activeOpacity={0.85}>
          <Icons.PlusCircleIcon width={32} height={32} fill={COLORS.white} />
        </TouchableOpacity>
      )}
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'android' ? 75 : 95, // Above the tab bar
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
