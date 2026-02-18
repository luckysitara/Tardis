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
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { RootState } from '@/shared/state/store';
import { createRootPostAsync } from '@/shared/state/thread/reducer';
import { ThreadSection } from '@/core/thread/components/thread.types';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';

const CreatePostScreen = ({ navigation }) => {
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const insets = useSafeAreaInsets();
  
  const dispatch = useAppDispatch();
  const userId = useSelector((state: RootState) => state.auth.address);

  // ... (rest of the logic remains the same)

  const handlePost = async () => {
    if (!postContent.trim()) return;
    
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to post.");
      return;
    }

    setIsPosting(true);
    try {
      const sections: ThreadSection[] = [
        {
          id: null,
          type: 'TEXT_ONLY',
          text: postContent.trim(),
        }
      ];

      // Dispatch the action to create a post
      // In a real MWA app, we might trigger signing here before sending to backend
      const resultAction = await dispatch(createRootPostAsync({
        userId: userId,
        sections: sections,
      }));

      if (createRootPostAsync.fulfilled.match(resultAction)) {
        setPostContent('');
        navigation.goBack();
      } else {
        const error = resultAction.payload as string || 'Failed to publish post';
        Alert.alert("Error", error);
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
             {/* Add more icons as needed */}
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
