import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import { FlashList } from '@shopify/flash-list';
import COLORS from '@/assets/colors';

type CommunitiesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Communities'
>;

const mockCommunities = [
  { id: '1', name: 'Solana Seekers', members: 1200, isGated: true },
  { id: '2', name: 'Tardis Builders', members: 450, isGated: false },
  { id: '3', name: 'Meme Central', members: 10000, isGated: false },
  { id: '4', name: 'NFT Artists Collective', members: 780, isGated: true },
];

const CommunitiesScreen = () => {
  const navigation = useNavigation<CommunitiesScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        <Button
          title="Create"
          onPress={() => navigation.navigate('CreateCommunityScreen')}
          color={COLORS.brandPrimary}
        />
      </View>
      <FlashList
        data={mockCommunities}
        renderItem={({ item }) => (
          <View style={styles.communityItem}>
            <View>
              <Text style={styles.communityName}>{item.name}</Text>
              <Text style={styles.communityMembers}>{item.members} members</Text>
            </View>
            {item.isGated && <Text style={styles.gatedTag}>Gated</Text>}
          </View>
        )}
        keyExtractor={item => item.id}
        estimatedItemSize={70}
      />
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
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  communityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  communityName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  communityMembers: {
    fontSize: 14,
    color: COLORS.greyMid,
    marginTop: 4,
  },
  gatedTag: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandPrimary,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default CommunitiesScreen;
