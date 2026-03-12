import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  Platform, 
  TextInput, 
  StatusBar, 
  Image,
  Dimensions,
  ScrollView
} from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

  const featuredCommunities = useMemo(() => {
    return communities.filter(c => c.is_public).slice(0, 5);
  }, [communities]);

  const filteredCommunities = useMemo(() => {
    let list = communities;
    if (searchQuery) {
      list = communities.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
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

  const renderFeaturedItem = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('CommunityFeed', { communityId: item.id, communityName: item.name })}
    >
      <IPFSAwareImage
        source={getValidImageSource(item.banner_url)}
        style={styles.featuredBanner}
        defaultSource={{ uri: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop' }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(12, 16, 26, 0.95)']}
        style={styles.featuredGradient}
      />
      <View style={styles.featuredInfo}>
        <View style={styles.featuredAvatarWrapper}>
          <IPFSAwareImage
            source={getValidImageSource(item.avatar_url)}
            style={styles.featuredAvatar}
            defaultSource={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}` }}
          />
        </View>
        <View style={styles.featuredTextContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
            {item.is_gated && (
              <Icons.LockIcon width={12} height={12} color={COLORS.brandPrimary} />
            )}
          </View>
          <Text style={styles.featuredMembers}>{item.memberCount || 0} Seeker Members</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.communityCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('CommunityFeed', { communityId: item.id, communityName: item.name })}
    >
      <View style={styles.cardAvatarWrapper}>
        <IPFSAwareImage
          source={getValidImageSource(item.avatar_url)}
          style={styles.cardAvatar}
          defaultSource={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}` }}
        />
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.communityName} numberOfLines={1}>{item.name}</Text>
          {item.is_gated && (
            <Icons.LockIcon width={12} height={12} color={COLORS.brandPrimary} style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.memberCount}>{item.memberCount || 0} members</Text>
        <Text style={styles.communityDescription} numberOfLines={1}>
          {item.description || "Hardware-gated community."}
        </Text>
      </View>

      {!item.is_member ? (
        <TouchableOpacity 
          style={styles.joinButton}
          onPress={() => handleJoinCommunity(item.id)}
        >
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      ) : (
        <Icons.CheckIcon width={16} height={16} color={COLORS.brandPrimary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerSubtitle}>The Galactic Map</Text>
          <Text style={styles.headerTitle}>Discovery</Text>
        </View>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.navigate('CreateCommunityScreen')}
        >
          <LinearGradient
            colors={[COLORS.brandPrimary, '#1D4ED8']}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icons.PlusCircleIcon width={20} height={20} fill={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icons.SearchIcon width={16} height={16} color={COLORS.greyMid} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search communities or tokens..."
            placeholderTextColor={COLORS.greyMid}
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardAppearance="dark"
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* New Prominent Launch Button */}
        <View style={styles.launchButtonContainer}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CreateCommunityScreen')}
          >
            <LinearGradient
              colors={[COLORS.brandPrimary, '#1D4ED8']}
              style={styles.mainLaunchButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icons.RocketIcon width={24} height={24} color={COLORS.white} />
              <View style={styles.launchButtonTextContainer}>
                <Text style={styles.launchButtonTitle}>Establish New Colony</Text>
                <Text style={styles.launchButtonSubtitle}>Launch token & gate your community</Text>
              </View>
              <Icons.ArrowIcon width={20} height={20} color={COLORS.white} style={{ opacity: 0.7 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Featured Section */}
        {!searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Colonies</Text>
            <FlashList
              horizontal
              data={featuredCommunities}
              renderItem={renderFeaturedItem}
              keyExtractor={item => `featured-${item.id}`}
              estimatedItemSize={280}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            />
          </View>
        )}

        {/* All Communities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? 'Search Results' : 'Explore All Colonies'}
          </Text>
          {loading && communities.length === 0 ? (
            <ActivityIndicator size="small" color={COLORS.brandPrimary} style={{ marginTop: 20 }} />
          ) : (
            <FlashList
              data={filteredCommunities}
              renderItem={renderCommunityItem}
              keyExtractor={item => item.id}
              estimatedItemSize={80}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No communities found</Text>
                </View>
              )}
            />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerSubtitle: {
    color: COLORS.brandPrimary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    marginTop: 2,
  },
  headerIcon: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButtonGradient: {
    padding: 10,
    borderRadius: 25,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginLeft: 20,
    marginBottom: 16,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  featuredList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  featuredCard: {
    width: 280,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 15,
    backgroundColor: COLORS.darkerBackground,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuredBanner: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  featuredInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredAvatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.brandPrimary,
    overflow: 'hidden',
  },
  featuredAvatar: {
    width: '100%',
    height: '100%',
  },
  featuredTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  featuredMembers: {
    fontSize: 11,
    color: COLORS.brandPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.lighterBackground,
  },
  cardAvatar: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  memberCount: {
    fontSize: 12,
    color: COLORS.greyMid,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  communityDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  joinButton: {
    backgroundColor: 'rgba(50, 212, 222, 0.1)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.brandPrimary,
  },
  joinButtonText: {
    color: COLORS.brandPrimary,
    fontWeight: '800',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.greyMid,
  },
  launchButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 10,
  },
  mainLaunchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  launchButtonTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  launchButtonTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  launchButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
});

export default CommunitiesScreen;