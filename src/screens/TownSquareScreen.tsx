import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import COLORS from '@/assets/colors';
import PostComponent from '../components/PostComponent';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchAllPosts } from '@/shared/state/thread/reducer';
import type { ThreadPost } from '@/core/thread/components/thread.types';

const TownSquareScreen = () => {
  const dispatch = useAppDispatch();
  const { allPosts, loading } = useAppSelector(state => state.thread);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchAllPosts(undefined));
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchAllPosts(undefined));
    setRefreshing(false);
  }, [dispatch]);

  const renderItem = ({ item }: { item: ThreadPost }) => (
    <PostComponent {...item} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Town Square</Text>
      <FlashList
        data={allPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={150}
        contentContainerStyle={styles.flashListContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (loading && allPosts.length === 0)}
            onRefresh={onRefresh}
            tintColor={COLORS.brandPrimary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No posts yet. Be the first to post!</Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  flashListContentContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  emptyText: {
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  }
});

export default TownSquareScreen;

