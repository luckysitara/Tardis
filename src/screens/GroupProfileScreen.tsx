import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '@/shared/hooks/useReduxHooks';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { Ionicons } from '@expo/vector-icons';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const GroupProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { chatId } = route.params;

  const { address: userId } = useAppSelector(state => state.auth);
  const { chats } = useAppSelector(state => state.chat);
  
  const currentChat = useMemo(() => chats.find(c => c.id === chatId), [chats, chatId]);

  if (!currentChat) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Group not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sortedParticipants = useMemo(() => {
    if (!currentChat.participants) return [];
    return [...currentChat.participants].sort((a, b) => {
      // 1. Current user always at top (after admins if not admin)
      if (a.id === userId) return -1;
      if (b.id === userId) return 1;
      
      // 2. Admins next
      if (a.is_admin && !b.is_admin) return -1;
      if (!a.is_admin && b.is_admin) return 1;
      
      // 3. Alphabetical
      return a.username.localeCompare(b.username);
    });
  }, [currentChat.participants, userId]);

  const isAdmin = useMemo(() => {
    return currentChat.participants?.find(p => p.id === userId)?.is_admin;
  }, [currentChat.participants, userId]);

  const renderHeader = () => (
    <View style={[styles.header, { top: Math.max(insets.top, 20) }]}>
      <TouchableOpacity 
        style={styles.headerButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={28} color={COLORS.white} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerButton} onPress={() => Alert.alert('Options', 'More group options coming soon.')}>
        <Ionicons name="ellipsis-vertical" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        bounces={true} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topSection, { paddingTop: insets.top + 60 }]}>
          <View style={styles.avatarContainer}>
            <IPFSAwareImage
              source={getValidImageSource(currentChat.avatar_url || `https://api.dicebear.com/7.x/initials/png?seed=${currentChat.name}`)}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.groupName}>{currentChat.name || 'Secure Group'}</Text>
          <Text style={styles.groupSubtitle}>
            {currentChat.participants?.length || 0} Participants • {currentChat.type === 'global' ? 'Global' : 'Group'}
          </Text>
        </View>

        {renderHeader()}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Audio', 'Group audio call coming soon.')}>
            <View style={styles.actionIcon}><Ionicons name="call" size={22} color={COLORS.brandPrimary} /></View>
            <Text style={styles.actionText}>Audio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Video', 'Group video call coming soon.')}>
            <View style={styles.actionIcon}><Ionicons name="videocam" size={22} color={COLORS.brandPrimary} /></View>
            <Text style={styles.actionText}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Search', 'Search message feature coming soon.')}>
            <View style={styles.actionIcon}><Ionicons name="search" size={22} color={COLORS.brandPrimary} /></View>
            <Text style={styles.actionText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Mute', 'Mute notifications coming soon.')}>
            <View style={styles.actionIcon}><Ionicons name="notifications-off" size={22} color={COLORS.brandPrimary} /></View>
            <Text style={styles.actionText}>Mute</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Group Description</Text>
          <Text style={styles.description}>
            {currentChat.meta_data?.description || 'This is a secure end-to-end encrypted group chat on the Tardis network. Only invited participants can see messages.'}
          </Text>
        </View>

        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{currentChat.participants?.length || 0} Participants</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('Add Members', 'Member invitation system coming soon.')}>
                <Ionicons name="person-add-outline" size={18} color={COLORS.brandPrimary} />
                <Text style={styles.addText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.participantsContainer}>
            {sortedParticipants.map((participant) => (
              <TouchableOpacity 
                key={participant.id} 
                style={styles.participantItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Profile', { userId: participant.id })}
              >
                <IPFSAwareImage
                  source={getValidImageSource(participant.profile_picture_url || `https://api.dicebear.com/7.x/initials/png?seed=${participant.username}`)}
                  style={styles.participantAvatar}
                />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {participant.username} {participant.id === userId && <Text style={styles.youText}>(You)</Text>}
                  </Text>
                  <Text style={styles.participantStatus}>
                    {participant.is_active ? 'Online' : 'Yesterday'}
                  </Text>
                </View>
                {participant.is_admin && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminText}>Admin</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerButton} onPress={() => Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Leave', style: 'destructive' }])}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.errorRed} />
            <Text style={styles.dangerButtonText}>Leave Group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={() => Alert.alert('Report', 'Report group for suspicious activity?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', style: 'destructive' }])}>
            <Ionicons name="alert-circle-outline" size={22} color={COLORS.errorRed} />
            <Text style={styles.dangerButtonText}>Report Group</Text>
          </TouchableOpacity>
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
  topSection: {
    backgroundColor: COLORS.darkerBackground,
    alignItems: 'center',
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.brandPrimary,
    marginBottom: 16,
    backgroundColor: COLORS.lighterBackground,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    marginBottom: 4,
  },
  groupSubtitle: {
    fontSize: 14,
    color: COLORS.greyMid,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  actionItem: {
    alignItems: 'center',
    width: width / 4 - 10,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(50, 212, 222, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.brandPrimary,
    fontWeight: '600',
  },
  cardSection: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 20,
    marginBottom: 20,
  },
  listSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.brandPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(50, 212, 222, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addText: {
    color: COLORS.brandPrimary,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  participantsContainer: {
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 20,
    overflow: 'hidden',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15,
    backgroundColor: COLORS.lighterBackground,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  youText: {
    color: COLORS.brandPrimary,
    fontSize: 14,
    fontWeight: '400',
  },
  participantStatus: {
    fontSize: 12,
    color: COLORS.greyMid,
    marginTop: 2,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(50, 212, 222, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(50, 212, 222, 0.3)',
  },
  adminText: {
    fontSize: 10,
    color: COLORS.brandPrimary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dangerSection: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dangerButtonText: {
    color: COLORS.errorRed,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.white,
    fontSize: 18,
    marginBottom: 10,
  },
  backLink: {
    color: COLORS.brandPrimary,
    fontSize: 16,
  },
});

export default GroupProfileScreen;
