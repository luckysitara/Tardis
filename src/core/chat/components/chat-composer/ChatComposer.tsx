import React, { useCallback, useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { createRootPostAsync, createReplyAsync } from '@/shared/state/thread/reducer';
import { getChatComposerBaseStyles } from './ChatComposer.styles';
import { mergeStyles } from '../../utils';
import { ThreadSection, ThreadUser } from '../../../thread/types';
import * as ImagePicker from 'expo-image-picker';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import COLORS from '@/assets/colors';
import { uploadChatImage } from '../../services/chatImageService';
import { sendMessage, editMessage } from '@/shared/state/chat/slice';
import socketService from '@/shared/services/socketService';
import { encryptMessage, getKeypairFromSeed } from '@/shared/utils/crypto';
import { Buffer } from 'buffer';
import TipModal from '../tip/TipModal';

const { width } = Dimensions.get('window');

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
  replyingTo?: any | null;
  onCancelReply?: () => void;
  editingMessage?: any | null;
  onCancelEdit?: () => void;
}

export const ChatComposer = forwardRef<{ focus: () => void }, ChatComposerProps>((props, ref) => {
  const { currentUser, parentId, onMessageSent, chatContext, styleOverrides, userStyleSheet, inputValue, onInputChange, replyingTo, onCancelReply, editingMessage, onCancelEdit } = props;
  const dispatch = useAppDispatch();
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  const { signMessage: walletSign } = useWallet();
  const chats = useAppSelector(state => state.chat.chats);
  const encryptionSeed = useAppSelector(state => state.auth.encryptionSeed);

  const [textValue, setTextValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  useEffect(() => {
    if (editingMessage) {
      setTextValue(editingMessage.content || '');
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const currentTextValue = inputValue !== undefined ? inputValue : textValue;
  const currentChat = useMemo(() => chatContext?.chatId ? chats.find(c => c.id === chatContext.chatId) : null, [chatContext, chats]);
  const otherParticipant = useMemo(() => currentChat?.participants.find(p => p.id !== currentUser.id), [currentChat, currentUser.id]);

  const handleTipSent = async (signature: string, amount: number, symbol: string) => {
    if (!chatContext) return;
    try {
      const resultAction = await dispatch(sendMessage({ chatId: chatContext.chatId, userId: currentUser.id, content: `Sent a tip of ${amount} ${symbol} 💸`, additionalData: { type: 'tip', amount, symbol, signature } })).unwrap();
      if (resultAction?.id) socketService.sendMessage(chatContext.chatId, { ...resultAction, senderId: currentUser.id, chatId: chatContext.chatId });
    } catch (error) { console.error(error); }
  };

  const handleMediaPress = useCallback(async (type: 'photo' | 'video' | 'any') => {
    setShowAttachmentMenu(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed', 'Access to photo library required.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'photo' ? ImagePicker.MediaTypeOptions.Images : type === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]) setSelectedImage(result.assets[0].uri);
    } catch (error: any) { Alert.alert('Error picking media', error.message); }
  }, []);

  const handleSend = async () => {
    if (!currentTextValue.trim() && !selectedImage) return;
    setIsSubmitting(true);
    try {
      if (editingMessage) {
        await dispatch(editMessage({ messageId: editingMessage.id, userId: currentUser.id, content: currentTextValue.trim() })).unwrap();
        if (chatContext) socketService.editMessage(chatContext.chatId, editingMessage.id, currentTextValue.trim());
        if (onMessageSent) onMessageSent(currentTextValue, '');
        if (onCancelEdit) onCancelEdit();
        setTextValue('');
        setIsSubmitting(false);
        return;
      }

      let uploadedImageUrl = '';
      if (selectedImage) uploadedImageUrl = await uploadChatImage(currentUser.id, selectedImage);

      if (chatContext) {
        let finalContent = currentTextValue, nonce, isEncrypted = false, signature, messageTimestamp;
        const chat = chats.find(c => c.id === chatContext.chatId);
        if (chat?.type === 'direct' && encryptionSeed) {
          const recipient = chat.participants.find(p => p.id !== currentUser.id);
          if (recipient?.public_encryption_key) {
            const seed = new Uint8Array(Buffer.from(encryptionSeed, 'base64'));
            const { ciphertext, nonce: msgNonce } = encryptMessage(currentTextValue, recipient.public_encryption_key, getKeypairFromSeed(seed).secretKey);
            finalContent = ciphertext; nonce = msgNonce; isEncrypted = true;
          }
        } else if (chat?.type === 'group' || !chat) {
          messageTimestamp = new Date().toISOString();
          const messageToSign = `{"content":"${currentTextValue.trim()}","timestamp":"${messageTimestamp}"${uploadedImageUrl ? `,"imageUrl":"${uploadedImageUrl}"` : ""},"chatId":"${chatContext.chatId}"}`;
          const sig = await walletSign(new Uint8Array(Buffer.from(messageToSign, 'utf8')));
          if (!sig) { setIsSubmitting(false); return; }
          signature = Buffer.from(sig).toString('base64');
        }

        const resultAction = await dispatch(sendMessage({ chatId: chatContext.chatId, userId: currentUser.id, content: finalContent, imageUrl: uploadedImageUrl, nonce, isEncrypted, replyToId: replyingTo?.id, additionalData: signature ? { signature, timestamp: messageTimestamp } : undefined })).unwrap();
        if (resultAction?.id) socketService.sendMessage(chatContext.chatId, { ...resultAction, senderId: currentUser.id, chatId: chatContext.chatId });
        if (onMessageSent) onMessageSent(currentTextValue, uploadedImageUrl);
      } else {
        const sections: ThreadSection[] = [];
        if (currentTextValue.trim()) sections.push({ id: 's-' + Date.now(), type: 'TEXT_ONLY', text: currentTextValue.trim() });
        if (uploadedImageUrl) sections.push({ id: 'm-' + Date.now(), type: 'MEDIA', mediaUrl: uploadedImageUrl });
        if (parentId) await dispatch(createReplyAsync({ parentId, userId: currentUser.id, sections })).unwrap();
        else await dispatch(createRootPostAsync({ userId: currentUser.id, sections })).unwrap();
      }
      if (inputValue === undefined) setTextValue('');
      setSelectedImage(null);
    } catch (error) { console.error(error); Alert.alert('Error', 'Failed to send message.'); } finally { setIsSubmitting(false); }
  };

  const baseStyles = getChatComposerBaseStyles();
  const styles = mergeStyles(baseStyles, styleOverrides, userStyleSheet);

  const canSend = currentTextValue.trim() !== '' || selectedImage !== null;

  return (
    <View>
      {selectedImage && (
        <View style={styles.attachmentPreviewsContainer}>
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}><Text style={styles.removeImageButtonText}>✕</Text></TouchableOpacity>
          </View>
        </View>
      )}
      {replyingTo && (
        <View style={styles.replyPreviewContainer}>
          <View style={styles.replyTextContainer}>
            <Text style={styles.replyToUser}>Replying to {replyingTo.sender?.display_name || replyingTo.sender?.username || 'User'}</Text>
            <Text style={styles.replyContent} numberOfLines={1}>{replyingTo.content}</Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={styles.closeReplyButton}><Text style={styles.removeImageButtonText}>✕</Text></TouchableOpacity>
        </View>
      )}

      <View style={styles.composerContainer}>
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={() => setShowAttachmentMenu(true)} style={localStyles.plusButton}><Ionicons name="add" size={26} color={COLORS.brandPrimary} /></TouchableOpacity>
          <TextInput ref={inputRef} style={styles.composerInput} placeholder="Type a message..." placeholderTextColor="#999" value={currentTextValue} onChangeText={v => onInputChange ? onInputChange(v) : setTextValue(v)} multiline keyboardAppearance="dark" />
          <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={() => handleMediaPress('photo')} style={styles.iconButton}><Ionicons name="camera-outline" size={24} color={COLORS.brandPrimary} /></TouchableOpacity>
            {!!otherParticipant && <TouchableOpacity onPress={() => setShowTipModal(true)} style={styles.iconButton}><Ionicons name="cash-outline" size={24} color={COLORS.brandPrimary} /></TouchableOpacity>}
          </View>
        </View>
        <TouchableOpacity style={[styles.sendButton, !canSend && styles.disabledSendButton]} onPress={handleSend} disabled={!canSend || isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color={COLORS.white} />}
        </TouchableOpacity>
      </View>

      <TipModal visible={showTipModal} onClose={() => setShowTipModal(false)} recipientAddress={otherParticipant?.id || ''} recipientName={otherParticipant?.display_name || otherParticipant?.username || 'User'} onTipSent={handleTipSent} />

      <Modal transparent visible={showAttachmentMenu} animationType="slide" onRequestClose={() => setShowAttachmentMenu(false)}>
        <TouchableOpacity style={localStyles.modalOverlay} activeOpacity={1} onPress={() => setShowAttachmentMenu(false)}>
          <View style={localStyles.bottomSheet}>
            <View style={localStyles.sheetHeader}><View style={localStyles.handle} /></View>
            <View style={localStyles.optionsContainer}>
              <TouchableOpacity style={localStyles.option} onPress={() => handleMediaPress('photo')}><View style={[localStyles.iconCircle, { backgroundColor: '#4F5EED' }]}><Ionicons name="image" size={24} color="#FFF" /></View><Text style={localStyles.optionText}>Photo</Text></TouchableOpacity>
              <TouchableOpacity style={localStyles.option} onPress={() => handleMediaPress('video')}><View style={[localStyles.iconCircle, { backgroundColor: '#FF8A00' }]}><Ionicons name="videocam" size={24} color="#FFF" /></View><Text style={localStyles.optionText}>Video</Text></TouchableOpacity>
              <TouchableOpacity style={localStyles.option} onPress={() => { setShowAttachmentMenu(false); Alert.alert('Coming Soon', 'Document sharing is on the way.'); }}><View style={[localStyles.iconCircle, { backgroundColor: '#5EBA7D' }]}><Ionicons name="document-text" size={24} color="#FFF" /></View><Text style={localStyles.optionText}>Document</Text></TouchableOpacity>
              <TouchableOpacity style={localStyles.option} onPress={() => { setShowAttachmentMenu(false); Alert.alert('Coming Soon', 'Audio sharing is on the way.'); }}><View style={[localStyles.iconCircle, { backgroundColor: '#E333FF' }]}><Ionicons name="musical-notes" size={24} color="#FFF" /></View><Text style={localStyles.optionText}>Audio</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={localStyles.cancelButton} onPress={() => setShowAttachmentMenu(false)}><Text style={localStyles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const localStyles = StyleSheet.create({
  plusButton: { padding: 4, marginRight: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: COLORS.darkerBackground, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingBottom: 30, paddingHorizontal: 20 },
  sheetHeader: { alignItems: 'center', paddingVertical: 12 },
  handle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingVertical: 20 },
  option: { width: (width - 60) / 4, alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  optionText: { color: COLORS.white, fontSize: 12, fontWeight: '500' },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  cancelText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});

ChatComposer.displayName = 'ChatComposer';
export default ChatComposer;
