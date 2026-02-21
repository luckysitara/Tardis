import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { registerEncryptionKey, setEncryptionSeed } from '@/shared/state/auth/reducer';
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
  CreatePostScreen,
  ChatScreen,
  StartChatScreen,
  CreateCommunityScreen
} from '@/screens';
import TardisShield from '@/components/auth/TardisShield';
import socketService from '@/shared/services/socketService';

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
  ChatScreen: { chatId: string; title?: string };
  StartChatScreen: undefined;
  CreateCommunityScreen: undefined;
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
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen 
          name="StartChatScreen" 
          component={StartChatScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen 
          name="CreateCommunityScreen" 
          component={CreateCommunityScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </TardisShield>
  );
};

export default function RootNavigator() {
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const isVerified = useSelector((state: RootState) => state.auth.isVerified); // Added
  const userId = useSelector((state: RootState) => state.auth.address);
  const publicEncryptionKey = useSelector((state: RootState) => state.auth.publicEncryptionKey);
  const { getEncryptionSeed } = useWallet();

  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log(`[RootNavigator] Auth state: isLoggedIn=${isLoggedIn}, isVerified=${isVerified}`);
    
    // Only proceed with background services if the user is logged in AND verified by the gate
    if (isLoggedIn && isVerified && userId) {
      console.log('[RootNavigator] Initializing Socket Service...');
      socketService.initSocket(userId);
    }

    const initEncryption = async () => {
      if (isLoggedIn && isVerified && userId && !publicEncryptionKey && typeof getEncryptionSeed === 'function') {
        try {
          console.log('[RootNavigator] Initializing E2EE keys from hardware...');
          const hardwareSignature = await getEncryptionSeed();
          if (hardwareSignature) {
            const seed = await deriveEncryptionSeed(hardwareSignature);
            const seedBase64 = Buffer.from(seed).toString('base64');
            dispatch(setEncryptionSeed(seedBase64));

            const keypair = getKeypairFromSeed(seed);
            const publicKeyBase64 = Buffer.from(keypair.publicKey).toString('base64');
            
            console.log(`[RootNavigator] Registering E2EE public key for userId: ${userId}...`);
            const result = await dispatch(registerEncryptionKey({ userId, publicKey: publicKeyBase64 })).unwrap();
            console.log('[RootNavigator] E2EE initialized successfully. Server response:', result);
          }
        } catch (error: any) {
          console.error('[RootNavigator] Failed to init E2EE:', error?.message || error || 'Unknown error');
        }
      } else if (isLoggedIn && userId && !publicEncryptionKey) {
        console.log('[RootNavigator] Wallet does not support hardware encryption derivation.');
      }
    };

    initEncryption();
  }, [isLoggedIn, isVerified, userId, publicEncryptionKey, dispatch, getEncryptionSeed]);

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
