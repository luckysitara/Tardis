import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Pressable, GestureResponderEvent, Text, TextStyle, Animated, Alert, TouchableOpacity } from 'react-native';
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

// Update ChatMessageProps to include onLongPress
interface ExtendedChatMessageProps extends ChatMessageProps {
  onLongPress?: (event: GestureResponderEvent) => void; // Optional long press handler
  onEditMessage?: (message: any) => void;
  onDeleteMessage?: (message: any) => void;
}

/**
 * Formats a timestamp into a readable format
 */
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
  onLongPress, // Receive the onLongPress prop
  onPressUser, // Added
  onEditMessage,
  onDeleteMessage,
  themeOverrides,
  styleOverrides,
  showHeader = true,
  showFooter = false, // Change default to false since we're showing timestamp in the bubble
}: ChatMessageProps) {
  console.log(`[ChatMessage V2] Rendered message ${message.id}. onDeleteMessage prop exists: ${!!onDeleteMessage}`);
  const dispatch = useAppDispatch();
  const encryptionSeed = useAppSelector(state => state.auth.encryptionSeed);
  const chats = useAppSelector(state => state.chat.chats);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const materializeAnim = useRef(new Animated.Value(0)).current;

  const handleTipSent = async (signature: string, amount: number, symbol: string) => {
    try {
      const resultAction = await dispatch(sendMessage({
        chatId: message.chat_room_id,
        userId: currentUser.id,
        content: `Sent a tip of ${amount} ${symbol} 💸`,
        additionalData: { 
          type: 'tip', 
          amount, 
          symbol, 
          signature 
        },
      })).unwrap();

      if (resultAction && resultAction.id) {
        socketService.sendMessage(message.chat_room_id, {
          ...resultAction,
          senderId: currentUser.id,
          chatId: message.chat_room_id
        });
      }
    } catch (error) {
      console.error('Error sharing tip message:', error);
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    dispatch(addReactionToMessage({
      messageId: message.id,
      userId: currentUser.id,
      emoji,
      chatId: message.chat_room_id
    }));
    
    // Broadcast via socket
    socketService.sendReaction(
      message.chat_room_id,
      message.id,
      emoji,
      currentUser.id
    );
  };

  const handlePressReaction = (emoji: string) => {
    // If user has already reacted with this emoji, remove it
    const userReaction = message.reactions?.find(r => r.user_id === currentUser.id && r.emoji === emoji);
    if (userReaction) {
      // Need a remove thunk - I'll use the one I added earlier
      dispatch(removeReactionFromMessage({
        messageId: message.id,
        userId: currentUser.id,
        emoji,
        chatId: message.chat_room_id
      }));
      socketService.sendRemoveReaction(message.chat_room_id, message.id, emoji, currentUser.id);
    } else {
      handleSelectEmoji(emoji);
    }
  };

  useEffect(() => {
    Animated.timing(materializeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [materializeAnim]);

  // Determine if this message is from the current user
  const isCurrentUser = useMemo(() => {
    if (!message || typeof message !== 'object') return false;
    // Check multiple properties for sender ID consistency
    return (
      (message.user && message.user.id === currentUser.id) ||
      ('sender_id' in message && message.sender_id === currentUser.id) ||
      ('senderId' in message && message.senderId === currentUser.id)
    );
  }, [message, currentUser.id]);

  const handleLongPress = () => {
    console.log(`[ChatMessage] handleLongPress for message ${message.id}. isDeleted: ${message.is_deleted}, isCurrentUser: ${isCurrentUser}`);
    if (message.is_deleted) return;
    
    if (isCurrentUser) {
      console.log(`[ChatMessage] Showing Alert for message ${message.id}`);
      Alert.alert(
        'Message Actions',
        'Choose an action for this message:',
        [
          {
            text: 'React',
            onPress: () => {
              console.log(`[ChatMessage] React selected`);
              setShowReactionPicker(true);
            }
          },
          {
            text: 'Edit',
            onPress: () => {
              console.log(`[ChatMessage] Edit selected`);
              onEditMessage && onEditMessage(message);
            }
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              console.log(`[ChatMessage] Delete confirmed for message ${message.id}`);
              // Use a small delay to ensure the menu alert is closed
              setTimeout(() => {
                if (onDeleteMessage) {
                  onDeleteMessage(message);
                } else {
                  console.error(`[ChatMessage] onDeleteMessage prop is missing!`);
                }
              }, 300);
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log(`[ChatMessage] Action menu cancelled`)
          }
        ]
      );
    } else {
      setShowReactionPicker(true);
    }
    onLongPress && onLongPress({} as any);
  };

  // Decrypt content if message is encrypted
  const decryptedContent = useMemo(() => {
    if (!message || typeof message !== 'object') return '';
    // Cast message as any for E2EE fields
    const msg = message as any;
    
    if (msg.is_encrypted && msg.nonce && encryptionSeed) {
      try {
        const currentChat = chats.find(c => c.id === msg.chat_room_id);
        if (currentChat && currentChat.type === 'direct') {
          // In E2EE (NaCl Box), Alice SK + Bob PK == Shared Secret.
          // To decrypt a message Alice sent to Bob, Alice uses Her SK + Bob PK.
          // To decrypt a message Bob sent to Alice, Alice uses Her SK + Bob PK.
          
          // IMPORTANT: "Other participant" is always the person who is NOT ME.
          // If I am the sender, other participant is the recipient.
          // If I am the recipient, other participant is the sender.
          const otherParticipant = currentChat.participants.find(p => p.id !== currentUser.id);
          
          if (otherParticipant && otherParticipant.public_encryption_key) {
            const otherPkBase64 = otherParticipant.public_encryption_key;
            
            // SECURITY CHECK: Validate that the key looks like a real 32-byte base64 string
            // This prevents errors with test placeholders like 'rose_test_key...'
            let isKeyValid = false;
            try {
              const decoded = Buffer.from(otherPkBase64, 'base64');
              isKeyValid = decoded.length === 32;
            } catch (e) {
              isKeyValid = false;
            }

            if (!isKeyValid) {
              console.warn(`[ChatMessage] Skipping E2EE decrypt for user ${otherParticipant.id.substring(0, 8)}. Invalid PK format (likely test data).`);
              return '[Encrypted Transmission]';
            }

            const seedUint8 = new Uint8Array(Buffer.from(encryptionSeed, 'base64'));
            const keypair = getKeypairFromSeed(seedUint8);
            
            console.log(`[ChatMessage] Secure Decrypt attempt. Msg: ${msg.id.substring(0, 8)}, I am sender: ${isCurrentUser}, My Addr: ${currentUser.id.substring(0, 6)}, Other Addr: ${otherParticipant.id.substring(0, 6)}`);
            
            const decrypted = decryptMessage(
              msg.content,
              msg.nonce,
              otherPkBase64,
              keypair.secretKey
            );
            
            if (decrypted) {
              return decrypted;
            } else {
              // Silent failure - common with test accounts or mismatched seeds
              return '[Locked Transmission]';
            }
          } else {
            return '[Locked - Missing Key]';
          }
        }
      } catch (err) {
        return '[Decryption error]';
      }
    }
    return message.content;
  }, [message, encryptionSeed, chats, currentUser.id, isCurrentUser]);

  // Create message object for bubble with potentially decrypted content
  const displayMessage = useMemo(() => {
    if (!message || typeof message !== 'object') return { content: '' } as any;
    return {
      ...message,
      content: decryptedContent
    };
  }, [message, decryptedContent]);

  // Get base styles
  const baseStyles = getMessageBaseStyles();

  // Use utility function to merge styles
  const styles = mergeStyles(
    baseStyles,
    styleOverrides,
    undefined
  );

  // Determine container style based on sender
  const containerStyle = [
    styles.messageContainer,
    isCurrentUser
      ? styles.currentUserMessageContainer
      : styles.otherUserMessageContainer
  ];

  // Determine content type
  const getContentType = () => {
    if (!message || typeof message !== 'object') return 'text';
    // If message has explicit contentType, use it
    if ('contentType' in message && message.contentType) {
      return message.contentType;
    }

    // Determine from message data
    if ('tradeData' in message && message.tradeData) {
      return 'trade';
    } else if ('nftData' in message && message.nftData) {
      return 'nft';
    } else if ('media' in message && message.media && message.media.length > 0) {
      return 'media';
    } else if ('image_url' in message && (message as any).image_url) {
      return 'media';
    } else if ('imageUrl' in message && (message as any).imageUrl) {
      return 'media';
    } else if ('sections' in message) {
      // Check for images in thread post sections using any to avoid TypeScript errors
      const sections = message.sections as any[];
      if (Array.isArray(sections)) {
        const hasMedia = sections.some(section =>
          section && typeof section === 'object' && (
            section.image ||
            (section.media && section.media.length > 0) ||
            section.mediaSrc
          )
        );

        if (hasMedia) return 'media';
      }
    }

    // Default to text
    return 'text';
  };

  const contentType = getContentType();

  // Determine if we should show header and footer based on content type
  const shouldShowHeader = useMemo(() => {
    // Check if it's a direct chat (only 2 participants)
    const currentChat = chats.find(c => c.id === message.chat_room_id);
    const isDirectChat = currentChat?.type === 'direct';

    // In direct chats, never show header (no need for name/avatar for every msg)
    if (isDirectChat) {
      return false;
    }

    // In group/community chats, show header for OTHER users' messages if showHeader is true
    if (!isCurrentUser && showHeader) {
      return true;
    }
    return false;
  }, [isCurrentUser, showHeader, chats, message.chat_room_id]);

  // For special content types like NFTs and trades, we might want to show footer
  const shouldShowFooter = useMemo(() => {
    if (!showFooter) return false;

    // For NFT and trade messages, don't show footer
    if (contentType === 'trade' || contentType === 'nft') {
      return false;
    }

    return true;
  }, [showFooter, contentType]);

  // Get timestamp from different message types
  const timestamp = message.created_at || (message as any).createdAt || new Date();

  // Get font family from text style if available
  const fontFamily = styleOverrides?.text && (styleOverrides.text as TextStyle).fontFamily;

  // Extend MessageBubble props to include timestamp
  const messageBubbleProps = {
    message: displayMessage,
    isCurrentUser,
    themeOverrides,
    onPressReaction: handlePressReaction,
    styleOverrides: {
      ...styleOverrides,

      // Only add padding at the bottom for current user's messages
      container: {
        ...(isCurrentUser && { paddingBottom: 22 }),
        ...(styleOverrides?.container || {})
      }
    }
  };

  return (
    <View style={{ marginBottom: 8, marginHorizontal: 12 }}>
      {/* Header takes full width available */}
      {shouldShowHeader && (
        <View style={{ width: '100%', marginBottom: 6, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <MessageHeader
              message={message}
              showAvatar={chats.find(c => c.id === message.chat_room_id)?.type !== 'direct'}
              onPressUser={onPressUser || (user => console.log('User pressed:', user.id))}
            />
          </View>
          {!isCurrentUser && (
            <TouchableOpacity 
              onPress={() => setShowTipModal(true)}
              style={{ padding: 8, backgroundColor: 'rgba(50, 212, 222, 0.1)', borderRadius: 20, marginLeft: 8 }}
            >
              <Text style={{ fontSize: 16 }}>💸</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Message bubble with width constraints */}
      <Animated.View style={[
        {
          maxWidth: '85%',
          opacity: materializeAnim,
          transform: [
            { 
              translateY: materializeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0]
              }) 
            }
          ]
        },
        isCurrentUser
          ? { alignSelf: 'flex-end' }
          : { alignSelf: 'flex-start' }
      ]}>
        {/* Use Pressable for better touch handling */}
        <Pressable
          onPress={() => onPressMessage && onPressMessage(message)}
          onLongPress={handleLongPress}
          delayLongPress={500} // Consistent delay
          disabled={false} // Enable for reactions
          style={({ pressed }) => [{
            // Allow text messages to fit their content with small max width
            maxWidth: contentType === 'text' ? '75%' : contentType === 'media' ? '80%' : '100%',
            opacity: pressed ? 0.7 : 1,
            // Align the message bubble properly based on user
            alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
          }]}
        >
          <View style={{ position: 'relative' }}>
            <MessageBubble
              {...messageBubbleProps}
            />

            {/* Timestamp & Status inside the message bubble - Only for current user */}
            {isCurrentUser && (
              <View style={{
                position: 'absolute',
                bottom: 6,
                right: 10,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 10,
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: fontFamily,
                  paddingTop: 2,
                  paddingRight: 4,
                }}>
                  {formatTime(timestamp)}
                </Text>
                {/* Status Indicator */}
                {(message as any).status === 'read' ? (
                  // Double Blue Checks
                  <View style={{ flexDirection: 'row' }}>
                    <Icons.CheckIcon width={10} height={10} color={COLORS.brandPrimary} />
                    <Icons.CheckIcon width={10} height={10} color={COLORS.brandPrimary} style={{ marginLeft: -6 }} />
                  </View>
                ) : (
                  // Single Grey Check (Sent)
                  <Icons.CheckIcon width={10} height={10} color="rgba(255, 255, 255, 0.4)" />
                )}
              </View>
            )}
          </View>
        </Pressable>
        {/* Hardware Signature Badge for Group Messages */}
        {!!((message as any).additional_data?.signature) && (
          <View style={{ 
            marginTop: 4, 
            flexDirection: 'row', 
            alignItems: 'center',
            alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' 
          }}>
            <Text style={{ fontSize: 10, color: COLORS.brandPrimary, fontStyle: 'italic' }}>
              ✅ Hardware Signed
            </Text>
          </View>
        )}
      </Animated.View>

      <ReactionPicker
        visible={showReactionPicker}
        onClose={() => setShowReactionPicker(false)}
        onSelectEmoji={handleSelectEmoji}
      />

      <TipModal
        visible={showTipModal}
        onClose={() => setShowTipModal(false)}
        recipientAddress={(message.user?.id || message.sender_id || message.senderId) as string}
        recipientName={(message.user?.username || 'User') as string}
        onTipSent={handleTipSent}
      />
    </View>
  );
}

export default ChatMessage; 