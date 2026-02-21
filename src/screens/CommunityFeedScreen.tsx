import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp, RouteProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { fetchPosts } from '@/shared/state/post/slice';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import PostComponent from '@/components/PostComponent'; // Assuming PostComponent displays a single post
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';

type CommunityFeedScreenRouteProp = RouteProp<RootStackParamList, 'CommunityFeed'>;
type CommunityFeedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CommunityFeed'>;

const CommunityFeedScreen = () => {
  const navigation = useNavigation<CommunityFeedScreenNavigationProp>();
  const route = useRoute<CommunityFeedScreenRouteProp>();
  const { communityId, communityName } = route.params;

  const dispatch = useAppDispatch();
  const { posts, loading, error } = useAppSelector(state => state.post);

  useEffect(() => {
    dispatch(fetchPosts({ communityId }));
  }, [dispatch, communityId]);

  const handleRefresh = () => {
    dispatch(fetchPosts({ communityId }));
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.brandPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title="Retry" onPress={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icons.ArrowLeftIcon width={24} height={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{communityName || 'Community Feed'}</Text>
        <TouchableOpacity 
          style={styles.createPostButton}
          onPress={() => navigation.navigate('CreatePost', { communityId, communityName })}
        >
          <Icons.PlusCircleIcon width={28} height={28} fill={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlashList
        data={posts}
        renderItem={({ item }) => <PostComponent post={item} />}
        keyExtractor={item => item.id}
        estimatedItemSize={200} // Estimate size for better performance
        onRefresh={handleRefresh}
        refreshing={loading}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts in this community yet.</Text>
            <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: -38, // Adjust to center title when back button is present
  },
  createPostButton: {
    padding: 5,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    marginTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.greyMid,
    textAlign: 'center',
  },
});

export default CommunityFeedScreen;
