import React, { useMemo, useEffect, useRef } from 'react';
import { View, Pressable, GestureResponderEvent, Text, TextStyle, Animated } from 'react-native';
import { ChatMessageProps } from './message.types';
import { getMessageBaseStyles } from './message.styles';
import { mergeStyles } from '@/core/thread/utils';
import MessageBubble from './MessageBubble';
import MessageHeader from './MessageHeader';
import { useAppSelector } from '@/shared/hooks/useReduxHooks';
import { decryptMessage, getKeypairFromSeed } from '@/shared/utils/crypto';
import { Buffer } from 'buffer';

// Update ChatMessageProps to include onLongPress
interface ExtendedChatMessageProps extends ChatMessageProps {
  onLongPress?: (event: GestureResponderEvent) => void; // Optional long press handler
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
  themeOverrides,
  styleOverrides,
  showHeader = true,
  showFooter = false, // Change default to false since we're showing timestamp in the bubble
}: ExtendedChatMessageProps) {
  const encryptionSeed = useAppSelector(state => state.auth.encryptionSeed);
  const chats = useAppSelector(state => state.chat.chats);
  const materializeAnim = useRef(new Animated.Value(0)).current;

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
          // Thus, in a direct chat, always use the OTHER person's public key.
          const otherParticipant = currentChat.participants.find(p => p.id !== currentUser.id);
          
          if (otherParticipant && otherParticipant.public_encryption_key) {
            const seedUint8 = new Uint8Array(Buffer.from(encryptionSeed, 'base64'));
            const keypair = getKeypairFromSeed(seedUint8);
            
            console.log(`[ChatMessage] Secure Decrypt attempt. Msg: ${msg.id.substring(0, 8)}, I am sender: ${isCurrentUser}`);
            
            const decrypted = decryptMessage(
              msg.content,
              msg.nonce,
              otherParticipant.public_encryption_key,
              keypair.secretKey
            );
            
            if (decrypted) {
              return decrypted;
            } else {
              console.warn('[ChatMessage] Secure Decrypt failed. Key mismatch or data corrupted.');
              return '[Decryption failed]';
            }
          }
        }
      } catch (err) {
        console.error('[ChatMessage] Decryption error:', err);
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
    // Always show header for other users' messages if showHeader is true
    if (!isCurrentUser && showHeader) {
      return true;
    }
    return false;
  }, [isCurrentUser, showHeader]);

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
  const timestamp = 'createdAt' in message ? message.createdAt : new Date();

  // Get font family from text style if available
  const fontFamily = styleOverrides?.text && (styleOverrides.text as TextStyle).fontFamily;

  // Extend MessageBubble props to include timestamp
  const messageBubbleProps = {
    message: displayMessage,
    isCurrentUser,
    themeOverrides,
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
        <View style={{ width: '100%', marginBottom: 6 }}>
          <MessageHeader
            message={message}
            showAvatar={true}
            onPressUser={user => console.log('User pressed:', user.id)}
          />
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
          onLongPress={onLongPress} // Use the passed onLongPress handler
          delayLongPress={500} // Consistent delay
          disabled={!onPressMessage && !onLongPress} // Disable if no handlers
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

            {/* Timestamp inside the message bubble - Only for current user */}
            {isCurrentUser && (
              <Text style={{
                position: 'absolute',
                bottom: 6,
                right: 10,
                fontSize: 10,
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: fontFamily,
                paddingTop: 2,
                paddingRight: 2,
              }}>
                {formatTime(timestamp)}
              </Text>
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
    </View>
  );
}

export default ChatMessage; 