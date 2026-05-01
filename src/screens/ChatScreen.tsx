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
  Modal,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchChatMessages, deleteMessage, fetchChatRoomById } from '@/shared/state/chat/slice';
import { initiateCall } from '@/shared/state/call/slice';
import callService from '@/shared/services/callService';
import { requestCallPermissions } from '@/shared/utils/permissions';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { Ionicons } from '@expo/vector-icons';
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

  const { address: userId, username, displayName, profilePicUrl } = useAppSelector(state => state.auth);
  const { messages, chats, loadingMessages } = useAppSelector(state => state.chat);
  const { signMessage } = useTardisMobileWallet();
  const chatMessages = messages[chatId] || [];
  const currentChat = chats.find(c => c.id === chatId);
  
  const isGroup = currentChat?.type === 'group' || currentChat?.type === 'global';
  const otherParticipant = useMemo(() => currentChat?.participants.find(p => p.id !== userId), [currentChat, userId]);

  const headerAvatar = useMemo(() => {
    if (isGroup) return currentChat?.avatar_url || `https://api.dicebear.com/7.x/initials/png?seed=${title}`;
    return otherParticipant?.profile_picture_url || `https://api.dicebear.com/7.x/initials/png?seed=${title}`;
  }, [isGroup, currentChat, otherParticipant, title]);

  const headerTitle = useMemo(() => {
    if (isGroup) return title || currentChat?.name || 'Group Chat';
    return otherParticipant?.display_name || otherParticipant?.username || title || 'Secure Chat';
  }, [isGroup, currentChat, otherParticipant, title]);

  const flatListRef = useRef<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [showCallMenu, setShowCallMenu] = useState(false);

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
        // Fetch room details if not found in state (e.g. on refresh)
        if (!currentChat) {
          dispatch(fetchChatRoomById(chatId));
        }
        socketService.joinChat(chatId);
        if (userId) socketService.markMessagesRead(chatId, userId);
      }
    }, [chatId, dispatch, userId, currentChat])
  );

  useEffect(() => {
    if (chatMessages.length > 0 && userId) {
       const lastMsg = chatMessages[chatMessages.length - 1];
       if (lastMsg && lastMsg.sender_id !== userId && (lastMsg as any).status !== 'read') {
         socketService.markMessagesRead(chatId, userId);
       }
    }
  }, [chatMessages, userId, chatId]);

  /**
   * Groups messages by date and injects date separators
   */
  const messagesWithDates = useMemo(() => {
    if (chatMessages.length === 0) return [];
    
    const result: any[] = [];
    let lastDate = '';

    chatMessages.forEach((msg, index) => {
      const msgDate = new Date(msg.created_at || (msg as any).createdAt).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (msgDate !== lastDate) {
        // Handle "Today" and "Yesterday"
        const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        let label = msgDate;
        if (msgDate === today) label = 'Today';
        else if (msgDate === yesterday) label = 'Yesterday';

        result.push({ id: `date-${msgDate}`, type: 'date_separator', label });
        lastDate = msgDate;
      }
      result.push(msg);
    });

    return result;
  }, [chatMessages]);

  const currentUser = useMemo(() => ({
    id: userId || '',
    username: username || 'Me',
    display_name: displayName || username || 'Me',
    handle: username ? `@${username.toLowerCase()}` : '@me',
    avatar: profilePicUrl || '',
    verified: true
  }), [userId, username, displayName, profilePicUrl]);

  const handleSendMessage = (content: string, imageUrl?: string) => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleDeleteMessage = useCallback(async (message: any) => {
    if (userId && chatId) {
      try {
        const timestamp = new Date().toISOString();
        const signature = await signMessage(JSON.stringify({ id: message.id, userId, timestamp }));
        if (!signature) return;
        await dispatch(deleteMessage({ messageId: message.id, userId, signature: Buffer.from(signature).toString('base64'), timestamp })).unwrap();
        socketService.deleteMessage(chatId, message.id);
      } catch (err) { console.error(err); }
    }
  }, [userId, chatId, dispatch, signMessage]);

  const startCall = async (isVideo: boolean) => {
    setShowCallMenu(false);
    if (isGroup) {
      Alert.alert('Group Call', 'Group calls are not yet supported.');
      return;
    }
    if (otherParticipant) {
      const hasPermission = await requestCallPermissions(isVideo);
      if (!hasPermission) return;
      dispatch(initiateCall({ remoteUser: otherParticipant as any, isVideo }));
      callService.startCall(otherParticipant, isVideo);
      navigation.navigate('CallScreen');
    }
  };

  const handleHeaderPress = () => {
    if (isGroup) {
      navigation.navigate('GroupProfile', { chatId });
    } else if (otherParticipant) {
      navigation.navigate('Profile', { userId: otherParticipant.id });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.brandPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} activeOpacity={0.7} onPress={handleHeaderPress}>
          <IPFSAwareImage source={getValidImageSource(headerAvatar)} style={styles.headerAvatar} />
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
            <View style={styles.securityStatus}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}><Icons.Shield width={10} height={10} color={COLORS.brandPrimary} /></Animated.View>
              <Text style={styles.securityText}>End-to-End Encrypted</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={() => setShowCallMenu(true)}><Ionicons name="call-outline" size={24} color={COLORS.brandPrimary} /></TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}><Ionicons name="ellipsis-vertical" size={24} color={COLORS.brandPrimary} /></TouchableOpacity>
        </View>
      </View>

      <Modal transparent visible={showCallMenu} animationType="fade" onRequestClose={() => setShowCallMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCallMenu(false)}>
          <View style={styles.callMenu}>
            <TouchableOpacity style={styles.callMenuItem} onPress={() => startCall(false)}><Ionicons name="call-outline" size={24} color={COLORS.white} /><Text style={styles.callMenuText}>Audio Call</Text></TouchableOpacity>
            <View style={styles.menuDivider} /><TouchableOpacity style={styles.callMenuItem} onPress={() => startCall(true)}><Ionicons name="videocam-outline" size={24} color={COLORS.white} /><Text style={styles.callMenuText}>Video Call</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.content}>
        {loadingMessages && chatMessages.length === 0 ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.brandPrimary} /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messagesWithDates}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              if (item.type === 'date_separator') {
                return (
                  <View style={styles.dateSeparator}>
                    <View style={styles.dateBadge}><Text style={styles.dateText}>{item.label}</Text></View>
                  </View>
                );
              }
              return (
                <ChatMessage
                  message={{ ...item, user: item.sender || { id: item.sender_id, username: 'Unknown', display_name: 'Unknown', avatar: '' } } as any}
                  currentUser={currentUser}
                  onPressUser={(user) => navigation.navigate('Profile', { userId: user.id })}
                  onPressMessage={(msg) => setReplyingTo(msg)}
                  onEditMessage={(msg) => { setEditingMessage(msg); setReplyingTo(null); }}
                  onDeleteMessage={handleDeleteMessage}
                />
              );
            }}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={15}
          />
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, backgroundColor: 'rgba(12, 16, 26, 0.95)', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  backButton: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.darkerBackground },
  titleContainer: { marginLeft: 10, flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, fontFamily: TYPOGRAPHY.fontFamily },
  securityStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  securityText: { fontSize: 10, color: COLORS.brandPrimary, marginLeft: 4, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerAction: { padding: 8 },
  content: { flex: 1 },
  messageList: { paddingVertical: 16 },
  composerWrapper: { backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 100, paddingRight: 20 },
  callMenu: { backgroundColor: COLORS.darkerBackground, borderRadius: 15, padding: 8, width: 180, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  callMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  callMenuText: { color: COLORS.white, marginLeft: 12, fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 8 },
  dateSeparator: { alignItems: 'center', marginVertical: 16 },
  dateBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  dateText: { color: COLORS.greyMid, fontSize: 12, fontWeight: '600' },
});

export default ChatScreen;
