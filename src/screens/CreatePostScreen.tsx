import React, { useState, useEffect } from 'react';
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
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { CreatePostPayload, ThreadPost } from '@/shared/state/post/types';
import { createPost, fetchPosts } from '@/shared/state/post/slice'; // Import createPost from the new slice
import { fetchCommunities } from '@/shared/state/community/slice'; // Import fetchCommunities
import { Community } from '@/shared/state/community/types'; // Import Community type
import { SERVER_URL } from '@env';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { Buffer } from 'buffer';
import { Picker } from '@react-native-picker/picker'; // Import Picker

const CreatePostScreen = ({ navigation }) => {
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null); // State for selected community
  const insets = useSafeAreaInsets();
  
  const dispatch = useAppDispatch();
  const { signMessage, address: userId } = useWallet();
  const authState = useSelector((state: RootState) => state.auth);
  const username = authState.username || 'Anonymous';
  const { communities } = useSelector((state: RootState) => state.community); // Get communities from store

  useEffect(() => {
    dispatch(fetchCommunities()); // Fetch communities when component mounts
  }, [dispatch]);

  const handlePost = async () => {
    if (!postContent.trim()) return;
    
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to post.");
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      // DETERMINISTIC: Keys must be in this exact order for backend verification
      const messageToSign = `{"content":"${postContent.trim()}","timestamp":"${timestamp}"}`;
      const messageUint8 = new Uint8Array(Buffer.from(messageToSign, 'utf8'));

      console.log("[CreatePost] Requesting MWA signature for:", messageToSign);
      
      // Request signature immediately on user interaction
      const signature = await signMessage(messageUint8);

      if (!signature) {
        console.warn("[CreatePost] No signature received.");
        return;
      }

      // Convert Uint8Array signature to base64 for backend
      const signatureBase64 = Buffer.from(signature).toString('base64');

      // Now set loading state for backend submission
      setIsPosting(true);
      console.log("[CreatePost] Signature received, publishing...");

      // Prepare post data with community_id
      const postData: CreatePostPayload = {
        author_wallet_address: userId,
        author_skr_username: username,
        content: postContent.trim(),
        media_urls: [],
        signature: signatureBase64,
        timestamp: timestamp,
        community_id: selectedCommunityId || undefined, // Include selected community ID
      };

      await dispatch(createPost(postData)).unwrap(); // Dispatch the new createPost action

      Alert.alert("Success", "Hardware-signed post published!");
      setPostContent('');
      // Refresh posts in the relevant feed (global or community-specific)
      dispatch(fetchPosts({ communityId: selectedCommunityId || undefined }));
      navigation.goBack();
    } catch (error: any) {
      console.error("Post error:", error);
      Alert.alert("Error", error.message || "An unexpected error occurred while posting.");
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
            <View style={styles.postInputArea}>
              {/* Community Selector */}
              <View style={styles.communitySelectorContainer}>
                <Text style={styles.communitySelectorLabel}>Posting to:</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedCommunityId}
                    onValueChange={(itemValue) => setSelectedCommunityId(itemValue)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="Global Feed" value={null} />
                    {communities.map(community => (
                      <Picker.Item key={community.id} label={community.name} value={community.id} />
                    ))}
                  </Picker>
                  <Icons.ChevronDownIcon width={16} height={16} color={COLORS.greyLight} style={styles.pickerIcon} />
                </View>
              </View>

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
  postInputArea: {
    flex: 1,
  },
  communitySelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#161B22',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363D',
    paddingLeft: 10,
  },
  communitySelectorLabel: {
    color: COLORS.greyLight,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  pickerWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    height: 40,
  },
  picker: {
    color: COLORS.white,
    height: 40,
    // On Android, set a transparent background to make the wrapper background visible
    backgroundColor: 'transparent', 
  },
  pickerItem: {
    color: COLORS.white,
    backgroundColor: COLORS.background, // This style might not apply directly on Android Picker.Item
    fontSize: 16,
  },
  pickerIcon: {
    position: 'absolute',
    right: 15,
    pointerEvents: 'none', // Ensure clicks go through to the picker
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

