import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import axios from 'axios';
import { SERVER_URL } from '@env';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';

const SERVER_BASE_URL = SERVER_URL || 'http://192.168.1.175:8080';

interface Community {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  banner_url: string;
  memberCount: number;
  gates: any[];
}

const CommunitiesScreen = () => {
  const navigation = useNavigation<any>();
  const { address: userId } = useAppSelector(state => state.auth);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCommunities = async () => {
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/api/communities`);
      if (response.data.success) {
        setCommunities(response.data.communities);
      }
    } catch (error) {
      console.error('Fetch communities error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleJoin = async (community: Community) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${SERVER_BASE_URL}/api/communities/join`, {
        communityId: community.id,
        userId
      });

      if (response.data.success) {
        Alert.alert('Access Granted', `Welcome to the ${community.name}!`);
        navigation.navigate('ChatScreen', { chatId: community.id, title: community.name });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Verification failed.';
      Alert.alert('Gate Locked', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => {
    const hasSgtGate = item.gates.some(g => g.gate_type === 'GENESIS');
    const hasTokenGate = item.gates.some(g => g.gate_type === 'TOKEN');

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleJoin(item)}
      >
        <Image 
          source={{ uri: item.banner_url || 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=500&auto=format&fit=crop' }} 
          style={styles.banner} 
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Image 
              source={{ uri: item.avatar_url || `https://api.dicebear.com/7.x/identicon/png?seed=${item.id}` }} 
              style={styles.communityAvatar} 
            />
            <View style={styles.gateBadges}>
              {hasSgtGate && (
                <View style={[styles.badge, { backgroundColor: COLORS.brandPrimary }]}>
                  <Icons.Shield width={10} height={10} color={COLORS.white} />
                  <Text style={styles.badgeText}>SGT</Text>
                </View>
              )}
              {hasTokenGate && (
                <View style={[styles.badge, { backgroundColor: COLORS.brandPurple }]}>
                  <Text style={styles.badgeText}>GATED</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.communityName}>{item.name}</Text>
          <Text style={styles.description} numberOfLines={2}>{item.description || 'A gathering of seekers in the void.'}</Text>
          
          <View style={styles.cardFooter}>
            <Text style={styles.memberCount}>{item.memberCount} members</Text>
            <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(item)}>
              <Text style={styles.joinButtonText}>Materialize</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discovery</Text>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => navigation.navigate('CreateCommunityScreen')}
        >
          <Icons.PlusCircleIcon width={28} height={28} fill={COLORS.white} />
        </TouchableOpacity>
      </View>

      {loading && communities.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        </View>
      ) : (
        <FlashList
          data={communities}
          renderItem={renderCommunityItem}
          keyExtractor={item => item.id}
          estimatedItemSize={250}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => { setRefreshing(true); fetchCommunities(); }} 
              tintColor={COLORS.brandPrimary} 
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No communities found in this sector.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
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
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerIcon: {
    padding: 5,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  banner: {
    width: '100%',
    height: 100,
    backgroundColor: '#30363D',
  },
  cardContent: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: -40, // Pull avatar up over banner
  },
  communityAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#161B22',
    backgroundColor: '#30363D',
  },
  gateBadges: {
    flexDirection: 'row',
    marginTop: 45,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  communityName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 10,
  },
  description: {
    fontSize: 14,
    color: COLORS.greyMid,
    marginTop: 6,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberCount: {
    fontSize: 12,
    color: COLORS.greyMid,
  },
  joinButton: {
    backgroundColor: 'rgba(50, 212, 222, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.brandPrimary,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  joinButtonText: {
    color: COLORS.brandPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: COLORS.greyMid,
    fontSize: 16,
  }
});

export default CommunitiesScreen;
