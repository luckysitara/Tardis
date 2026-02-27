import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  StatusBar,
  RefreshControl,
  FlatList
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchThread } from '@/shared/state/thread/reducer';
import PostComponent from '@/components/PostComponent';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThreadPost } from '@/core/thread/components/thread.types';

const ThreadDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { postId } = route.params;
  const { address: userId } = useAppSelector(state => state.auth);

  const [mainPost, setMainPost] = useState<ThreadPost | null>(null);
  const [replies, setReplies] = useState<ThreadPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThread = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await dispatch(fetchThread({ postId, userId })).unwrap();
      if (result.success) {
        setMainPost(result.post);
        setReplies(result.replies || []);
      } else {
        setError(result.error || 'Failed to load thread');
      }
    } catch (err: any) {
      console.error('[ThreadDetail] Error loading thread:', err);
      setError(err.message || 'An error occurred while loading the thread');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, userId, dispatch]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const renderHeader = () => {
    if (!mainPost) return null;
    return (
      <View>
        <PostComponent {...mainPost} isThreadView={true} />
        <View style={styles.replySeparator}>
          <Text style={styles.replyTitle}>Replies</Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: ThreadPost, index: number }) => (
    <PostComponent 
      {...item} 
      showThreadLine={index < replies.length - 1} 
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icons.ArrowLeft width={24} height={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thread</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadThread()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={replies}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadThread(true)}
              tintColor={COLORS.brandPrimary}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No replies yet.</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}
    </View>
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
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: COLORS.brandPink || '#F91880',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  replySeparator: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  replyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.greyMid,
    fontSize: 15,
  }
});

export default ThreadDetailScreen;
