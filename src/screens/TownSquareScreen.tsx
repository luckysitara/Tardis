import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import COLORS from '@/assets/colors';
import PostComponent from '../components/PostComponent';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchAllPosts } from '@/shared/state/thread/reducer';
import type { ThreadPost } from '@/core/thread/components/thread.types';
import Icons from '@/assets/svgs';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const TownSquareScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { allPosts, loading } = useAppSelector(state => state.thread);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');

  const isAndroid = Platform.OS === 'android';
  const fabBottom = isAndroid ? 80 : 100;

  useEffect(() => {
    dispatch(fetchAllPosts(undefined));
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchAllPosts(undefined));
    setRefreshing(false);
  }, [dispatch]);

  const handleCreatePost = () => {
    navigation.navigate('CreatePost', {});
  };

  const filteredPosts = useMemo(() => {
    if (!allPosts) return [];
    if (activeTab === 'FOR_YOU') return allPosts;
    // For now, "Following" is just a mock filter or could be actual following logic later
    return allPosts.filter((_, index) => index % 2 === 0);
  }, [allPosts, activeTab]);

  const renderItem = ({ item }: { item: ThreadPost }) => (
    <PostComponent {...item} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.tabHeader}>
          <TouchableOpacity 
            style={styles.tabButton} 
            onPress={() => setActiveTab('FOR_YOU')}
          >
            <Text style={[styles.tabText, activeTab === 'FOR_YOU' && styles.activeTabText]}>For You</Text>
            {activeTab === 'FOR_YOU' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabButton} 
            onPress={() => setActiveTab('FOLLOWING')}
          >
            <Text style={[styles.tabText, activeTab === 'FOLLOWING' && styles.activeTabText]}>Following</Text>
            {activeTab === 'FOLLOWING' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          <FlashList
            data={filteredPosts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            estimatedItemSize={200}
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
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>The square is empty...</Text>
                  <Text style={styles.emptySubtext}>Be the first to transmit a message to the timeline.</Text>
                </View>
              ) : null
            }
          />
        </View>
      </SafeAreaView>

      {/* Floating Action Button for Posting - Outside SafeArea for stable positioning */}
      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={handleCreatePost}
        activeOpacity={0.85}>
        <Icons.PlusCircleIcon width={32} height={32} fill={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: COLORS.background,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.greyMid,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 60,
    height: 4,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 2,
  },
  flashListContentContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 150, // Increased from 100 to ensure scrolling past the absolute tab bar
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.greyMid,
    textAlign: 'center',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    zIndex: 9999,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default TownSquareScreen;
