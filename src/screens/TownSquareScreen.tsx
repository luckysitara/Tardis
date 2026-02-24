import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, SafeAreaView, Dimensions, Platform, StatusBar } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import COLORS from '@/assets/colors';
import PostComponent from '../components/PostComponent';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchAllPosts } from '@/shared/state/thread/reducer';
import { fetchFollowing } from '@/shared/state/follow/slice';
import type { ThreadPost } from '@/core/thread/components/thread.types';
import Icons from '@/assets/svgs';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';

const { width } = Dimensions.get('window');

const TownSquareScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { allPosts, loading } = useAppSelector(state => state.thread);
  const { profilePicUrl, username, address: userId } = useAppSelector(state => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');

  const isAndroid = Platform.OS === 'android';
  const fabBottom = isAndroid ? 80 : 100;

  useEffect(() => {
    dispatch(fetchAllPosts({ userId, followingOnly: activeTab === 'FOLLOWING' }));
    if (userId) {
      dispatch(fetchFollowing(userId));
    }
  }, [dispatch, userId, activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchAllPosts({ userId, followingOnly: activeTab === 'FOLLOWING' }));
    setRefreshing(false);
  }, [dispatch, userId, activeTab]);

  const handleCreatePost = () => {
    navigation.navigate('CreatePost', {});
  };

  const renderItem = ({ item }: { item: ThreadPost }) => (
    <PostComponent {...item} />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* X-style Top Header */}
      <View style={[styles.topHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          style={styles.headerAvatarWrapper}
          onPress={() => navigation.navigate('Seeker')}
        >
          <IPFSAwareImage
            source={getValidImageSource(profilePicUrl || `https://api.dicebear.com/7.x/initials/png?seed=${username}`)}
            style={styles.headerAvatar}
          />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>TARDIS</Text>
        </View>

        <TouchableOpacity style={styles.headerIconButton}>
          <Icons.Settings width={22} height={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabHeader}>
        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => setActiveTab('FOR_YOU')}
        >
          <View style={styles.tabTextWrapper}>
            <Text style={[styles.tabText, activeTab === 'FOR_YOU' && styles.activeTabText]}>For You</Text>
            {activeTab === 'FOR_YOU' && <View style={styles.activeIndicator} />}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => setActiveTab('FOLLOWING')}
        >
          <View style={styles.tabTextWrapper}>
            <Text style={[styles.tabText, activeTab === 'FOLLOWING' && styles.activeTabText]}>Following</Text>
            {activeTab === 'FOLLOWING' && <View style={styles.activeIndicator} />}
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <FlashList
          data={allPosts}
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

      {/* Floating Action Button for Posting */}
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: COLORS.background,
  },
  headerAvatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.darkerBackground,
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerIconButton: {
    padding: 4,
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
    paddingVertical: 12,
  },
  tabTextWrapper: {
    position: 'relative',
    paddingVertical: 4,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.greyMid,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -12,
    width: 40,
    height: 4,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 2,
  },
  flashListContentContainer: {
    paddingTop: 0,
    paddingBottom: 150, 
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
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
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

