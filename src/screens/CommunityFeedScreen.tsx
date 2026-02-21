import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button, TouchableOpacity, SafeAreaView, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp, RouteProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { fetchPosts } from '@/shared/state/post/slice';
import { fetchChatMessages, receiveMessage } from '@/shared/state/chat/slice';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import PostComponent from '@/components/PostComponent'; 
import ChatMessage from '@/core/chat/components/message/ChatMessage';
import ChatComposer from '@/core/chat/components/chat-composer/ChatComposer';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import socketService from '@/shared/services/socketService';

type CommunityFeedScreenRouteProp = RouteProp<RootStackParamList, 'CommunityFeed'>;
type CommunityFeedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CommunityFeed'>;

const CommunityFeedScreen = () => {
  const navigation = useNavigation<CommunityFeedScreenNavigationProp>();
  const route = useRoute<CommunityFeedScreenRouteProp>();
  const { communityId, communityName } = route.params;

  const [activeTab, setActiveTab] = useState<'FEED' | 'CHAT'>('FEED');
  const dispatch = useAppDispatch();
  
  const { posts, loading: postsLoading } = useAppSelector(state => state.post);
  const { messages, loadingMessages: chatLoading } = useAppSelector(state => state.chat);
  const { address: userId, username, profilePicUrl } = useAppSelector(state => state.auth);
  
  const communityMessages = messages[communityId] || [];
  const flatListRef = useRef<FlatList>(null);

  const onListContentSizeChange = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  useEffect(() => {
    if (activeTab === 'FEED') {
      dispatch(fetchPosts({ communityId, userId }));
    } else {
      dispatch(fetchChatMessages({ chatId: communityId, resetUnread: true }));
      socketService.joinChat(communityId);
    }
  }, [dispatch, communityId, activeTab, userId]);

  const handleRefresh = () => {
    if (activeTab === 'FEED') {
      dispatch(fetchPosts({ communityId, userId }));
    } else {
      dispatch(fetchChatMessages({ chatId: communityId }));
    }
  };

  const currentUser = {
    id: userId || '',
    username: username || 'Me',
    handle: username ? `@${username.toLowerCase()}` : '@me',
    avatar: profilePicUrl || '',
    verified: true
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icons.ArrowLeftIcon width={24} height={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{communityName || 'Community'}</Text>
        {activeTab === 'FEED' ? (
          <TouchableOpacity 
            style={styles.createPostButton}
            onPress={() => navigation.navigate('CreatePost', { communityId, communityName })}
          >
            <Icons.PlusCircleIcon width={28} height={28} fill={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'FEED' && styles.activeTab]}
          onPress={() => setActiveTab('FEED')}
        >
          <Text style={[styles.tabText, activeTab === 'FEED' && styles.activeTabText]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'CHAT' && styles.activeTab]}
          onPress={() => setActiveTab('CHAT')}
        >
          <Text style={[styles.tabText, activeTab === 'CHAT' && styles.activeTabText]}>Chat</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'FEED' ? (
          postsLoading && posts.length === 0 ? (
            <ActivityIndicator size="large" color={COLORS.brandPrimary} style={{ marginTop: 50 }} />
          ) : (
            <FlashList
              data={posts}
              renderItem={({ item }) => <PostComponent {...item} />}
              keyExtractor={item => item.id}
              estimatedItemSize={200}
              onRefresh={handleRefresh}
              refreshing={postsLoading}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No posts yet.</Text>
                </View>
              )}
            />
          )
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={communityMessages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <ChatMessage
                  message={{
                    ...item,
                    user: item.sender || { id: item.sender_id, username: 'Unknown', avatar: '' }
                  } as any}
                  currentUser={currentUser}
                />
              )}
              onContentSizeChange={onListContentSizeChange}
              initialNumToRender={15}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No messages yet.</Text>
                </View>
              )}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
              <View style={styles.composerWrapper}>
                <ChatComposer
                  currentUser={currentUser}
                  chatContext={{ chatId: communityId }}
                />
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  createPostButton: {
    padding: 5,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brandPrimary,
  },
  tabText: {
    color: COLORS.greyMid,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  composerWrapper: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: '#30363D',
  },
  emptyContainer: {
    flex: 1,
    marginTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.greyMid,
  },
});

export default CommunityFeedScreen;
