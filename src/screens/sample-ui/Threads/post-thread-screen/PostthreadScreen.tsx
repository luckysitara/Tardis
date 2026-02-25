import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Platform,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Keyboard,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PostComponent from '@/components/PostComponent';
import ThreadComposer from '@/core/thread/components/thread-composer/ThreadComposer';
import { AppHeader } from '@/core/shared-ui';

import {
  ThreadPost,
  ThreadUser,
} from '@/core/thread/components/thread.types';
import { DEFAULT_IMAGES } from '@/shared/config/constants';
import EditPostModal from '@/core/thread/components/EditPostModal';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchThread } from '@/shared/state/thread/reducer';
import styles from './PostThreadScreen.style';
import COLORS from '@/assets/colors';

export default function PostThreadScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PostThread'>>();
  const navigation = useAppNavigation();
  const dispatch = useAppDispatch();
  const { postId } = route.params;
  const insets = useSafeAreaInsets();

  const commentInputRef = useRef<{ focus: () => void }>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPost, setCurrentPost] = useState<ThreadPost | null>(null);
  const [replies, setReplies] = useState<ThreadPost[]>([]);

  const [isCommentHighlighted, setIsCommentHighlighted] = useState(false);
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const composerTranslateY = useRef(new Animated.Value(0)).current;

  const [postToEdit, setPostToEdit] = useState<ThreadPost | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Build local user object
  const userWallet = useAppSelector(state => state.auth.address);
  const userName = useAppSelector(state => state.auth.username);
  const profilePicUrl = useAppSelector(state => state.auth.profilePicUrl);

  const localUser: ThreadUser = {
    id: userWallet || 'anonymous',
    username: userName || 'Anonymous',
    handle: userWallet
      ? '@' + userWallet.slice(0, 6) + '...' + userWallet.slice(-4)
      : '@anonymous',
    avatar: profilePicUrl && profilePicUrl.length > 0
      ? { uri: profilePicUrl }
      : DEFAULT_IMAGES.user,
    verified: true,
  };

  const loadThread = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await dispatch(fetchThread({ postId, userId: userWallet })).unwrap();
      setCurrentPost(result.post);
      setReplies(result.replies);
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, userWallet, dispatch]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const focusCommentInput = () => {
    if (commentInputRef.current) {
      setIsCommentHighlighted(true);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
      commentInputRef.current?.focus();
      // Simple timeout to reset highlight for visual feedback
      setTimeout(() => setIsCommentHighlighted(false), 2000);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView style={[
        styles.container,
        Platform.OS === 'android' && {
          paddingTop: insets.top,
          backgroundColor: COLORS.background,
        }
      ]}>
        <AppHeader
          title="Thread"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brandPrimary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              Platform.OS === 'ios' && keyboardVisible && { paddingBottom: keyboardHeight }
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadThread(true)} tintColor={COLORS.brandPrimary} />
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {currentPost ? (
              <View>
                {/* Main post with connector if it has replies */}
                <PostComponent 
                  {...currentPost} 
                  showThreadLine={replies.length > 0} 
                />

                {/* Replies header (if there are replies) */}
                {replies.length > 0 && (
                  <View style={styles.repliesDivider} />
                )}

                {/* Replies */}
                {replies.map((reply, index) => {
                  const isLastReply = index === replies.length - 1;
                  return (
                    <PostComponent 
                      key={reply.id} 
                      {...reply} 
                      showThreadLine={!isLastReply} 
                    />
                  );
                })}
              </View>
            ) : (
              <View style={styles.notFoundContainer}>
                <Text style={styles.notFoundText}>
                  This thread couldn't be found.{'\n'}
                  It may have been deleted or doesn't exist.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {currentPost && (
          <Animated.View
            style={[
              styles.composerContainer,
              {
                zIndex: 2,
              },
              isCommentHighlighted && styles.composerElevated,
              Platform.OS === 'android' && keyboardVisible && {
                position: 'absolute',
                bottom: keyboardHeight,
                left: 0,
                right: 0
              }
            ]}>
            <ThreadComposer
              ref={commentInputRef}
              currentUser={localUser}
              parentId={currentPost.id}
              onPostCreated={() => {
                loadThread(true);
              }}
            />
          </Animated.View>
        )}

        {postToEdit && (
          <EditPostModal
            post={postToEdit}
            isVisible={editModalVisible}
            onClose={() => setEditModalVisible(false)}
          />
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

        {currentPost && (
          <>
            {isCommentHighlighted && (
              <Animated.View
                style={[
                  styles.dimOverlay,
                  { opacity: backgroundOpacity }
                ]}
              />
            )}

            <Animated.View
              style={[
                styles.composerContainer,
                {
                  transform: [{ translateY: composerTranslateY }],
                  zIndex: 2,
                },
                isCommentHighlighted && styles.composerElevated,
                Platform.OS === 'android' && keyboardVisible && {
                  position: 'absolute',
                  bottom: keyboardHeight,
                  left: 0,
                  right: 0
                }
              ]}>
              <ThreadComposer
                ref={commentInputRef}
                currentUser={localUser}
                parentId={currentPost.id}
                onPostCreated={() => {
                  console.log('Reply created successfully');
                }}
              />
            </Animated.View>
          </>
        )}

        {postToEdit && (
          <EditPostModal
            post={postToEdit}
            isVisible={editModalVisible}
            onClose={() => setEditModalVisible(false)}
          />
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
