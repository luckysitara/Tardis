import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchChatMessages, deleteMessage } from '@/shared/state/chat/slice';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import ChatComposer from '@/core/chat/components/chat-composer/ChatComposer';
import ChatMessage from '@/core/chat/components/message/ChatMessage';
import socketService from '@/shared/services/socketService';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTardisMobileWallet } from '@/modules/wallet-providers/hooks/useTardisMobileWallet';
import { Buffer } from 'buffer';

const ChatScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { chatId, title } = route.params;
  console.log(`[ChatScreen V2] Initialized with chatId: ${chatId}, title: ${title}`);

  const { address: userId, username, profilePicUrl } = useAppSelector(state => state.auth);
  const { messages, chats, loadingMessages } = useAppSelector(state => state.chat);
  const { signMessage } = useTardisMobileWallet();
  const chatMessages = messages[chatId] || [];
  const currentChat = chats.find(c => c.id === chatId);
  
  const otherParticipant = useMemo(() => 
    currentChat?.participants.find(p => p.id !== userId),
  [currentChat, userId]);

  const flatListRef = useRef<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);

  // Security Pulsing
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useFocusEffect(
    useCallback(() => {
      if (chatId) {
        dispatch(fetchChatMessages({ chatId, resetUnread: true }));
        socketService.joinChat(chatId);
      }
    }, [chatId, dispatch])
  );

  const currentUser = useMemo(() => ({
    id: userId || '',
    username: username || 'Me',
    handle: username ? `@${username.toLowerCase()}` : '@me',
    avatar: profilePicUrl || '',
    verified: true
  }), [userId, username, profilePicUrl]);

  const handleSendMessage = (content: string, imageUrl?: string) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleEditMessage = useCallback((message: any) => {
    setEditingMessage(message);
    setReplyingTo(null);
  }, []);

  const handleDeleteMessage = useCallback(async (message: any) => {
    console.log(`[ChatScreen V2] handleDeleteMessage called for messageId: ${message.id}, userId: ${userId}, chatId: ${chatId}`);
    if (userId && chatId) {
      try {
        const timestamp = new Date().toISOString();
        const messageToSign = JSON.stringify({ id: message.id, userId, timestamp });
        
        const signature = await signMessage(messageToSign);
        if (!signature) {
          console.log('[ChatScreen] Delete cancelled: No signature provided');
          return;
        }

        const signatureBase64 = Buffer.from(signature).toString('base64');

        await dispatch(deleteMessage({ 
          messageId: message.id, 
          userId,
          signature: signatureBase64,
          timestamp
        })).unwrap();
        
        console.log(`[ChatScreen] deleteMessage success`);
        socketService.deleteMessage(chatId, message.id);
      } catch (err) {
        console.error(`[ChatScreen] deleteMessage failure:`, err);
      }
    } else {
      console.warn(`[ChatScreen] Cannot delete message: missing userId (${userId}) or chatId (${chatId})`);
    }
  }, [userId, chatId, dispatch, signMessage]);

  const onListContentSizeChange = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icons.ArrowLeftIcon width={24} height={24} color={COLORS.brandPrimary} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.headerInfo} activeOpacity={0.7}>
        <IPFSAwareImage
          source={getValidImageSource(otherParticipant?.profile_picture_url || `https://api.dicebear.com/7.x/initials/png?seed=${title}`)}
          style={styles.headerAvatar}
        />
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Secure Chat'}</Text>
          <View style={styles.securityStatus}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Icons.Shield width={10} height={10} color={COLORS.brandPrimary} />
            </Animated.View>
            <Text style={styles.securityText}>End-to-End Encrypted</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.headerAction}>
        <Icons.Settings width={20} height={20} color={COLORS.brandPrimary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      <View style={styles.content}>
        {loadingMessages && chatMessages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brandPrimary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              return (
                <ChatMessage
                  message={{
                    ...item,
                    user: item.sender || { id: item.sender_id, username: 'Unknown', avatar: '' }
                  } as any}
                  currentUser={currentUser}
                  onPressUser={(user) => navigation.navigate('Profile', { userId: user.id })}
                  onPressMessage={(msg) => setReplyingTo(msg)}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                />
              );
            }}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={onListContentSizeChange}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={15}
          />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.composerWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <ChatComposer
            currentUser={currentUser}
            chatContext={{ chatId }}
            onMessageSent={handleSendMessage}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
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
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(12, 16, 26, 0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.darkerBackground,
  },
  titleContainer: {
    marginLeft: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  securityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  securityText: {
    fontSize: 10,
    color: COLORS.brandPrimary,
    marginLeft: 4,
    fontWeight: '600',
  },
  headerAction: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 16,
  },
  composerWrapper: {
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
