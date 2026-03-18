import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Image, StatusBar, Alert, ActionSheetIOS, Platform } from 'react-native';
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
import LendingView from '@/core/profile/components/lending/LendingView';
import { SERVER_BASE_URL } from '@/shared/config/server';
import { logoutSuccess } from '@/shared/state/auth/reducer';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<any>();
  const authState = useSelector((state: RootState) => state.auth);
  
  // Safety check for authState
  if (!authState) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.brandPrimary} />
      </View>
    );
  }

  const targetUserId = route.params?.userId || authState.address;
  const isOwnProfile = targetUserId === authState.address;

  const { username: skrUsername, displayName, profilePicUrl, description: userBio, isHardwareVerified } = authState;
  
  const handleLogout = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Logout'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: 'Account Settings',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            dispatch(logoutSuccess());
          }
        }
      );
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Logout", 
            style: "destructive",
            onPress: () => {
              dispatch(logoutSuccess());
            }
          }
        ]
      );
    }
  };
  const { userCommunities, loading: communitiesLoading } = useSelector((state: RootState) => state.community);
  const { bookmarkedPosts, posts: userPosts, loading: postsLoading } = useSelector((state: RootState) => state.post);
  
  const [activeTab, setActiveTab] = useState<'POSTS' | 'COMMUNITIES' | 'BOOKMARKS' | 'PORTFOLIO' | 'LENDING' | 'COMMERCE'>('POSTS');
  const [commerceTab, setCommerceTab] = useState<'LISTINGS' | 'PURCHASES'>('LISTINGS');
  const [commerceData, setCommerceData] = useState({ listings: [], purchases: [] });
  const [isCommerceLoading, setIsCommerceLoading] = useState(false);
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Local state for other user's profile
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);

  const displayUser = isOwnProfile ? {
    username: skrUsername,
    displayName,
    profilePicUrl,
    description: userBio,
    isHardwareVerified,
    attachmentData: authState.attachmentData
  } : otherUserProfile || {};

  const fetchCommerceData = async () => {
    try {
      setIsCommerceLoading(true);
      console.log(`[ProfileScreen] Fetching commerce data for userId: ${targetUserId}`);
      const response = await fetch(`${SERVER_BASE_URL}/api/actions/commerce/${targetUserId}`);
      const data = await response.json();
      console.log(`[ProfileScreen] Raw commerce data received:`, JSON.stringify(data, null, 2));
      if (data.success) {
        setCommerceData({
          listings: data.listings,
          purchases: data.purchases
        });
      }
    } catch (err) {
      console.error("Error fetching commerce data:", err);
    } finally {
      setIsCommerceLoading(false);
    }
  };

  const fetchOtherUserProfile = async () => {
    if (isOwnProfile) return;
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/profile?userId=${targetUserId}`);
      const data = await response.json();
      if (data.success) {
        setOtherUserProfile({
          username: data.username,
          displayName: data.display_name,
          profilePicUrl: data.url,
          description: data.description,
          isHardwareVerified: data.isHardwareVerified,
          attachmentData: data.attachmentData
        });
      }
    } catch (err) {
      console.error("Error fetching other user profile:", err);
    }
  };

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
      fetchOtherUserProfile();
      fetchCommerceData();
    }
  }, [dispatch, targetUserId]);

  const profileAvatar = useMemo(() => 
    displayUser.profilePicUrl || `https://api.dicebear.com/7.x/initials/png?seed=${displayUser.username || targetUserId}`,
  [displayUser.profilePicUrl, displayUser.username, targetUserId]);

  const displayHandle = useMemo(() => {
    const username = displayUser.username || targetUserId;
    if (!username) return '@seeker';
    // If it already starts with @, use it, otherwise add it.
    // We strictly use the raw skrUsername to ensure .skr is visible.
    return username.startsWith('@') ? username : `@${username}`;
  }, [displayUser.username, targetUserId]);

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
        <Text style={styles.communityRole}>{item.creator_id === targetUserId ? 'Founder' : 'Member'}</Text>
      </View>
      <Icons.ArrowLeftIcon width={16} height={16} color={COLORS.greyMid} style={{ transform: [{ rotate: '180deg' }] }} />
    </TouchableOpacity>
  );

  const renderProfileHeader = () => (
    <View>
      {/* Cover Banner */}
      <View style={styles.bannerContainer}>
        <IPFSAwareImage
          source={getValidImageSource(authState.attachmentData?.coverImage)}
          defaultSource={{ uri: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop' }}
          style={styles.bannerImage}
          resizeMode="cover"
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.displayName}>{displayUser.displayName || displayUser.username || "Seeker"}</Text>
            {displayUser.isHardwareVerified && (
              <Icons.Shield width={16} height={16} color={COLORS.brandPrimary} style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={styles.handle}>{displayHandle}</Text>
        </View>

        <Text style={styles.bio}>
          {displayUser.description || "Hardware-attested Solana Seeker. Exploring the encrypted frontier of Web3 social."}
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

        <TouchableOpacity 
          style={styles.tab} 
          onPress={() => setActiveTab('LENDING')}
        >
          <Text style={[styles.tabLabel, activeTab === 'LENDING' && styles.activeTabLabel]}>P2P</Text>
          {activeTab === 'LENDING' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tab} 
          onPress={() => setActiveTab('COMMERCE')}
        >
          <Text style={[styles.tabLabel, activeTab === 'COMMERCE' && styles.activeTabLabel]}>Shop</Text>
          {activeTab === 'COMMERCE' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCommerceHeader = () => (
    <View>
      {renderProfileHeader()}
      <View style={styles.commerceTabsContainer}>
        <TouchableOpacity 
          style={[styles.commerceTab, commerceTab === 'LISTINGS' && styles.activeCommerceTab]} 
          onPress={() => setCommerceTab('LISTINGS')}
        >
          <Text style={[styles.commerceTabText, commerceTab === 'LISTINGS' && styles.activeCommerceTabText]}>My Listings</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.commerceTab, commerceTab === 'PURCHASES' && styles.activeCommerceTab]} 
          onPress={() => setCommerceTab('PURCHASES')}
        >
          <Text style={[styles.commerceTabText, commerceTab === 'PURCHASES' && styles.activeCommerceTabText]}>My Purchases</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCommerceContent = () => {
    return (
      <View style={{ flex: 1 }}>
        {isCommerceLoading ? (
          <View style={{ flex: 1 }}>
            {renderProfileHeader()}
            <ActivityIndicator size="small" color={COLORS.brandPrimary} style={{ marginTop: 20 }} />
          </View>
        ) : (
          <FlashList
            data={commerceTab === 'LISTINGS' ? commerceData.listings : commerceData.purchases}
            renderItem={({ item }) => (
              <View style={styles.commerceItem}>
                <View style={styles.commerceItemIcon}>
                  {item.type === 'listing' ? (
                    item.image ? (
                      <Image source={{ uri: item.image }} style={styles.productThumbnail} />
                    ) : (
                      <Icons.SwapIcon width={24} height={24} color={COLORS.brandPrimary} />
                    )
                  ) : (
                    <Icons.WalletIcon width={24} height={24} color={COLORS.brandPrimary} />
                  )}
                </View>
                <View style={styles.commerceItemDetails}>
                  <Text style={styles.productTitle}>{item.title}</Text>
                  <Text style={styles.productMeta}>
                    {item.type === 'listing' ? `${item.price} SOL/Tokens` : `Paid ${item.price} SOL/Tokens`}
                  </Text>
                  <Text style={styles.productDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewProductButton}
                  onPress={() => {
                    if (item.type === 'listing' && item.id) {
                      navigation.navigate('ThreadDetailScreen', { postId: item.id });
                    } else if (item.signature) {
                      Alert.alert("Transaction", `Signature: ${item.signature}`);
                    }
                  }}
                >
                  <Text style={styles.viewProductText}>{item.type === 'listing' ? 'View' : 'Tx'}</Text>
                </TouchableOpacity>
              </View>
            )}
            estimatedItemSize={80}
            keyExtractor={(item, index) => (item.id || index).toString()}
            ListHeaderComponent={renderCommerceHeader}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {commerceTab === 'LISTINGS' ? 'No active listings.' : 'No purchases yet.'}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (!targetUserId) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        </View>
      );
    }

    switch (activeTab) {
      case 'POSTS':
        return (
          <FlashList
            data={userPosts.filter(p => p.user.id === targetUserId)}
            renderItem={({ item }) => <PostComponent {...item} />}
            keyExtractor={item => item.id}
            estimatedItemSize={200}
            ListHeaderComponent={renderProfileHeader}
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
            ListHeaderComponent={renderProfileHeader}
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
            ListHeaderComponent={renderProfileHeader}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bookmarks yet.</Text>
              </View>
            )}
          />
        );
      case 'PORTFOLIO':
        return <PortfolioView address={targetUserId} ListHeaderComponent={renderProfileHeader} />;
      case 'LENDING':
        return <LendingView address={targetUserId} ListHeaderComponent={renderProfileHeader} />;
      case 'COMMERCE':
        return renderCommerceContent();
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{displayUser.displayName || displayUser.username || "Profile"}</Text>
            {displayUser.isHardwareVerified && (
              <Icons.Shield width={14} height={14} color={COLORS.brandPrimary} style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={styles.headerSubtitle}>{userPosts.filter(p => p.user.id === (targetUserId || authState.address)).length} Posts</Text>
        </View>
        <View style={{ flex: 1 }} />
        {isOwnProfile && (
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Icons.Settings width={24} height={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
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
  logoutButton: {
    padding: 8,
    marginRight: -8,
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
  },
  commerceTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
  commerceTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeCommerceTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  commerceTabText: {
    color: COLORS.greyMid,
    fontWeight: '700',
    fontSize: 14,
  },
  activeCommerceTabText: {
    color: COLORS.brandPrimary,
  },
  commerceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  commerceItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(50, 212, 222, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  productThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  commerceItemDetails: {
    flex: 1,
  },
  productTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productMeta: {
    color: COLORS.brandPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  productDate: {
    color: COLORS.greyMid,
    fontSize: 12,
  },
  viewProductButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  viewProductText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProfileScreen;


