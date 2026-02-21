import React, { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { ImageIcon, TradeShare } from '@/assets/svgs';
import {
  useAppDispatch,
  useAppSelector,
} from '@/shared/hooks/useReduxHooks';
import {
  createRootPostAsync,
  createReplyAsync,
  addPostLocally,
  addReplyLocally,
} from '@/shared/state/thread/reducer';
import { getChatComposerBaseStyles } from './ChatComposer.styles';
import { mergeStyles } from '../../utils';
import { ThreadSection, ThreadUser, ThreadPost } from '../../../thread/types';
import * as ImagePicker from 'expo-image-picker';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import TradeModal from '../../../thread/components/trade/ShareTradeModal';
import { DEFAULT_IMAGES } from '@/shared/config/constants';
import COLORS from '@/assets/colors';
import Svg, { Path } from 'react-native-svg';
import { uploadChatImage } from '../../services/chatImageService';
import { sendMessage } from '@/shared/state/chat/slice';
import socketService from '@/shared/services/socketService';
import { encryptMessage, getKeypairFromSeed } from '@/shared/utils/crypto';
import { Buffer } from 'buffer';

/**
 * Props for the ChatComposer component
 */
interface ChatComposerProps {
  currentUser: ThreadUser;
  parentId?: string;
  onMessageSent?: (content: string, imageUrl?: string) => void;
  themeOverrides?: Partial<Record<string, any>>;
  styleOverrides?: { [key: string]: object };
  userStyleSheet?: { [key: string]: object };
  inputValue?: string;
  onInputChange?: (value: string) => void;
  disabled?: boolean;
  chatContext?: { chatId: string };
}

/**
 * A component for composing new messages in a chat or thread
 */
export const ChatComposer = forwardRef<{ focus: () => void }, ChatComposerProps>((props, ref) => {
  const {
    currentUser,
    parentId,
    onMessageSent,
    chatContext,
    styleOverrides,
    userStyleSheet,
    inputValue,
    onInputChange,
  } = props;

  const dispatch = useAppDispatch();
  const inputRef = useRef<TextInput>(null);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }));

  const { address, signMessage: walletSign } = useWallet();
  const chats = useAppSelector(state => state.chat.chats);
  const encryptionSeed = useAppSelector(state => state.auth.encryptionSeed);

  // Internal state for text, unless controlled by inputValue prop
  const [textValue, setTextValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);

  const currentTextValue = inputValue !== undefined ? inputValue : textValue;

  const handleTextChange = (newText: string) => {
    if (onInputChange) {
      onInputChange(newText);
    } else {
      setTextValue(newText);
    }
  };

  const baseStyles = getChatComposerBaseStyles();
  const styles = mergeStyles(baseStyles, styleOverrides, userStyleSheet);

  /**
   * Helper to prepare thread sections
   */
  const prepareSections = (text: string): ThreadSection[] => {
    const sections: ThreadSection[] = [];
    if (text.trim()) {
      sections.push({
        id: 'section-' + Math.random().toString(36).substr(2, 9),
        type: 'TEXT_ONLY',
        text: text.trim(),
      });
    }
    return sections;
  };

  /**
   * Message sending logic
   */
  const handleSend = async () => {
    if (!currentTextValue.trim() && !selectedImage) return;

    setIsSubmitting(true);
    try {
      let uploadedImageUrl = '';
      if (selectedImage) {
        try {
          uploadedImageUrl = await uploadChatImage(currentUser.id, selectedImage);
        } catch (error) {
          console.error('Failed to upload image:', error);
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // 1. Handle Chat (Direct or Community Group)
      if (chatContext && chatContext.chatId) {
        let finalContent = currentTextValue;
        let nonce = undefined;
        let isEncrypted = false;
        let signature = undefined;

        const currentChat = chats.find(c => c.id === chatContext.chatId);
        // Robust check: if we can't find chat in state but it's a group ID, or explicitly group
        const isGroup = currentChat ? currentChat.type === 'group' : true; // Default to group if in community context

        // A. Handle Direct Chat (E2EE)
        if (currentChat && currentChat.type === 'direct' && encryptionSeed) {
          const otherParticipant = currentChat.participants.find(p => p.id !== currentUser.id);
          if (otherParticipant && otherParticipant.public_encryption_key) {
            try {
              const seedUint8 = new Uint8Array(Buffer.from(encryptionSeed, 'base64'));
              const keypair = getKeypairFromSeed(seedUint8);
              const { ciphertext, nonce: msgNonce } = encryptMessage(
                currentTextValue,
                otherParticipant.public_encryption_key,
                keypair.secretKey
              );
              finalContent = ciphertext;
              nonce = msgNonce;
              isEncrypted = true;
            } catch (err) {
              console.error('[ChatComposer] Encryption failed:', err);
            }
          }
        } 
        
        // B. Handle Community/Group Chat (Signature Required)
        else if (isGroup) {
          try {
            const timestamp = new Date().toISOString();
            // Reconstruct exactly what backend verifies
            const messageToSign = `{"content":"${currentTextValue.trim()}","timestamp":"${timestamp}","chatId":"${chatContext.chatId}"}`;
            console.log("[ChatComposer] Requesting MWA signature for Community Message:", messageToSign);
            
            const messageUint8 = new Uint8Array(Buffer.from(messageToSign, 'utf8'));
            const sig = await walletSign(messageUint8);
            
            if (!sig) {
              setIsSubmitting(false);
              return; // User cancelled
            }
            signature = Buffer.from(sig).toString('base64');
          } catch (err) {
            console.error('[ChatComposer] Signature failed:', err);
            Alert.alert('Signature Required', 'You must sign the message to post in a community.');
            setIsSubmitting(false);
            return;
          }
        }

        const resultAction = await dispatch(sendMessage({
          chatId: chatContext.chatId,
          userId: currentUser.id,
          content: finalContent,
          imageUrl: uploadedImageUrl,
          nonce,
          isEncrypted,
          additionalData: signature ? { signature } : undefined // Attach signature to additionalData
        })).unwrap();

        if (resultAction && resultAction.id) {
          const socketPayload = {
            ...resultAction,
            senderId: currentUser.id,
            sender_id: currentUser.id,
            chatId: chatContext.chatId,
            chat_room_id: chatContext.chatId
          };
          socketService.sendMessage(chatContext.chatId, socketPayload);
        }

        if (onMessageSent) onMessageSent(currentTextValue, uploadedImageUrl);
      } 
      // 2. Handle Thread Posts
      else {
        const sections = prepareSections(currentTextValue);
        if (parentId) {
          await dispatch(createReplyAsync({ parentId, userId: currentUser.id, sections })).unwrap();
        } else {
          await dispatch(createRootPostAsync({ userId: currentUser.id, sections })).unwrap();
        }
      }

      // Reset state
      if (inputValue === undefined) setTextValue('');
      setSelectedImage(null);
    } catch (error: any) {
      console.error('Error sending:', error);
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Media picking
   */
  const handleMediaPress = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Access to photo library required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1]
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Error picking image', error.message);
    }
  }, []);

  const handleShareTrade = useCallback(async (data: any) => {
    if (!chatContext) return;
    setIsSubmitting(true);
    try {
      const resultAction = await dispatch(sendMessage({
        chatId: chatContext.chatId,
        userId: currentUser.id,
        content: `Shared a trade: ${data.inputSymbol} → ${data.outputSymbol}`,
        additionalData: { tradeData: data },
      })).unwrap();

      if (resultAction && resultAction.id) {
        socketService.sendMessage(chatContext.chatId, {
          ...resultAction,
          senderId: currentUser.id,
          chatId: chatContext.chatId
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not share trade.');
    } finally {
      setIsSubmitting(false);
    }
  }, [chatContext, currentUser.id, dispatch]);

  const renderAttachmentPreviews = () => {
    if (!selectedImage) return null;
    return (
      <View style={styles.attachmentPreviewsContainer}>
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
            <Text style={styles.removeImageButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const canSend = currentTextValue.trim() !== '' || selectedImage !== null;

  return (
    <View>
      {renderAttachmentPreviews()}
      <View style={styles.composerContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.composerInput}
            placeholder={parentId ? 'Reply...' : "Type a message..."}
            placeholderTextColor="#999"
            value={currentTextValue}
            onChangeText={handleTextChange}
            multiline
            keyboardAppearance="dark"
          />
          <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={handleMediaPress} style={styles.iconButton}>
              {ImageIcon && <ImageIcon width={22} height={22} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTradeModal(true)} style={styles.iconButton}>
              {TradeShare && <TradeShare width={22} height={22} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.disabledSendButton]}
          onPress={handleSend}
          disabled={!canSend || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <Path
                d="M20.01 3.87L3.87 8.25C3.11 8.51 3.15 9.65 3.92 9.85L10.03 11.85L12.03 17.98C12.24 18.74 13.37 18.78 13.63 18.03L20.01 3.87Z"
                fill="#FFFFFF"
              />
            </Svg>
          )}
        </TouchableOpacity>
      </View>

      <TradeModal
        visible={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        onShare={handleShareTrade}
        currentUser={currentUser}
      />
    </View>
  );
});

ChatComposer.displayName = 'ChatComposer';
export default ChatComposer;
