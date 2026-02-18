import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { RootState } from '@/shared/state/store';
import { useTardisMobileWallet } from '@/modules/wallet-providers/hooks/useTardisMobileWallet';
import { fetchAllPosts } from '@/shared/state/thread/reducer';
import { SERVER_URL } from '@env';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';

const CreatePostScreen = ({ navigation }) => {
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const insets = useSafeAreaInsets();
  
  const dispatch = useAppDispatch();
  const { signMessage } = useTardisMobileWallet();
  const authState = useSelector((state: RootState) => state.auth);
  const userId = authState.address;
  const username = authState.username || 'Anonymous';

  const handlePost = async () => {
    if (!postContent.trim()) return;
    
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to post.");
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const messageToSign = JSON.stringify({
        content: postContent.trim(),
        timestamp: timestamp,
      });

      console.log("[CreatePost] Requesting MWA signature for:", messageToSign);
      
      // Request signature immediately on user interaction
      const signature = await signMessage(messageToSign);

      if (!signature) {
        console.warn("[CreatePost] No signature received.");
        return;
      }

      // Now set loading state for backend submission
      setIsPosting(true);
      console.log("[CreatePost] Signature received, publishing...");

      // REAL PRODUCTION: Send signed hardware post to backend
      const postData = {
        author_wallet_address: userId,
        author_skr_username: username,
        content: postContent.trim(),
        media_urls: [],
        signature: signature,
        timestamp: timestamp,
      };

      const SERVER_BASE_URL = SERVER_URL || 'http://localhost:3000';
      const response = await fetch(`${SERVER_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert("Success", "Hardware-signed post published!");
        setPostContent('');
        // Refresh posts in the global state
        dispatch(fetchAllPosts(undefined));
        navigation.goBack();
      } else {
        Alert.alert("Publishing Error", result.error || "Failed to publish post.");
      }
    } catch (error) {
      console.error("Post error:", error);
      Alert.alert("Error", "An unexpected error occurred while posting.");
    } finally {
      setIsPosting(false);
    }
  };

  const charLimit = 280;
  const remainingChars = charLimit - postContent.length;
  const isOverLimit = postContent.length > charLimit;

  return (
    <View style={[styles.safeArea, { backgroundColor: COLORS.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={isPosting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.postButton,
              (!postContent.trim() || isOverLimit || isPosting) && styles.postButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={!postContent.trim() || isOverLimit || isPosting}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputContainer}>
            <Image
              source={require('@/assets/images/User.png')}
              style={styles.avatar}
            />
            <TextInput
              style={styles.textInput}
              placeholder="What's happening?"
              placeholderTextColor={COLORS.gray || '#888'}
              multiline
              autoFocus
              value={postContent}
              onChangeText={setPostContent}
              selectionColor={COLORS.brandPrimary}
              editable={!isPosting}
            />
          </View>
        </ScrollView>

        {/* Toolbar - always above keyboard */}
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.toolbarIcons}>
             <TouchableOpacity style={styles.iconButton} disabled={isPosting}>
                <Icons.GalleryIcon width={24} height={24} color={COLORS.brandPrimary} />
             </TouchableOpacity>
          </View>
          
          <View style={styles.rightToolbar}>
            {postContent.length > 0 && (
              <Text style={[
                styles.charCount,
                remainingChars <= 20 && styles.charCountWarning,
                isOverLimit && styles.charCountError
              ]}>
                {remainingChars}
              </Text>
            )}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.plusButton} disabled={isPosting}>
               <Icons.PlusCircleIcon width={24} height={24} fill={COLORS.brandPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderDarkColor,
    minHeight: 60,
  },
  cancelText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  postButton: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 19,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    paddingTop: 8,
    minHeight: 150,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderDarkColor,
    backgroundColor: COLORS.background,
  },
  toolbarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginRight: 24,
  },
  rightToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  charCount: {
    color: COLORS.gray,
    fontSize: 14,
    marginRight: 12,
  },
  charCountWarning: {
    color: '#FFAD1F', // Orange
  },
  charCountError: {
    color: '#E0245E', // Red
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderDarkColor,
    marginRight: 12,
  },
  plusButton: {
    padding: 2,
  },
});

export default CreatePostScreen;
