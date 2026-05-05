import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import COLORS from '@/assets/colors';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchSuggestedUsers, followUser } from '@/shared/state/follow/slice';
import Icons from '@/assets/svgs';
import { useNavigation } from '@react-navigation/native';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';

const OnboardingChecklist = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const { address: userId, displayName, profilePicUrl, description, username } = useAppSelector(state => state.auth);
  const { following, suggestedUsers, loading: followLoading } = useAppSelector(state => state.follow);
  const { allPosts } = useAppSelector(state => state.thread);

  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    dispatch(fetchSuggestedUsers(userId || undefined));
  }, [dispatch, userId]);

  // Checklist Items
  const hasProfileImage = !!profilePicUrl;
  const hasDisplayName = !!displayName && displayName !== userId;
  const hasBio = !!description;
  const followCount = following ? following.length : 0;
  const hasPosted = allPosts ? allPosts.some(p => p.user?.id === userId) : false;

  const steps = [
    { id: 'profile', title: 'Complete your profile', completed: hasProfileImage && hasDisplayName && hasBio, action: () => navigation.navigate('EditProfile') },
    { id: 'follow', title: `Follow 5 seekers (${Math.min(followCount, 5)}/5)`, completed: followCount >= 5, action: null },
    { id: 'post', title: 'Make your first transmission', completed: hasPosted, action: () => navigation.navigate('CreatePost') },
  ];

  const allCompleted = steps.every(s => s.completed);

  if (allCompleted || !isVisible) return null;

  const handleFollow = (targetId: string) => {
    if (userId) {
      dispatch(followUser({ followerId: userId, followingId: targetId }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, Seeker</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          {Icons.CloseIcon ? (
            <Icons.CloseIcon width={20} height={20} color={COLORS.greyMid} />
          ) : (
            <Text style={{color: COLORS.white}}>X</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Complete these steps to unlock the full power of Tardis.</Text>

      <View style={styles.stepsContainer}>
        {steps.map(step => (
          <TouchableOpacity 
            key={step.id} 
            style={styles.stepItem} 
            onPress={step.action}
            disabled={!step.action || step.completed}
          >
            <View style={[styles.checkbox, step.completed && styles.checkboxCompleted]}>
              {step.completed && <Icons.CheckIcon width={12} height={12} color={COLORS.white} />}
            </View>
            <Text style={[styles.stepText, step.completed && styles.stepTextCompleted]}>{step.title}</Text>
            {!step.completed && step.action && (
              <Icons.BackIcon width={16} height={16} color={COLORS.brandPrimary} style={{ transform: [{ rotate: '180deg' }] }} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {followCount < 5 && suggestedUsers && suggestedUsers.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Seekers to follow</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            {suggestedUsers.map(user => {
              const isFollowing = following.includes(user.id);
              return (
                <View key={user.id} style={styles.userCard}>
                  <IPFSAwareImage
                    source={getValidImageSource(user.profile_picture_url || `https://api.dicebear.com/7.x/initials/png?seed=${user.username}`)}
                    style={styles.userAvatar}
                  />
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.display_name || user.username}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.followButton, isFollowing && styles.followingButton]}
                    onPress={() => handleFollow(user.id)}
                    disabled={isFollowing}
                  >
                    <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.darkerBackground,
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.greyMid,
    fontSize: 14,
    marginBottom: 20,
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.brandPrimary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: COLORS.brandPrimary,
    borderColor: COLORS.brandPrimary,
  },
  stepText: {
    color: COLORS.white,
    fontSize: 15,
    flex: 1,
  },
  stepTextCompleted: {
    color: COLORS.greyMid,
    textDecorationLine: 'line-through',
  },
  suggestionsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionsScroll: {
    paddingRight: 16,
  },
  userCard: {
    width: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    backgroundColor: '#30363D',
  },
  userName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  followButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.greyMid,
  },
  followButtonText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: 'bold',
  },
  followingButtonText: {
    color: COLORS.greyMid,
  },
});

export default OnboardingChecklist;
