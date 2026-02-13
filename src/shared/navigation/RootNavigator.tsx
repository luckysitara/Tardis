import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import MainTabs from './MainTabs';
import CoinDetailPage from '@/screens/sample-ui/Threads/coin-detail-page/CoinDetailPage';


import { NftScreen } from '@/modules/nft';


import ChatScreen from '@/screens/sample-ui/chat/chat-screen/ChatScreen';
import ChatListScreen from '@/screens/sample-ui/chat/chat-list-screen';
import UserSelectionScreen from '@/screens/sample-ui/chat/user-selection-screen/UserSelectionScreen';
import OtherProfileScreen from '@/screens/sample-ui/Threads/other-profile-screen/OtherProfileScreen';
import PostThreadScreen from '@/screens/sample-ui/Threads/post-thread-screen/PostthreadScreen';
import FollowersFollowingListScreen from '@/core/profile/components/followers-following-listScreen/FollowersFollowingListScreen';
import ProfileScreen from '@/screens/sample-ui/Threads/profile-screen/ProfileScreen';


import SwapScreen from '@/modules/swap/screens/SwapScreen';

import socketService from '@/shared/services/socketService';
import { fetchUserChats } from '@/shared/state/chat/slice';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { TokenInfo } from '@/modules/data-module';


import { DeleteAccountConfirmationScreen, IntroScreen, LoginScreen, WebViewScreen, LandingScreen } from '@/screens'; // Import LandingScreen
import TardisShield from '@/components/auth/TardisShield'; // Import TardisShield
import CreatePost from '@/components/socialFeed/CreatePost'; // Import CreatePost

export type RootStackParamList = {
  IntroScreen: undefined;
  LoginOptions: undefined;
  MainTabs: undefined;
  CoinDetailPage: undefined;



  NftScreen: undefined;
  ChatListScreen: undefined;
  ChatScreen: {
    chatId: string;
    chatName: string;
    isGroup: boolean;
  };
  UserSelectionScreen: undefined;




  OtherProfile: { userId: string };
  PostThread: { postId: string };
  FollowersFollowingList: undefined;
  ProfileScreen: undefined;


  WebViewScreen: { uri: string; title: string };
  DeleteAccountConfirmationScreen: undefined;
  SwapScreen: {
    inputToken?: Partial<TokenInfo>;
    outputToken?: {
      address: string;
      symbol: string;
      mint?: string;
      logoURI?: string;
      name?: string;
    };
    inputAmount?: string;
    shouldInitialize?: boolean;
    showBackButton?: boolean;
  };
  LandingScreen: undefined; // Add LandingScreen to RootStackParamList
  CreatePostModal: undefined; // Add CreatePostModal to RootStackParamList
};

const Stack = createStackNavigator<RootStackParamList>();

// Define a component that wraps all authenticated screens with TardisShield
const AuthenticatedStack: React.FC = () => {
  return (
    <TardisShield>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="CoinDetailPage" component={CoinDetailPage} />


        <Stack.Screen name="NftScreen" component={NftScreen} />
        <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="UserSelectionScreen" component={UserSelectionScreen} />




        <Stack.Screen name="OtherProfile" component={OtherProfileScreen} />
        <Stack.Screen name="PostThread" component={PostThreadScreen} />
        <Stack.Screen
          name="FollowersFollowingList"
          component={FollowersFollowingListScreen}
          options={{ title: '' }}
        />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />


        <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
        <Stack.Screen name="DeleteAccountConfirmationScreen" component={DeleteAccountConfirmationScreen} />
        <Stack.Screen name="SwapScreen" component={SwapScreen} />
        {/* Add CreatePost as a modal */}
        <Stack.Screen name="CreatePostModal" component={CreatePost} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </TardisShield>
  );
};


export default function RootNavigator() {
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userId = useSelector((state: RootState) => state.auth.address);
  const chats = useSelector((state: RootState) => state.chat.chats);
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log(`[RootNavigator] isLoggedIn state changed: ${isLoggedIn}`);
  }, [isLoggedIn]);

  // Initialize socket connection and join all chat rooms when user is logged in
  useEffect(() => {
    if (isLoggedIn && userId && typeof userId === 'string' && userId.length > 0) {
      console.log('[RootNavigator] User logged in, initializing persistent socket connection');

      // Initialize socket connection with persistent mode
      socketService.initSocket(userId)
        .then(connected => {
          if (connected) {
            console.log('[RootNavigator] Socket connected successfully');
            socketService.setPersistentMode(true);

            // Fetch user chats if not already loaded
            if (chats.length === 0) {
              dispatch(fetchUserChats(userId))
                .then((resultAction) => {
                  if (fetchUserChats.fulfilled.match(resultAction)) {
                    const userChats = resultAction.payload;
                    if (userChats && Array.isArray(userChats)) {
                      // Join all chat rooms
                      const chatIds = userChats.map(chat => chat.id).filter(Boolean);
                      if (chatIds.length > 0) {
                        console.log('[RootNavigator] Joining all chat rooms:', chatIds);
                        socketService.joinChats(chatIds);
                      }
                    }
                  }
                })
                .catch(error => {
                  console.error('[RootNavigator] Error fetching user chats:', error);
                });
            } else {
              // If chats are already loaded, just join them
              const chatIds = chats.map(chat => chat.id).filter(Boolean);
              if (chatIds.length > 0) {
                console.log('[RootNavigator] Joining existing chat rooms:', chatIds);
                socketService.joinChats(chatIds);
              }
            }
          } else {
            console.error('[RootNavigator] Failed to connect socket');
          }
        })
        .catch(error => {
          console.error('[RootNavigator] Socket initialization error:', error);
        });
    } else if (isLoggedIn && (!userId || typeof userId !== 'string' || userId.length === 0)) {
      console.warn('[RootNavigator] User is logged in but userId is invalid or empty. Socket connection skipped.');
    }

    // Cleanup function
    return () => {
      // We don't disconnect on unmount - this component is always mounted
      // Only disconnect explicitly on logout
    };
  }, [isLoggedIn, userId, dispatch, chats]);

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
          <Stack.Screen name="IntroScreen" component={IntroScreen} />
          <Stack.Screen name="LoginOptions" component={LoginScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
