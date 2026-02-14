import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import {
  Image,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { findMentioned } from '@/shared/utils/common/findMentioned';
import TransferBalanceButton from '../transfer-balance-button/transferBalanceButton';
// Removed: import BuyCard from '../buy-card/buyCard';
import ProfileIcons from '../../../../assets/svgs/index';
import { styles } from './UserProfileInfo.style';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import {
  attachCoinToProfile,
  removeAttachedCoin,
} from '@/shared/state/auth/reducer';
import { tokenModalStyles } from './profileInfoTokenModal.style';
import COLORS from '../../../../assets/colors';
import TYPOGRAPHY from '../../../../assets/typography';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
// Removed: import { AutoAvatar } from '@/shared/components/AutoAvatar'; // This component was removed.
import { UserProfileInfoProps } from '../../types/index';
// Using require as a fallback strategy for component import issues
const ProfileEditDrawerComponent = require('../profile-edit-drawer/ProfileEditDrawer').default;
import { useAuth } from '@/modules/wallet-providers/hooks/useAuth';

/**
 * Generate initials from the username
 */
function getInitials(username: string): string {
  if (!username) return '?';

  // If username already appears to be wallet-derived (6 chars), use first 2 chars
  if (username.length === 6 && /^[a-zA-Z0-9]+$/.test(username)) {
    return username.substring(0, 2).toUpperCase();
  }

  // Otherwise get initials from words
  const words = username.split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * InitialsProfilePic - Component for displaying initials as a profile picture
 */
const InitialsProfilePic = memo(({ initials, size = 80 }: { initials: string, size?: number }) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.brandBlue,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: COLORS.white,
          fontSize: size / 3,
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        {initials}
      </Text>
    </View>
  );
});

/**
 * TokenAttachModal - Component for the token attachment modal
 * This modal should be removed too, but will be handled in a separate pass.
 */
const TokenAttachModal = memo(({
  visible,
  onClose,
  onConfirm,
  tokenDescription,
  onChangeDescription,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenDescription: string;
  onChangeDescription: (text: string) => void;
}) => {
  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <View style={tokenModalStyles.overlay}>
        <View style={tokenModalStyles.container}>
          <View style={tokenModalStyles.headerRow}>
            <Text style={tokenModalStyles.headerTitle}>Token Details</Text>
            <TouchableOpacity
              style={tokenModalStyles.closeButton}
              onPress={onClose}>
              <Text style={tokenModalStyles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginVertical: 8 }}>
            <Text style={tokenModalStyles.descriptionLabel}>
              Description:
            </Text>
            <TextInput
              style={tokenModalStyles.descriptionInput}
              placeholder="Write a short token description"
              placeholderTextColor={COLORS.greyMid}
              value={tokenDescription}
              onChangeText={onChangeDescription}
              multiline
            />
          </View>

          <View style={tokenModalStyles.actionButtonContainer}>
            <TouchableOpacity
              style={[tokenModalStyles.actionButton, tokenModalStyles.cancelButton]}
              onPress={onClose}>
              <Text style={tokenModalStyles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tokenModalStyles.actionButton, tokenModalStyles.saveButton]}
              onPress={onConfirm}>
              <Text style={tokenModalStyles.actionButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

/**
 * Bio section with memoized content
 */
const BioSection = memo(({ bioText }: { bioText: string }) => (
  <View style={{ marginTop: 8 }}>
    <Text style={styles.bioSection}>{findMentioned(bioText)}</Text>
  </View>
));

/**
 * Stats section with memoized content
 */
const StatsSection = memo(({
  followersCount,
  followingCount,
  onPressFollowers,
  onPressFollowing,
}: {
  followersCount: number;
  followingCount: number;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}) => (
  <View style={styles.statsContainer}>
    <TouchableOpacity
      style={styles.statItem}
      onPress={onPressFollowers}>
      <Text style={styles.statCount}>
        {followersCount}
      </Text>
      <Text style={styles.statLabel}>
        Followers
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.statItem}
      onPress={onPressFollowing}>
      <Text style={styles.statCount}>
        {followingCount}
      </Text>
      <Text style={styles.statLabel}>
        Following
      </Text>
    </TouchableOpacity>
  </View>
));

