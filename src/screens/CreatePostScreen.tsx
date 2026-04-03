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
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { RootState } from '@/shared/state/store';
import { SERVER_BASE_URL } from '@/shared/config/server';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { CreatePostPayload } from '@/shared/state/post/types';
import { createPost, fetchPosts } from '@/shared/state/post/slice';
import { fetchCommunities } from '@/shared/state/community/slice';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { Buffer } from 'buffer';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadChatImage } from '@/core/chat/services/chatImageService';
import IPFSAwareImage from '@/shared/components/IPFSAwareImage';
import { getValidImageSource } from '@/shared/utils/image';
import { DEFAULT_IMAGES } from '@/shared/config/constants';

const CreatePostScreen = ({ navigation, route }) => {
  const { parentId, authorHandle } = route.params || {};
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isListingMode, setIsListingMode] = useState(false);
  const [isPhysical, setIsPhysical] = useState(false);
  const [listingPrice, setListingPrice] = useState('');
  const [listingTitle, setListingTitle] = useState('');
  const [selectedToken, setSelectedToken] = useState('SKR'); // Default to SKR
  const insets = useSafeAreaInsets();
  
  const TOKENS: Record<string, string | null> = {
    SOL: null,
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixeb6SRwcyV2MqyGvWJp',
    SKR: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3',
  };
  
  const dispatch = useAppDispatch();
  const { signMessage, address: userId } = useWallet();
  const authState = useSelector((state: RootState) => state.auth);
  const username = authState.username || 'Anonymous';
  const profilePicUrl = authState.profilePicUrl;
  const displayName = authState.displayName || username;
  const { communities } = useSelector((state: RootState) => state.community);

  useEffect(() => {
    dispatch(fetchCommunities());
  }, [dispatch]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your gallery to pick an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick an image');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handlePost = async () => {
    if (!postContent.trim() && !selectedImage) return;
    
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to post.");
      return;
    }

    setIsPosting(true);
    try {
      let mediaUrls: string[] = [];
      
      // 1. Upload image if selected
      if (selectedImage) {
        try {
          const uploadedUrl = await uploadChatImage(userId, selectedImage);
          mediaUrls.push(uploadedUrl);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          Alert.alert("Upload Error", "Failed to upload image. Post without image?");
          // Option to continue or cancel - for now, we'll cancel
          setIsPosting(false);
          return;
        }
      }

      const timestamp = new Date().toISOString();
      
      let finalContent = postContent.trim();
      if (isListingMode && listingPrice) {
        // Format: [Text] solana-action:https://seek.kikhaus.com/api/actions/buy?price=[PRICE]&title=[TITLE]&seller=[SELLER]&image=[IMAGE]
        let blinkUrl = `solana-action:${SERVER_BASE_URL}/api/actions/buy?price=${listingPrice}&title=${encodeURIComponent(listingTitle || 'Product')}&seller=${userId}`;
        
        if (isPhysical) {
          blinkUrl += `&physical=true`;
        }

        const tokenMint = TOKENS[selectedToken];
        if (tokenMint) {
          blinkUrl += `&mint=${tokenMint}`;
        }
        
        // If we have an uploaded image, include it in the Blink URL so the Action metadata uses it
        if (mediaUrls.length > 0) {
          blinkUrl += `&image=${encodeURIComponent(mediaUrls[0])}`;
        }
        
        console.log(`[CreatePost] Generated Blink URL: ${blinkUrl}`);
        finalContent = finalContent ? `${finalContent}\n\n${blinkUrl}` : blinkUrl;
      }

      // DETERMINISTIC: Keys must be in this exact order for backend verification
      const messageToSign = `{"content":"${finalContent}","timestamp":"${timestamp}"}`;
      const messageUint8 = new Uint8Array(Buffer.from(messageToSign, 'utf8'));

      console.log("[CreatePost] Requesting MWA signature for:", messageToSign);
      
      const signature = await signMessage(messageUint8);

      if (!signature) {
        console.warn("[CreatePost] No signature received.");
        setIsPosting(false);
        return;
      }

      const signatureBase64 = Buffer.from(signature).toString('base64');

      console.log("[CreatePost] Signature received, publishing...");

      const postData: CreatePostPayload = {
        author_wallet_address: userId,
        author_skr_username: username,
        content: finalContent,
        media_urls: mediaUrls,
        signature: signatureBase64,
        timestamp: timestamp,
        community_id: selectedCommunityId || undefined,
        is_public: selectedCommunityId ? isPublic : true,
        parent_id: parentId || undefined,
      };

      await dispatch(createPost(postData)).unwrap();

      Alert.alert("Success", "Hardware-signed post published!");
      setPostContent('');
      setSelectedImage(null);
      dispatch(fetchPosts({ communityId: selectedCommunityId || undefined, userId }));
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={isPosting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.postButton,
              ((!postContent.trim() && !selectedImage) || isOverLimit || isPosting) && styles.postButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={(!postContent.trim() && !selectedImage) || isOverLimit || isPosting}
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
            <IPFSAwareImage
              source={getValidImageSource(profilePicUrl || DEFAULT_IMAGES.user)}
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
                    dropdownIconColor={COLORS.white}
                  >
                    <Picker.Item label="Global Feed" value={null} />
                    {communities.map(community => (
                      <Picker.Item key={community.id} label={community.name} value={community.id} />
                    ))}
                  </Picker>
                  <Icons.ChevronDownIcon width={16} height={16} color={COLORS.greyLight} style={styles.pickerIcon} />
                </View>
              </View>

              {!!selectedCommunityId && (
                <View style={styles.announcementContainer}>
                  <Text style={styles.announcementLabel}>Public Announcement (to Town Square)</Text>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{ false: COLORS.borderDarkColor, true: COLORS.brandPrimary }}
                    thumbColor={COLORS.white}
                  />
                </View>
              )}

              <TextInput
                style={styles.textInput}
                placeholder={parentId ? `Reply to ${authorHandle}...` : "What's happening?"}
                placeholderTextColor={COLORS.gray || '#888'}
                multiline
                autoFocus
                value={postContent}
                onChangeText={setPostContent}
                selectionColor={COLORS.brandPrimary}
                editable={!isPosting}
              />

              {/* Listing Mode Toggle */}
              <View style={styles.listingToggleContainer}>
                <View style={styles.listingToggleText}>
                  <Icons.SwapIcon width={20} height={20} color={COLORS.brandPrimary} />
                  <Text style={styles.listingToggleLabel}>Product Listing Mode</Text>
                </View>
                <Switch
                  value={isListingMode}
                  onValueChange={setIsListingMode}
                  trackColor={{ false: COLORS.borderDarkColor, true: COLORS.brandPrimary }}
                  thumbColor={COLORS.white}
                />
              </View>

              {isListingMode && (
                <View style={styles.listingForm}>
                  <TextInput
                    style={styles.listingInput}
                    placeholder="Product Title (e.g. Genesis Hoodie)"
                    placeholderTextColor={COLORS.greyMid}
                    value={listingTitle}
                    onChangeText={setListingTitle}
                  />

                  {/* Physical Product Toggle */}
                  <View style={[styles.listingToggleContainer, { borderTopWidth: 0, marginTop: 0, paddingVertical: 4 }]}>
                    <View style={styles.listingToggleText}>
                      <Icons.SwapIcon width={16} height={16} color={COLORS.brandPrimary} />
                      <Text style={[styles.listingToggleLabel, { fontSize: 14, marginLeft: 6 }]}>Physical Product (Needs Shipping)</Text>
                    </View>
                    <Switch
                      value={isPhysical}
                      onValueChange={setIsPhysical}
                      trackColor={{ false: COLORS.borderDarkColor, true: COLORS.brandPrimary }}
                      thumbColor={COLORS.white}
                    />
                  </View>

                  <View style={styles.priceInputContainer}>
                    <View style={[styles.pickerWrapper, { flex: 0, width: 110, marginRight: 10 }]}>
                      <Picker
                        selectedValue={selectedToken}
                        onValueChange={(itemValue) => setSelectedToken(itemValue)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        dropdownIconColor={COLORS.white}
                      >
                        <Picker.Item label="SKR" value="SKR" />
                        <Picker.Item label="SOL" value="SOL" />
                        <Picker.Item label="USDC" value="USDC" />
                        <Picker.Item label="BONK" value="BONK" />
                      </Picker>
                      <Icons.ChevronDownIcon width={12} height={12} color={COLORS.brandPrimary} style={styles.pickerIcon} />
                    </View>
                    <TextInput
                      style={[styles.listingInput, { flex: 1 }]}
                      placeholder={`Price (e.g. ${selectedToken === 'SOL' ? '0.5' : '100'})`}
                      placeholderTextColor={COLORS.greyMid}
                      keyboardType="numeric"
                      value={listingPrice}
                      onChangeText={setListingPrice}
                    />
                  </View>
                </View>
              )}

              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                    <Icons.cross width={16} height={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Toolbar - always above keyboard */}
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.toolbarIcons}>
             <TouchableOpacity 
                style={styles.iconButton} 
                onPress={pickImage} 
                disabled={isPosting}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Icons.GalleryIcon width={28} height={28} color={COLORS.brandPrimary} />
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
  announcementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  announcementLabel: {
    color: COLORS.brandPrimary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontWeight: '600',
  },
  listingToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  listingToggleText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingToggleLabel: {
    color: COLORS.white,
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '600',
  },
  listingForm: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  listingInput: {
    color: COLORS.white,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    marginBottom: 10,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  solSymbol: {
    color: COLORS.brandPrimary,
    fontWeight: '800',
    fontSize: 16,
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
    backgroundColor: 'transparent', 
  },
  pickerItem: {
    color: COLORS.white,
    backgroundColor: COLORS.background,
    fontSize: 16,
  },
  pickerIcon: {
    position: 'absolute',
    right: 15,
    pointerEvents: 'none',
  },
  textInput: {
    fontSize: 19,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    paddingTop: 8,
    minHeight: 100,
  },
  imagePreviewContainer: {
    marginTop: 15,
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    padding: 5,
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
    color: '#FFAD1F', 
  },
  charCountError: {
    color: '#E0245E', 
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

