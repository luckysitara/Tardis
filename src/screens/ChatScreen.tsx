import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchChatMessages, receiveMessage } from '@/shared/state/chat/slice';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import ChatComposer from '@/core/chat/components/chat-composer/ChatComposer';
import ChatMessage from '@/core/chat/components/message/ChatMessage';
import socketService from '@/shared/services/socketService';

const ChatScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { chatId, title } = route.params;

  const { address: userId, username, profilePicUrl, encryptionSeed } = useAppSelector(state => state.auth);
  const { messages, chats, loadingMessages } = useAppSelector(state => state.chat);
  const chatMessages = messages[chatId] || [];
  const currentChat = chats.find(c => c.id === chatId);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Header Animation for "Security Pulsing"
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start pulsing animation for the shield
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fetch initial messages
    if (chatId) {
      dispatch(fetchChatMessages({ chatId, resetUnread: true }));
      socketService.joinChat(chatId);
    }

    // Fade in UI
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      // socketService.leaveChat(chatId); // Keep active if needed for persistence
    };
  }, [chatId, dispatch, pulseAnim, fadeAnim]);

  // Determine user object for composer
  const currentUser = useMemo(() => ({
    id: userId || '',
    username: username || 'Me',
    handle: username ? `@${username.toLowerCase()}` : '@me',
    avatar: profilePicUrl || '',
    verified: true
  }), [userId, username, profilePicUrl]);

  const handleSendMessage = (content: string, imageUrl?: string) => {
    // Logic is already handled inside ChatComposer for E2EE
    // This callback is for local UI updates if needed
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icons.BackIcon width={24} height={24} color={COLORS.white} />
      </TouchableOpacity>
      
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Secure Chat'}</Text>
        <View style={styles.securityStatus}>
          {Icons.Shield && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Icons.Shield width={12} height={12} color={COLORS.brandPrimary} />
            </Animated.View>
          )}
          <Text style={styles.securityText}>Hardware Attested</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.headerAction}>
        <Icons.Settings width={22} height={22} color={COLORS.greyMid} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {loadingMessages && chatMessages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brandPrimary} />
            <Text style={styles.loadingText}>Materializing history...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ChatMessage
                message={{
                  ...item,
                  user: item.sender || { id: item.sender_id, username: 'Unknown', avatar: '' }
                } as any}
                currentUser={currentUser}
              />
            )}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.composerWrapper}>
          <ChatComposer
            currentUser={currentUser}
            chatContext={{ chatId }}
            onMessageSent={handleSendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  securityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  securityText: {
    fontSize: 11,
    color: COLORS.brandPrimary,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerAction: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  composerWrapper: {
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: COLORS.greyMid,
  },
});

export default ChatScreen;
