// File: src/components/Profile/ProfileView.tsx
import React, { useMemo, memo, useEffect, useCallback } from 'react';
import { View, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import UserProfileInfo from './profile-info/UserProfileInfo';
import ProfileTabs from './profile-tabs/ProfileTabs';

import { styles as profileStyles } from './profile.style';
import COLORS from '../../../assets/colors';
import { ExtendedProfileViewProps, WalletAction } from '../types/index';

// Pure component that only renders when props actually change
const ProfileInfoMemo = memo(UserProfileInfo);
const ProfileTabsMemo = memo(ProfileTabs);

/**
 * ProfileView - Main profile view container that displays:
 * 1. UserProfileInfo (avatar, name, bio, stats)
 * 2. ProfileTabs (content tabs for posts, portfolio, actions)
 */
function ProfileViewComponent({
  isOwnProfile,
  user,

  onAvatarPress,
  onEditProfile,
  onShareProfile,
  amIFollowing,
  areTheyFollowingMe,
  onFollowPress,
  onUnfollowPress,
  followersCount,
  followingCount,
  onPressFollowers,
  onPressFollowing,

  containerStyle,
  myActions,
  loadingActions,
  fetchActionsError,
  // Removed portfolioData, onRefreshPortfolio, refreshingPortfolio, onAssetPress
  isLoading = false,
  onLogout,
}: ExtendedProfileViewProps) {
  // Add logging for component rendering
  useEffect(() => {
    console.log('[ProfileView] Component rendered, isOwnProfile:', isOwnProfile);
    return () => {
      console.log('[ProfileView] Component unmounting');
    };
  }, [isOwnProfile]);

  // Log avatar press interaction
  const handleAvatarPress = useCallback(() => {
    console.log('[ProfileView] Avatar press detected, forwarding to parent');
    if (onAvatarPress) onAvatarPress();
  }, [onAvatarPress]);

  // Log edit profile interaction
  const handleEditProfile = useCallback(() => {
    console.log('[ProfileView] Edit profile detected, forwarding to parent');
    if (onEditProfile) onEditProfile();
  }, [onEditProfile]);

  // Ensure attachmentData is always defined
  const attachmentData = useMemo(() => user.attachmentData || {}, [user.attachmentData]);

  // Memoize props for the UserProfileInfo component to prevent re-renders
  const profileInfoProps = useMemo(() => ({
    profilePicUrl: user.profilePicUrl || '',
    username: user.username || '',
    userWallet: user.address,
    bioText: user.description || undefined,
    isOwnProfile,
    onAvatarPress: handleAvatarPress,
    onEditProfile: handleEditProfile,
    onShareProfile,
    onLogout,
    amIFollowing,
    areTheyFollowingMe,
    onFollowPress,
    onUnfollowPress,
    followersCount,
    followingCount,
    onPressFollowers,
    onPressFollowing,
    attachmentData,
  }), [
    user.profilePicUrl,
    user.username,
    user.address,
    user.description,
    isOwnProfile,
    attachmentData,
    // Social-related dependencies grouped together
    amIFollowing,
    areTheyFollowingMe,
    followersCount,
    followingCount,
    // Callback dependencies
    handleAvatarPress,
    handleEditProfile,
    onShareProfile,
    onLogout,
    onFollowPress,
    onUnfollowPress,
    onPressFollowers,
    onPressFollowing,
  ]);

  // Memoize props for ProfileTabs to prevent unnecessary re-renders
  const profileTabsProps = useMemo(() => ({
    myActions: myActions as WalletAction[],
    loadingActions,
    fetchActionsError,
    // Removed portfolioData, onRefreshPortfolio, refreshingPortfolio, onAssetPress
  }), [
    // Content-related dependencies grouped together
    myActions,
    // Loading states grouped together
    loadingActions,
    // Error states
    fetchActionsError,
    // Removed callback dependencies
  ]);

  // Memoize container style to prevent re-renders
  const containerStyleMemo = useMemo(() => [
    profileStyles.container,
    containerStyle
  ], [containerStyle]);

  // Show loading spinner when data is still being fetched
  if (isLoading) {
    return (
      <View style={[containerStyleMemo, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.brandPrimary} />
      </View>
    );
  }

  // Instead of re-rendering everything, use a stable layout structure
  return (
    <View style={containerStyleMemo}>
      <ProfileInfoMemo {...profileInfoProps} />
      <View style={{ flex: 1 }}>
        {!isLoading && <ProfileTabsMemo {...profileTabsProps} />}
      </View>
    </View>
  );
}

/**
 * Custom comparison function to prevent unnecessary re-renders
 */
function arePropsEqual(prev: ExtendedProfileViewProps, next: ExtendedProfileViewProps) {
  // Loading state comparison
  if (prev.isLoading !== next.isLoading) return false;

  // User data comparison - check by reference first
  if (prev.user !== next.user) {
    if (prev.user.address !== next.user.address) return false;
    if (prev.user.profilePicUrl !== next.user.profilePicUrl) return false;
    if (prev.user.username !== next.user.username) return false;
    if (prev.user.description !== next.user.description) return false;
  }

  if (prev.isOwnProfile !== next.isOwnProfile) return false;

  // Deep compare attachmentData.coin if it exists, only if references differ
  if (prev.user.attachmentData !== next.user.attachmentData) {
    const prevCoin = prev.user.attachmentData?.coin;
    const nextCoin = next.user.attachmentData?.coin;

    // If one is undefined and the other isn't
    if (!!prevCoin !== !!nextCoin) return false;

    // If both exist, compare key properties
    if (prevCoin && nextCoin) {
      if (prevCoin.mint !== nextCoin.mint) return false;
      if (prevCoin.symbol !== nextCoin.symbol) return false;
      if (prevCoin.name !== nextCoin.name) return false;
      if (prevCoin.image !== nextCoin.image) return false;
    }
  }

  // Reference comparisons for arrays
  if (prev.myActions !== next.myActions) return false;
  // Removed portfolioData comparison
  // if (prev.portfolioData !== next.portfolioData) return false;

  // Loading states comparison
  if (prev.loadingActions !== next.loadingActions) return false;
  if (prev.fetchActionsError !== next.fetchActionsError) return false;
  // Removed refreshingPortfolio comparison
  // if (prev.refreshingPortfolio !== next.refreshingPortfolio) return false;

  // Social state comparison
  if (prev.amIFollowing !== next.amIFollowing) return false;
  if (prev.areTheyFollowingMe !== next.areTheyFollowingMe) return false;
  if (prev.followersCount !== next.followersCount) return false;
  if (prev.followingCount !== next.followingCount) return false;

  // Callbacks comparison (references only)
  // Removed onRefreshPortfolio and onAssetPress comparison
  // if (prev.onRefreshPortfolio !== next.onRefreshPortfolio) return false;
  // if (prev.onAssetPress !== next.onAssetPress) return false;
  if (prev.onAvatarPress !== next.onAvatarPress) return false;
  if (prev.onEditProfile !== next.onEditProfile) return false;
  if (prev.onShareProfile !== next.onShareProfile) return false;
  if (prev.onFollowPress !== next.onFollowPress) return false;
  if (prev.onUnfollowPress !== next.onUnfollowPress) return false;
  if (prev.onPressFollowers !== next.onPressFollowers) return false;
  if (prev.onPressFollowing !== next.onPressFollowing) return false;

  // Style comparison
  if (prev.containerStyle !== next.containerStyle) return false;

  return true;
}

export default React.memo(ProfileViewComponent, arePropsEqual);