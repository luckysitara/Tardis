import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Platform, TextInput, StatusBar, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import { FlashList } from '@shopify/flash-list';
import COLORS from '@/assets/colors';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { fetchCommunities, joinCommunity } from '@/shared/state/community/slice';
import { Community } from '@/shared/state/community/types';
import Icons from '@/assets/svgs';
import TYPOGRAPHY from '@/assets/typography';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CommunitiesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Communities'
>;

const CommunitiesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CommunitiesScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { communities, loading, error } = useAppSelector(state => state.community);
  const userId = useAppSelector(state => state.auth.address);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchCommunities(userId));
  }, [dispatch, userId]);

  const filteredCommunities = useMemo(() => {
    if (!searchQuery) return communities;
    return communities.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [communities, searchQuery]);

  const handleJoinCommunity = async (communityId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }
    try {
      await dispatch(joinCommunity({ communityId, userId })).unwrap();
      Alert.alert('Success', 'Community joined successfully!');
      dispatch(fetchCommunities(userId));
    } catch (err: any) {
      console.log("[CommunitiesScreen] Join error:", err);
      if (err.includes('Access Denied')) {
        Alert.alert(
          'Access Denied', 
          err,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Buy Token', 
              onPress: () => navigation.navigate('Swap' as any) 
            }
          ]
        );
      } else {
        Alert.alert('Error', err || 'Failed to join community.');
      }
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.communityCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('CommunityFeed', { communityId: item.id, communityName: item.name })}
    >
      <View style={styles.cardHeader}>
        <IPFSAwareImage
          source={getValidImageSource(item.banner_url)}
          style={styles.cardBanner}
          defaultSource={{ uri: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=500&auto=format&fit=crop' }}
        />
        <View style={styles.cardAvatarWrapper}>
          <IPFSAwareImage
            source={getValidImageSource(item.avatar_url)}
            style={styles.cardAvatar}
            defaultSource={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}` }}
          />
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.communityName} numberOfLines={1}>{item.name}</Text>
          {item.is_gated && (
            <Icons.LockIcon width={14} height={14} color={COLORS.brandPrimary} />
          )}
        </View>
        <Text style={styles.memberCount}>{item.memberCount || 0} members</Text>
        <Text style={styles.communityDescription} numberOfLines={2}>
          {item.description || "No description available for this community."}
        </Text>
        
        {!item.is_member && (
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => handleJoinCommunity(item.id)}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        )}
        {item.is_member && (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedText}>Joined</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Communities</Text>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.navigate('CreateCommunityScreen')}
        >
          <Icons.PlusCircleIcon width={24} height={24} fill={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icons.SearchIcon width={16} height={16} color={COLORS.greyMid} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Communities"
            placeholderTextColor={COLORS.greyMid}
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardAppearance="dark"
          />
        </View>
      </View>

      {loading && communities.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        </View>
      ) : (
        <FlashList
          data={filteredCommunities}
          renderItem={renderCommunityItem}
          keyExtractor={item => item.id}
          estimatedItemSize={250}
          numColumns={1}
          contentContainerStyle={styles.listContent}
          onRefresh={() => dispatch(fetchCommunities(userId))}
          refreshing={loading}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No communities found</Text>
              <Text style={styles.emptySubtext}>Try searching for something else or create your own!</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  headerIcon: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202327',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  communityCard: {
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    height: 80,
    position: 'relative',
  },
  cardBanner: {
    width: '100%',
    height: '100%',
  },
  cardAvatarWrapper: {
    position: 'absolute',
    bottom: -20,
    left: 16,
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.darkerBackground,
    overflow: 'hidden',
    backgroundColor: COLORS.darkerBackground,
  },
  cardAvatar: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    flex: 1,
    marginRight: 8,
  },
  memberCount: {
    fontSize: 13,
    color: COLORS.greyMid,
    marginTop: 2,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  communityDescription: {
    fontSize: 14,
    color: COLORS.white,
    marginTop: 8,
    lineHeight: 18,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  joinButton: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  joinButtonText: {
    color: COLORS.black,
    fontWeight: '700',
    fontSize: 14,
  },
  joinedBadge: {
    borderWidth: 1,
    borderColor: COLORS.greyMid,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  joinedText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.greyMid,
    textAlign: 'center',
    lineHeight: 20,
  }
});

export default CommunitiesScreen;