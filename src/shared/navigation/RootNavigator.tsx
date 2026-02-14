import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';


import { useAppDispatch } from '@/shared/hooks/useReduxHooks';


import { LandingScreen, TownSquareScreen } from '@/screens'; // Import LandingScreen and TownSquareScreen
import TardisShield from '@/components/auth/TardisShield'; // Import TardisShield

export type RootStackParamList = {
  LandingScreen: undefined;
  Authenticated: undefined;
  TownSquareScreen: undefined; // Add this line
};

const Stack = createStackNavigator<RootStackParamList>();

// Define a component that wraps all authenticated screens with TardisShield
const AuthenticatedStack: React.FC = () => {
  return (
    <TardisShield>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="TownSquareScreen" component={TownSquareScreen} />
      </Stack.Navigator>
    </TardisShield>
  );
};


export default function RootNavigator() {
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userId = useSelector((state: RootState) => state.auth.address);

  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log(`[RootNavigator] isLoggedIn state changed: ${isLoggedIn}`);
  }, [isLoggedIn]);



  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isLoggedIn ? "Authenticated" : "LandingScreen"} // Set initial route based on login state
    >
      {isLoggedIn ? (
        <Stack.Screen name="Authenticated" component={AuthenticatedStack} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="LandingScreen" component={LandingScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
