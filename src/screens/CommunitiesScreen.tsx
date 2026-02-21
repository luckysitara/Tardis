import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import { FlashList } from '@shopify/flash-list';
import COLORS from '@/assets/colors';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { fetchCommunities, joinCommunity } from '@/shared/state/community/slice';
import { Community } from '@/shared/state/community/types'; // Import the Community type
import Icons from '@/assets/svgs'; // Assuming you have an Icons component for SVG

type CommunitiesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Communities'
>;

const CommunitiesScreen = () => {
  const navigation = useNavigation<CommunitiesScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { communities, loading, error } = useAppSelector(state => state.community);
  const userId = useAppSelector(state => state.auth.address); // Assuming userId is available in auth state

  useEffect(() => {
    dispatch(fetchCommunities());
  }, [dispatch]);

  const handleJoinCommunity = async (communityId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }
    try {
      await dispatch(joinCommunity({ communityId, userId })).unwrap();
      Alert.alert('Success', 'Community joined successfully!');
      dispatch(fetchCommunities()); // Re-fetch to update joined status
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to join community.');
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <View style={styles.communityItem}>
      <View style={styles.communityInfo}>
        <Text style={styles.communityName}>{item.name}</Text>
        <Text style={styles.communityDescription}>{item.description}</Text>
        <Text style={styles.communityMembers}>{item.member_count} members</Text>
      </View>
      <View style={styles.actions}>
        {item.is_gated && (
          <View style={styles.gatedTag}>
            <Icons.LockIcon width={12} height={12} color={COLORS.white} />
            <Text style={styles.gatedText}>Gated</Text>
          </View>
        )}
        <Button
          title={item.is_member ? "Joined" : "Join"}
          onPress={() => handleJoinCommunity(item.id)}
          color={COLORS.brandPrimary}
          disabled={item.is_member}
        />
      </View>
    </View>
  );

  if (loading && communities.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.brandPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title="Retry" onPress={() => dispatch(fetchCommunities())} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateCommunityScreen')}
        >
          <Icons.PlusCircleIcon width={28} height={28} fill={COLORS.white} />
        </TouchableOpacity>
      </View>
      <FlashList
        data={communities}
        renderItem={renderCommunityItem}
        keyExtractor={item => item.id}
        estimatedItemSize={120}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No communities found.</Text>
            <Text style={styles.emptySubtext}>Be the first to create one!</Text>
          </View>
        )}
      />
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  createButton: {
    padding: 5,
  },
  communityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  communityInfo: {
    flex: 1,
    marginRight: 10,
  },
  communityName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  communityDescription: {
    fontSize: 14,
    color: COLORS.greyMid,
    marginTop: 4,
  },
  communityMembers: {
    fontSize: 12,
    color: COLORS.greyLight,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gatedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  gatedText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandPrimary,
    marginLeft: 5,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    marginTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.greyMid,
    textAlign: 'center',
  },
});

export default CommunitiesScreen;