/**
 * Edit Profile Button with memoized content
 */
const EditButton = memo(({ onPress, onTransferBalance, onLogout }: { onPress?: () => void; onTransferBalance?: () => void; onLogout?: () => void }) => (
  <View style={{ marginTop: 8, width: '100%', flexDirection: 'column', gap: 12 }}>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <TouchableOpacity
        style={[styles.editProfileBtn, { flex: 1 }]}
        onPress={onPress}>
        <Text style={styles.editProfileBtnText}>Edit Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.editProfileBtn, { flex: 1 }]}
        onPress={onTransferBalance}>
        <Text style={styles.editProfileBtnText}>Transfer Balance</Text>
      </TouchableOpacity>
    </View>

    {/* {onLogout && (
      <TouchableOpacity
        style={[styles.editProfileBtn, { backgroundColor: COLORS.errorRed }]}
        onPress={onLogout}>
        <Text style={[styles.editProfileBtnText, { color: COLORS.white }]}>Logout</Text>
      </TouchableOpacity>
    )} */}
  </View>
));

// Removed: TokenCard component

/**
 * Follow button section with memoized content
 */
const FollowButton = memo(({
  amIFollowing,
  areTheyFollowingMe,
  onPressFollow,
  onPressUnfollow,
  recipientAddress
}: {
  amIFollowing?: boolean;
  areTheyFollowingMe?: boolean;
  onPressFollow?: () => void;
  onPressUnfollow?: () => void;
  recipientAddress: string;
}) => (
  <View style={{ marginTop: 12 }}>
    <TransferBalanceButton
      amIFollowing={!!amIFollowing}
      areTheyFollowingMe={!!areTheyFollowingMe}
      onPressFollow={onPressFollow || (() => { })}
      onPressUnfollow={onPressUnfollow || (() => { })}
      recipientAddress={recipientAddress}
    />
  </View>
));

/**
 * ProfileHeader - Component for the profile header with avatar, name, and badges
 */
