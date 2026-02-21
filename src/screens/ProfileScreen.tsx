import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../shared/state/store';
import COLORS from '@/assets/colors';
import { fetchUserCommunities } from '@/shared/state/community/slice';
import { fetchBookmarkedPosts } from '@/shared/state/post/slice';
import { FlashList } from '@shopify/flash-list';
import PostComponent from '@/components/PostComponent';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch<any>();
  const { username: skrUsername, address: userId } = useSelector((state: RootState) => state.auth);
  const { userCommunities, loading: communitiesLoading } = useSelector((state: RootState) => state.community);
  const { bookmarkedPosts, loading: postsLoading } = useSelector((state: RootState) => state.post);
  
  const [activeTab, setActiveTab] = useState<'COMMUNITIES' | 'BOOKMARKS'>('COMMUNITIES');

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserCommunities(userId));
      dispatch(fetchBookmarkedPosts(userId));
    }
  }, [dispatch, userId]);

  const renderCommunityItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.communityItem}
      onPress={() => navigation.navigate('CommunityFeed', { communityId: item.id, communityName: item.name })}
    >
      <View style={styles.communityIconPlaceholder}>
        <Text style={styles.communityIconText}>{item.name.substring(0, 1).toUpperCase()}</Text>
      </View>
      <View>
        <Text style={styles.communityName}>{item.name}</Text>
        <Text style={styles.communityRole}>{item.creator_id === userId ? 'Founder' : 'Member'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
        <Text style={styles.header}>Your Seeker Profile</Text>
        <Text style={styles.skrText}>{skrUsername || "Loading .skr..."}</Text>

        <View style={styles.profileInfoContainer}>
          <View style={styles.profilePicturePlaceholder} />
          <Text style={styles.bioText}>
            Hardware-attested Solana Seeker. Exploring the encrypted frontier.
          </Text>
          <View style={styles.followStats}>
            <Text style={styles.followText}>0 Followers</Text>
            <Text style={styles.followText}>0 Following</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'COMMUNITIES' && styles.activeTab]}
            onPress={() => setActiveTab('COMMUNITIES')}
          >
            <Text style={[styles.tabText, activeTab === 'COMMUNITIES' && styles.activeTabText]}>Communities</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'BOOKMARKS' && styles.activeTab]}
            onPress={() => setActiveTab('BOOKMARKS')}
          >
            <Text style={styles.tabText}>Bookmarks</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentArea}>
          {activeTab === 'COMMUNITIES' ? (
            communitiesLoading ? (
              <ActivityIndicator color={COLORS.brandPrimary} style={{ marginTop: 20 }} />
            ) : (
              <View style={{ height: 400 }}>
                <FlashList
                  data={Array.from(new Map([...userCommunities.created, ...userCommunities.joined].map(item => [item.id, item])).values())}
                  renderItem={renderCommunityItem}
                  keyExtractor={item => item.id}
                  estimatedItemSize={70}
                  ListEmptyComponent={() => (
                    <Text style={styles.emptyText}>No communities yet.</Text>
                  )}
                />
              </View>
            )
          ) : (
            postsLoading ? (
              <ActivityIndicator color={COLORS.brandPrimary} style={{ marginTop: 20 }} />
            ) : (
              <View style={{ height: 400 }}>
                <FlashList
                  data={bookmarkedPosts}
                  renderItem={({ item }) => <PostComponent {...item} />}
                  keyExtractor={item => item.id}
                  estimatedItemSize={200}
                  ListEmptyComponent={() => (
                    <Text style={styles.emptyText}>No bookmarks yet.</Text>
                  )}
                />
              </View>
            )
          )}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 50,
    marginBottom: 10,
  },
  skrText: {
    fontSize: 22,
    color: COLORS.brandPrimary,
    marginBottom: 20,
  },
  profileInfoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.brandPrimary,
  },
  bioText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    maxWidth: '80%',
  },
  followStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  followText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.brandPrimary,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 30,
  },
  editButtonText: {
    color: COLORS.brandPrimary,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.brandPrimary,
  },
  tabText: {
    color: COLORS.greyMid,
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  contentArea: {
    width: '100%',
    padding: 10,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 10,
  },
  communityIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  communityIconText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  communityName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  communityRole: {
    color: COLORS.brandPrimary,
    fontSize: 12,
  },
  emptyText: {
    color: COLORS.greyMid,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  }
});

export default ProfileScreen;

