import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Pressable, GestureResponderEvent, Text, TextStyle, Animated, Alert } from 'react-native';
import { ChatMessageProps } from './message.types';
import { getMessageBaseStyles } from './message.styles';
import { mergeStyles } from '@/core/thread/utils';
import MessageBubble from './MessageBubble';
import MessageHeader from './MessageHeader';
import { useAppSelector } from '@/shared/hooks/useReduxHooks';
import { decryptMessage, getKeypairFromSeed } from '@/shared/utils/crypto';
import { Buffer } from 'buffer';
import ReactionPicker from './ReactionPicker';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { addReactionToMessage, removeReactionFromMessage } from '@/shared/state/chat/slice';
import TipModal from '../tip/TipModal';
import { sendMessage } from '@/shared/state/chat/slice';
import socketService from '@/shared/services/socketService';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';

const formatTime = (timestamp: Date | string | number | undefined): string => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

function ChatMessage({
  message,
  currentUser,
  onPressMessage,
  onLongPress,
  onPressUser,
  onEditMessage,
  onDeleteMessage,
  themeOverrides,
  styleOverrides,
  showHeader = true,
}: ChatMessageProps) {
  const dispatch = useAppDispatch();
  const encryptionSeed = useAppSelector(state => state.auth.encryptionSeed);
  const { chats, selectedChatId } = useAppSelector(state => state.chat);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const materializeAnim = useRef(new Animated.Value(0)).current;

  const handleTipSent = async (signature: string, amount: number, symbol: string) => {
    try {
      const resultAction = await dispatch(sendMessage({
        chatId: message.chat_room_id || (message as any).chatId || selectedChatId || '',
        userId: currentUser.id,
        content: `Sent a tip of ${amount} ${symbol} 💸`,
        additionalData: { type: 'tip', amount, symbol, signature },
      })).unwrap();

      if (resultAction?.id) {
        socketService.sendMessage(resultAction.chat_room_id, {
          ...resultAction,
          senderId: currentUser.id,
          chatId: resultAction.chat_room_id
        });
      }
    } catch (error) { console.error(error); }
  };

  const handleSelectEmoji = (emoji: string) => {
    const cid = message.chat_room_id || (message as any).chatId || selectedChatId;
    if (cid) {
      dispatch(addReactionToMessage({ messageId: message.id, userId: currentUser.id, emoji, chatId: cid }));
      socketService.sendReaction(cid, message.id, emoji, currentUser.id);
    }
  };

  const handlePressReaction = (emoji: string) => {
    const userReaction = message.reactions?.find(r => r.user_id === currentUser.id && r.emoji === emoji);
    if (userReaction) {
      const cid = message.chat_room_id || (message as any).chatId || selectedChatId;
      if (cid) {
        dispatch(removeReactionFromMessage({ messageId: message.id, userId: currentUser.id, emoji, chatId: cid }));
        socketService.sendRemoveReaction(cid, message.id, emoji, currentUser.id);
      }
    } else { handleSelectEmoji(emoji); }
  };

  useEffect(() => {
    Animated.timing(materializeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [materializeAnim]);

  const isCurrentUser = useMemo(() => {
    if (!message || typeof message !== 'object') return false;
    return (message.user?.id === currentUser.id) || (message.sender_id === currentUser.id) || ((message as any).senderId === currentUser.id);
  }, [message, currentUser.id]);

  const handleLongPress = () => {
    if (message.is_deleted) return;
    const options = [{ text: 'React', onPress: () => setShowReactionPicker(true) }];
    if (!isCurrentUser) options.push({ text: 'Send Tip 💸', onPress: () => setShowTipModal(true) });
    if (isCurrentUser) {
      options.push({ text: 'Edit', onPress: () => onEditMessage && onEditMessage(message) });
      options.push({ text: 'Delete', style: 'destructive', onPress: () => setTimeout(() => onDeleteMessage && onDeleteMessage(message), 300) });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message Actions', 'Choose an action:', options);
    onLongPress && onLongPress({} as any);
  };

  const decryptedContent = useMemo(() => {
    if (!message || typeof message !== 'object') return '';
    const msg = message as any;
    
    if (msg.is_encrypted && msg.nonce && encryptionSeed) {
      try {
        const mid = msg.chat_room_id || msg.chatId || msg.chat_id || selectedChatId;
        const currentChat = chats.find(c => c.id === mid);
        
        if (currentChat && currentChat.type === 'direct') {
          const otherParticipant = currentChat.participants.find(p => p.id !== currentUser.id) || currentChat.participants[0];
          if (otherParticipant && otherParticipant.public_encryption_key) {
            const seedUint8 = new Uint8Array(Buffer.from(encryptionSeed, 'base64'));
            const keypair = getKeypairFromSeed(seedUint8);
            const decrypted = decryptMessage(msg.content, msg.nonce, otherParticipant.public_encryption_key, keypair.secretKey);
            return decrypted || '[Locked Transmission]';
          }
        }
      } catch (err) { return '[Decryption error]'; }
    }
    return message.content;
  }, [message, encryptionSeed, chats, currentUser.id, selectedChatId]);

  const displayMessage = useMemo(() => {
    if (!message || typeof message !== 'object') return { content: '' } as any;
    return { ...message, content: decryptedContent };
  }, [message, decryptedContent]);

  const contentType = useMemo(() => {
    if (!message || typeof message !== 'object') return 'text';
    if ('tradeData' in message && message.tradeData) return 'trade';
    if ('nftData' in message && message.nftData) return 'nft';
    if (message.image_url || (message as any).imageUrl) return 'media';
    return 'text';
  }, [message]);

  const shouldShowHeader = useMemo(() => {
    const mid = message.chat_room_id || (message as any).chatId || selectedChatId;
    const currentChat = chats.find(c => c.id === mid);
    return currentChat?.type !== 'direct' && !isCurrentUser && showHeader;
  }, [isCurrentUser, showHeader, chats, message.chat_room_id, selectedChatId, message]);

  const timestamp = message.created_at || (message as any).createdAt || new Date();
  const fontFamily = styleOverrides?.text && (styleOverrides.text as TextStyle).fontFamily;

  return (
    <View style={{ marginBottom: 8, marginHorizontal: 12 }}>
      {shouldShowHeader && (
        <View style={{ width: '100%', marginBottom: 6 }}>
          <MessageHeader message={message} showAvatar={true} onPressUser={onPressUser} />
        </View>
      )}

      <Animated.View style={[{ maxWidth: '85%', opacity: materializeAnim, transform: [{ translateY: materializeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }, isCurrentUser ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
        <Pressable onPress={() => onPressMessage && onPressMessage(message)} onLongPress={handleLongPress} delayLongPress={500} style={({ pressed }) => [{ maxWidth: contentType === 'text' ? '85%' : '100%', opacity: pressed ? 0.7 : 1, alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }]}>
          <View style={{ position: 'relative' }}>
            <MessageBubble message={displayMessage} isCurrentUser={isCurrentUser} themeOverrides={themeOverrides} styleOverrides={{ ...styleOverrides, container: { paddingBottom: 22, ...(styleOverrides?.container || {}) } }} />
            <View style={{ position: 'absolute', bottom: 6, right: 10, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', fontFamily: fontFamily, marginRight: 4 }}>{formatTime(timestamp)}</Text>
                {isCurrentUser && ((message as any).status === 'read' ? (
                    <View style={{ flexDirection: 'row' }}>
                        <Icons.CheckIcon width={10} height={10} color={COLORS.brandPrimary} />
                        <Icons.CheckIcon width={10} height={10} color={COLORS.brandPrimary} style={{ marginLeft: -6 }} />
                    </View>
                ) : (
                    <Icons.CheckIcon width={10} height={10} color="rgba(255, 255, 255, 0.4)" />
                ))}
            </View>
          </View>
        </Pressable>
        {!!((message as any).additional_data?.signature) && (
          <View style={{ marginTop: 4, alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: 10, color: COLORS.brandPrimary, fontStyle: 'italic' }}>✅ Hardware Signed</Text>
          </View>
        )}
      </Animated.View>

      <ReactionPicker visible={showReactionPicker} onClose={() => setShowReactionPicker(false)} onSelectEmoji={handleSelectEmoji} />
      <TipModal visible={showTipModal} onClose={() => setShowTipModal(false)} recipientAddress={(message.user?.id || message.sender_id || (message as any).senderId) as string} recipientName={(message.user?.username || 'User') as string} onTipSent={handleTipSent} />
    </View>
  );
}

export default ChatMessage;
