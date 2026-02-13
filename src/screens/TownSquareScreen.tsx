// src/screens/TownSquareScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { fetchPosts } from '@/shared/state/socialFeed/slice';
import { Post } from '@/shared/types/socialFeed.types';
import PostItem from '@/components/socialFeed/PostItem'; // Placeholder for PostItem component
import CreatePost from '@/components/socialFeed/CreatePost'; // Placeholder for CreatePost component
import { Colors } from '@/styles/theme'; // Assuming Colors are defined here
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';

const TownSquareScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { posts, loading, error } = useAppSelector(state => state.socialFeed);
  const navigation = useAppNavigation(); // Assuming navigation is available

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const renderPost = ({ item }: { item: Post }) => (
    <PostItem post={item} />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Town Square</Text>
        {/* Placeholder for a button to navigate to CreatePostScreen or open a modal */}
        <TouchableOpacity onPress={() => navigation.navigate('CreatePostModal' as never)} style={styles.createPostButton}>
          <Text style={styles.createPostButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        {loading === 'pending' && <ActivityIndicator size="large" color={Colors.sonicCyan} style={styles.loadingIndicator} />}
        {error && <Text style={styles.errorText}>Error: {error}</Text>}
        {loading === 'succeeded' && posts.length === 0 && (
          <Text style={styles.emptyFeedText}>No posts yet. Be the first to share!</Text>
        )}
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          // Note: FlashList should be considered for better performance in large feeds.
          // Requires installation: `pnpm add @shopify/flash-list`
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.deepSpace,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.deepSpace,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray + '30', // Semi-transparent gray
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.sonicCyan,
  },
  createPostButton: {
    backgroundColor: Colors.tardisBlue,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostButtonText: {
    color: Colors.white,
    fontSize: 24,
    lineHeight: 24, // Adjust line height to center '+'
  },
  loadingIndicator: {
    marginTop: 20,
  },
  errorText: {
    color: Colors.white,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyFeedText: {
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20, // Add some padding at the bottom of the list
  },
});

export default TownSquareScreen;