const ProfileHeader = memo(({
  profilePicUrl,
  username,
  handleString,
  showFollowsYou,
  isOwnProfile,
  onAvatarPress,
  userWallet,
}: {
  profilePicUrl: string;
  username: string;
  handleString: string;
  showFollowsYou: boolean;
  isOwnProfile: boolean;
  onAvatarPress?: () => void;
  userWallet?: string;
}) => {
  console.log('[ProfileHeader] profilePicUrl:', profilePicUrl);

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <TouchableOpacity
        style={[styles.profImgContainer, { backgroundColor: COLORS.background }]}
        onPress={onAvatarPress}
        disabled={!isOwnProfile}>
        {profilePicUrl ? (
            <Image
                source={getValidImageSource(profilePicUrl)}
                style={styles.profImg}
                defaultSource={require('@/assets/images/User.png')}
            />
        ) : (
            <InitialsProfilePic initials={getInitials(username)} size={72} />
        )}
      </TouchableOpacity>

      <View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Text style={styles.username}>
            {username}
          </Text>
          <ProfileIcons.SubscriptionTick />
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Text style={styles.handleText}>
            {handleString}
          </Text>
          {showFollowsYou && (
            <Text style={styles.followsBadge}>
              Follows you
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

/**
 * UserProfileInfo - The main profile info component showing:
 * - Avatar, name, handle, bio
 * - Follower/following stats
 * - Edit/Follow button row
 */
function UserProfileInfo({
  profilePicUrl,
  username,
  userWallet,
  isOwnProfile,
  onAvatarPress,
  onEditProfile,
  onShareProfile,
  bioText,
  amIFollowing = false,
  areTheyFollowingMe = false,
  onFollowPress,
  onUnfollowPress,
  followersCount = 0,
  followingCount = 0,
  onPressFollowers,
  onPressFollowing,
  // Removed: attachmentData = {}, // No longer needed as TokenCard is gone
}: UserProfileInfoProps) {
  const dispatch = useAppDispatch();
  const { logout } = useAuth();

  // Local state to handle updates
  const [localProfilePic, setLocalProfilePic] = useState(profilePicUrl);
  const [localUsername, setLocalUsername] = useState(username);
  const [localBioText, setLocalBioText] = useState(bioText);

  // Transfer balance state
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setLocalProfilePic(profilePicUrl);
    setLocalUsername(username);
    setLocalBioText(bioText);
  }, [profilePicUrl, username, bioText]);

  // Format wallet address as a handle
  const handleString = useMemo(() =>
    userWallet
      ? '@' + userWallet.slice(0, 6) + '...' + userWallet.slice(-4)
      : '@no_wallet',
    [userWallet]
  );

  // Default bio with username if none provided
  const sampleBio = useMemo(() =>
    localBioText ||
    `Hey folks! I'm ${localUsername} building on Solana. Mention @someone to highlight.`,
    [localBioText, localUsername]
  );

  // Conditionals for UI elements - memoized to prevent recalculations
  const canShowFollowsYou = useMemo(() =>
    !isOwnProfile && areTheyFollowingMe,
    [isOwnProfile, areTheyFollowingMe]
  );

  const canShowAddButton = useMemo(() =>
    !isOwnProfile,
    [isOwnProfile]
  );

  // Removed: showBuyCard useMemo

  // Removed: Token attachment state
  // const [tokenDescription, setTokenDescription] = useState('');
  // const [showAttachDetailsModal, setShowAttachDetailsModal] = useState(false);
  // const [selectedToken, setSelectedToken] = useState<{ ... } | null>(null);

  // Profile edit drawer state
  const [showEditProfileDrawer, setShowEditProfileDrawer] = useState(false);

  // Memoize profile data to prevent unnecessary re-renders of child components
  const memoizedProfileData = useMemo(() => ({
    userId: userWallet,
    profilePicUrl: localProfilePic,
    username: localUsername,
    description: localBioText || sampleBio,
  }), [userWallet, localProfilePic, localUsername, localBioText, sampleBio]);

  /**
   * Combined handler for avatar press and edit profile
   */
  const handleEditProfilePress = useCallback(() => {
    console.log('[UserProfileInfo] handleEditProfilePress called, isOwnProfile:', isOwnProfile);
    if (!isOwnProfile) return;
    console.log('[UserProfileInfo] Setting showEditProfileDrawer to true');
    setShowEditProfileDrawer(true);
  }, [isOwnProfile]);

  /**
   * Handle profile updated event
   */
  const handleProfileUpdated = useCallback((field: 'image' | 'username' | 'description') => {
    console.log('[UserProfileInfo] handleProfileUpdated called for field:', field);
    // Refresh the local state based on the field that was updated
    if (field === 'image' && onAvatarPress) {
      console.log('[UserProfileInfo] Calling onAvatarPress callback');
      onAvatarPress();
    } else if ((field === 'username' || field === 'description') && onEditProfile) {
      console.log('[UserProfileInfo] Calling onEditProfile callback');
      onEditProfile();
    }
  }, [onAvatarPress, onEditProfile]);

  // Removed: handleSelectToken useCallback
  // Removed: useEffect for selectedToken / showAttachDetailsModal
  // Removed: handleAttachCoinConfirm useCallback
  // Removed: handleRemoveCoin useCallback
  // Removed: handleCloseModal useCallback
  // Removed: handleDescriptionChange useCallback

  /**
   * Handle logout
   */
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  }, [logout]);

  /**
   * Handle transfer balance button click
   */
  const handleTransferBalance = useCallback(() => {
    setShowTransferModal(true);
  }, []);

  /**
   * Handle ProfileEditDrawer close
   */
  const handleEditDrawerClose = useCallback(() => {
    console.log('[UserProfileInfo] ProfileEditDrawer onClose called');
    setShowEditProfileDrawer(false);
  }, []);

  return (
    <View style={styles.profileInfo}>
      {/* Profile Header with Avatar and Name */}
      <ProfileHeader
        profilePicUrl={localProfilePic}
        username={localUsername}
        handleString={handleString}
        showFollowsYou={canShowFollowsYou}
        isOwnProfile={isOwnProfile}
        onAvatarPress={handleEditProfilePress}
        userWallet={userWallet}
      />

      {/* Short bio */}
      <BioSection bioText={sampleBio} />

      {/* Follower/following stats */}
      <StatsSection
        followersCount={followersCount}
        followingCount={followingCount}
        onPressFollowers={onPressFollowers}
        onPressFollowing={onPressFollowing}
      />

      {/* Removed: TokenCard JSX block */}

      {/* Edit profile button (for own profile) */}
      {isOwnProfile && <EditButton
        onPress={handleEditProfilePress}
        onTransferBalance={handleTransferBalance}
        onLogout={handleLogout}
      />}

      {/* Transfer Balance Button */}
      {isOwnProfile && (
        <View style={{ height: 0, overflow: 'hidden' }}>
          <TransferBalanceButton
            showOnlyTransferButton
            showCustomWalletInput
            buttonLabel="Transfer Balance"
            recipientAddress=""
            onSendToWallet={() => { }}
            externalModalVisible={showTransferModal}
            externalSetModalVisible={setShowTransferModal}
          />
        </View>
      )}

      {/* Follow/unfollow button (for other profiles) */}
      {canShowAddButton && (
        <FollowButton
          amIFollowing={amIFollowing}
          areTheyFollowingMe={areTheyFollowingMe}
          onPressFollow={onFollowPress}
          onPressUnfollow={onUnfollowPress}
          recipientAddress={userWallet}
        />
      )}

      {/* Removed: Token attachment modal */}
      {/* <TokenAttachModal
        visible={showAttachDetailsModal}
        onClose={handleCloseModal}
        onConfirm={() => handleAttachCoinConfirm(false)}
        tokenDescription={tokenDescription}
        onChangeDescription={handleDescriptionChange}
      /> */}

      {/* Profile Edit Drawer - new unified profile editor */}
      {isOwnProfile && (
        <ProfileEditDrawerComponent
          visible={showEditProfileDrawer}
          onClose={handleEditDrawerClose}
          profileData={memoizedProfileData}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </View>
  );
}

// Optimize re-renders with detailed prop comparison
function arePropsEqual(
  prevProps: UserProfileInfoProps,
  nextProps: UserProfileInfoProps,
) {
  // Fast-path for reference equality
  if (prevProps === nextProps) return true;

  // Profile data
  if (prevProps.profilePicUrl !== nextProps.profilePicUrl) return false;
  if (prevProps.username !== nextProps.username) return false;
  if (prevProps.userWallet !== nextProps.userWallet) return false;
  if (prevProps.isOwnProfile !== nextProps.isOwnProfile) return false;
  if (prevProps.bioText !== nextProps.bioText) return false;

  // Social status
  if (prevProps.amIFollowing !== nextProps.amIFollowing) return false;
  if (prevProps.areTheyFollowingMe !== nextProps.areTheyFollowingMe) return false;
  if (prevProps.followersCount !== nextProps.followersCount) return false;
  if (prevProps.followingCount !== nextProps.followingCount) return false;

  // Removed: Check attachmentData only if needed
  // if (prevProps.attachmentData !== nextProps.attachmentData) { ... }

  // Check callbacks by reference
  if (prevProps.onAvatarPress !== nextProps.onAvatarPress) return false;
  if (prevProps.onEditProfile !== nextProps.onEditProfile) return false;
  if (prevProps.onFollowPress !== nextProps.onFollowPress) return false;
  if (prevProps.onUnfollowPress !== nextProps.onUnfollowPress) return false;
  if (prevProps.onPressFollowers !== nextProps.onPressFollowers) return false;
  if (prevProps.onPressFollowing !== nextProps.onPressFollowing) return false;

  return true;
}

export default React.memo(UserProfileInfo, arePropsEqual);
