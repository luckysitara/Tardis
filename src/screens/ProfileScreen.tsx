import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Image, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../shared/state/store';
import COLORS from '@/assets/colors';
import { fetchUserCommunities } from '@/shared/state/community/slice';
import { fetchBookmarkedPosts, fetchPosts } from '@/shared/state/post/slice';
import { FlashList } from '@shopify/flash-list';
import PostComponent from '@/components/PostComponent';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import Icons from '@/assets/svgs';
import TYPOGRAPHY from '@/assets/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PortfolioView from '@/core/profile/components/portfolio/PortfolioView';
import { SERVER_URL } from '@env';

const SERVER_BASE_URL = SERVER_URL || 'http://10.203.135.79:8080';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<any>();
  const authState = useSelector((state: RootState) => state.auth);
  const targetUserId = route.params?.userId || authState.address;
  const isOwnProfile = targetUserId === authState.address;

  const { username: skrUsername, profilePicUrl, description: userBio } = useSelector((state: RootState) => state.auth);
  const { userCommunities, loading: communitiesLoading } = useSelector((state: RootState) => state.community);
  const { bookmarkedPosts, posts: userPosts, loading: postsLoading } = useSelector((state: RootState) => state.post);
  
  const [activeTab, setActiveTab] = useState<'POSTS' | 'COMMUNITIES' | 'BOOKMARKS' | 'PORTFOLIO'>('POSTS');
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/follows/stats/${targetUserId}`);
      const data = await response.json();
      if (data.success) {
        setFollowStats({
          followersCount: data.followersCount,
          followingCount: data.followingCount
        });
      }

      if (!isOwnProfile && authState.address) {
        // Check if I follow them - adding a temporary endpoint for this or just fetch all followers
        // For efficiency, I'll just check against a list or a new endpoint
        const followResponse = await fetch(`${SERVER_BASE_URL}/api/follows/is-following?followerId=${authState.address}&followingId=${targetUserId}`);
        const followData = await followResponse.json();
        setIsFollowing(followData.isFollowing);
      }
    } catch (err) {
      console.error("Error fetching follow stats:", err);
    }
  };

  const handleFollow = async () => {
    if (!targetUserId || !authState.address) return;
    setIsFollowLoading(true);
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/follows/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: authState.address, followingId: targetUserId })
      });
      const data = await response.json();
      if (data.success) {
        setIsFollowing(true);
        fetchStats();
      }
    } catch (err) {
      console.error("Error following user:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!targetUserId || !authState.address) return;
    setIsFollowLoading(true);
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/follows/unfollow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: authState.address, followingId: targetUserId })
      });
      const data = await response.json();
      if (data.success) {
        setIsFollowing(false);
        fetchStats();
      }
    } catch (err) {
      console.error("Error unfollowing user:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  useEffect(() => {
    if (targetUserId) {
      dispatch(fetchUserCommunities(targetUserId));
      dispatch(fetchBookmarkedPosts(targetUserId));
      dispatch(fetchPosts({ userId: targetUserId })); // Fetch target user's posts
      
      fetchStats();
    }
  }, [dispatch, targetUserId]);

  const profileAvatar = useMemo(() => 
    profilePicUrl || `https://api.dicebear.com/7.x/initials/png?seed=${skrUsername}`,
  [profilePicUrl, skrUsername]);

  const displayHandle = useMemo(() => 
    skrUsername ? `@${skrUsername.toLowerCase()}` : '@seeker',
  [skrUsername]);

  const renderCommunityItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.communityItem}
      onPress={() => navigation.navigate('CommunityFeed', { communityId: item.id, communityName: item.name })}
    >
      <IPFSAwareImage
        source={getValidImageSource(item.avatar_url)}
        style={styles.communityAvatar}
        defaultSource={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}` }}
      />
      <View style={styles.communityInfo}>
        <Text style={styles.communityName}>{item.name}</Text>
        <Text style={styles.communityRole}>{item.creator_id === userId ? 'Founder' : 'Member'}</Text>
      </View>
      <Icons.ArrowLeftIcon width={16} height={16} color={COLORS.greyMid} style={{ transform: [{ rotate: '180deg' }] }} />
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'POSTS':
        return (
          <FlashList
            data={userPosts.filter(p => p.user.id === userId)}
            renderItem={({ item }) => <PostComponent {...item} />}
            keyExtractor={item => item.id}
            estimatedItemSize={200}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No posts yet.</Text>
              </View>
            )}
          />
        );
      case 'COMMUNITIES':
        const communities = Array.from(new Map([...userCommunities.created, ...userCommunities.joined].map(item => [item.id, item])).values());
        return (
          <FlashList
            data={communities}
            renderItem={renderCommunityItem}
            keyExtractor={item => item.id}
            estimatedItemSize={80}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No communities joined.</Text>
              </View>
            )}
          />
        );
      case 'BOOKMARKS':
        return (
          <FlashList
            data={bookmarkedPosts}
            renderItem={({ item }) => <PostComponent {...item} />}
            keyExtractor={item => item.id}
            estimatedItemSize={200}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bookmarks yet.</Text>
              </View>
            )}
          />
        );
      case 'PORTFOLIO':
        return <PortfolioView address={userId || ''} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Custom Sticky Header like X */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icons.ArrowLeftIcon width={24} height={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{skrUsername || "Profile"}</Text>
          <Text style={styles.headerSubtitle}>{userPosts.filter(p => p.user.id === userId).length} Posts</Text>
        </View>
      </View>

      <ScrollView stickyHeaderIndices={[3]} showsVerticalScrollIndicator={false}>
        {/* Cover Banner */}
        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop' }} 
            style={styles.bannerImage} 
          />
        </View>

        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              <IPFSAwareImage
                source={getValidImageSource(profileAvatar)}
                style={styles.profileAvatar}
              />
            </View>
            {isOwnProfile ? (
              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={styles.editProfileButtonText}>Edit profile</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.editProfileButton, isFollowing && styles.followingButton]}
                onPress={isFollowing ? handleUnfollow : handleFollow}
                disabled={isFollowLoading}
              >
                {isFollowLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.editProfileButtonText}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.displayName}>{skrUsername || "Seeker"}</Text>
            <Text style={styles.handle}>{displayHandle}</Text>
          </View>

          <Text style={styles.bio}>
            {userBio || "Hardware-attested Solana Seeker. Exploring the encrypted frontier of Web3 social."}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icons.SearchIcon width={14} height={14} color={COLORS.greyMid} />
              <Text style={styles.metaText}>Solana Mainnet</Text>
            </View>
            <View style={styles.metaItem}>
              <Icons.PlusCircleIcon width={14} height={14} color={COLORS.greyMid} />
              <Text style={styles.metaText}>Joined Feb 2026</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{followStats.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{followStats.followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('POSTS')}
          >
            <Text style={[styles.tabLabel, activeTab === 'POSTS' && styles.activeTabLabel]}>Posts</Text>
            {activeTab === 'POSTS' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('COMMUNITIES')}
          >
            <Text style={[styles.tabLabel, activeTab === 'COMMUNITIES' && styles.activeTabLabel]}>Communities</Text>
            {activeTab === 'COMMUNITIES' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('BOOKMARKS')}
          >
            <Text style={[styles.tabLabel, activeTab === 'BOOKMARKS' && styles.activeTabLabel]}>Bookmarks</Text>
            {activeTab === 'BOOKMARKS' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('PORTFOLIO')}
          >
            <Text style={[styles.tabLabel, activeTab === 'PORTFOLIO' && styles.activeTabLabel]}>Portfolio</Text>
            {activeTab === 'PORTFOLIO' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View style={styles.contentContainer}>
          {renderContent()}
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(12, 16, 26, 0.9)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitleContainer: {
    marginLeft: 20,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  headerSubtitle: {
    color: COLORS.greyMid,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  bannerContainer: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.darkerBackground,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileSection: {
    paddingHorizontal: 16,
    marginTop: -40,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.background,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  editProfileButton: {
    borderWidth: 1,
    borderColor: COLORS.greyMid,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  editProfileButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  followingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'transparent',
  },
  nameSection: {
    marginTop: 12,
  },
  displayName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  handle: {
    color: COLORS.greyMid,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  bio: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 12,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    color: COLORS.greyMid,
    fontSize: 14,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    marginRight: 20,
  },
  statNumber: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  statLabel: {
    color: COLORS.greyMid,
    marginLeft: 4,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabLabel: {
    color: COLORS.greyMid,
    fontSize: 15,
    fontWeight: '700',
  },
  activeTabLabel: {
    color: COLORS.white,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 4,
    width: 56,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    minHeight: 500,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  communityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  communityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  communityName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  communityRole: {
    color: COLORS.brandPrimary,
    fontSize: 13,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.greyMid,
    fontSize: 15,
    textAlign: 'center',
  }
});

export default ProfileScreen;


