import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { registerEncryptionKey } from '@/shared/state/auth/reducer';
import { deriveEncryptionSeed, getKeypairFromSeed } from '@/shared/utils/crypto';
import { Buffer } from 'buffer';

// Import our new MainTabs component
import MainTabs from './MainTabs';

// Import the new screens that are part of the main navigation flow
import { 
  LandingScreen, 
  TownSquareScreen, 
  CommsListScreen, 
  CommunitiesScreen, 
  ProfileScreen, 
  EditProfileScreen,
  CreatePostScreen
} from '@/screens';

import TardisShield from '@/components/auth/TardisShield';

export type RootStackParamList = {
  LandingScreen: undefined;
  Authenticated: undefined;
  MainTabs: undefined; // New: Main tab navigator
  TownSquare: undefined; // New: Keeping explicit type for TownSquare if needed for direct navigation outside tabs
  Comms: undefined;
  Communities: undefined;
  Profile: undefined;
  EditProfile: undefined; // New: Edit profile screen
  CreatePost: undefined; // New: Create Post screen
};

const Stack = createStackNavigator<RootStackParamList>();

// Define a component that wraps all authenticated screens with TardisShield
const AuthenticatedStack: React.FC = () => {
  return (
    <TardisShield>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* The MainTabs component contains the bottom tab navigation */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        {/* Register other screens that might be navigated to from within MainTabs or directly */}
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen 
          name="CreatePost" 
          component={CreatePostScreen} 
          options={{ 
            presentation: 'modal',
            headerShown: false,
          }} 
        />
        {/* Keeping explicit registration for these if they can be accessed outside of MainTabs hierarchy */}
        <Stack.Screen name="TownSquare" component={TownSquareScreen} />
        <Stack.Screen name="Comms" component={CommsListScreen} />
        <Stack.Screen name="Communities" component={CommunitiesScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </TardisShield>
  );
};

export default function RootNavigator() {
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userId = useSelector((state: RootState) => state.auth.address);
  const publicEncryptionKey = useSelector((state: RootState) => state.auth.publicEncryptionKey);
  const { getEncryptionSeed } = useWallet();

  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log(`[RootNavigator] isLoggedIn state changed: ${isLoggedIn}`);
    
    const initEncryption = async () => {
      if (isLoggedIn && userId && !publicEncryptionKey) {
        try {
          console.log('[RootNavigator] Initializing E2EE keys from hardware...');
          const hardwareSignature = await getEncryptionSeed();
          if (hardwareSignature) {
            const seed = await deriveEncryptionSeed(hardwareSignature);
            const keypair = getKeypairFromSeed(seed);
            const publicKeyBase64 = Buffer.from(keypair.publicKey).toString('base64');
            
            console.log('[RootNavigator] Registering E2EE public key...');
            await dispatch(registerEncryptionKey({ userId, publicKey: publicKeyBase64 })).unwrap();
            console.log('[RootNavigator] E2EE initialized successfully.');
          }
        } catch (error: any) {
          console.error('[RootNavigator] Failed to init E2EE:', error.message);
        }
      }
    };

    initEncryption();
  }, [isLoggedIn, userId, publicEncryptionKey, dispatch, getEncryptionSeed]);

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
