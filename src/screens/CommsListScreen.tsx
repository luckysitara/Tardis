import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  SafeAreaView,
  TextInput,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchUserChats, setSelectedChat, ChatRoom } from '@/shared/state/chat/slice';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { DEFAULT_IMAGES } from '@/shared/config/constants';
import { decryptMessage, getKeypairFromSeed } from '@/shared/utils/crypto';
import { Buffer } from 'buffer';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * Formats a timestamp into a relative "Tardis" format
 */
const formatTemporalTime = (timestamp: string | Date | number | undefined) => {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Ancient';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Ancient';
  }
};

const CommsListScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { address: userId, encryptionSeed } = useAppSelector(state => state.auth);
  const { chats, loadingChats } = useAppSelector(state => state.chat);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserChats(userId));
    }
  }, [userId, dispatch]);

  const onRefresh = async () => {
    if (userId) {
      setIsRefreshing(true);
      await dispatch(fetchUserChats(userId));
      setIsRefreshing(false);
    }
  };

  const filteredChats = useMemo(() => {
    // 1. Sort by last message timestamp (Temporal Sorting)
    const sorted = [...chats].sort((a, b) => {
      const timeA = new Date(a.lastMessage?.created_at || a.updated_at).getTime();
      const timeB = new Date(b.lastMessage?.created_at || b.updated_at).getTime();
      return timeB - timeA;
    });

    // 2. Filter by search query
    if (!searchQuery) return sorted;
    return sorted.filter(chat => {
      const name = chat.name || chat.participants.find(p => p.id !== userId)?.username || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, userId]);

  const renderChatItem = ({ item }: { item: ChatRoom }) => {
    const otherParticipant = item.participants.find(p => p.id !== userId);
    const chatName = item.name || otherParticipant?.username || 'Unknown Seeker';
    const avatar = otherParticipant?.profile_picture_url || DEFAULT_IMAGES.user;
    const lastMessage = item.lastMessage;
    const isE2EE = item.type === 'direct';

    // Preview Logic with E2EE Scrambling
    let previewText = lastMessage ? lastMessage.content : 'No transmissions yet';
    
    if (lastMessage?.is_encrypted && encryptionSeed) {
      try {
        const seedUint8 = new Uint8Array(Buffer.from(encryptionSeed, 'base64'));
        const keypair = getKeypairFromSeed(seedUint8);
        const sender = item.participants.find(p => p.id === lastMessage.sender_id);
        
        if (sender?.public_encryption_key) {
          const decrypted = decryptMessage(
            lastMessage.content,
            lastMessage.nonce || '',
            sender.public_encryption_key,
            keypair.secretKey
          );
          previewText = decrypted || '[Locked Transmission]';
        } else {
          previewText = '[Locked Transmission]';
        }
      } catch (e) {
        previewText = '[Scrambled...]';
      }
    } else if (lastMessage?.is_encrypted) {
      previewText = 'Authorize Seed Vault to decrypt...';
    }

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          dispatch(setSelectedChat(item.id));
          navigation.navigate('ChatScreen', { chatId: item.id, title: chatName });
        }}
      >
        <View style={styles.avatarContainer}>
          <Image source={typeof avatar === 'string' ? { uri: avatar } : avatar} style={styles.avatar} />
          {otherParticipant?.is_active && <View style={styles.onlineStatus} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{chatName}</Text>
            <Text style={styles.timestamp}>{formatTemporalTime(lastMessage?.created_at || item.updated_at)}</Text>
          </View>

          <View style={styles.chatFooter}>
            <View style={styles.previewContainer}>
              {isE2EE && Icons.Shield && (
                <View style={styles.shieldIconSmall}>
                  <Icons.Shield width={12} height={12} color={COLORS.brandPrimary} />
                </View>
              )}
              <Text style={styles.previewText} numberOfLines={1}>
                {previewText}
              </Text>
            </View>
            
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transmissions</Text>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => navigation.navigate('StartChatScreen')}
        >
          <Icons.PlusCircleIcon width={28} height={28} fill={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icons.SearchIcon width={18} height={18} color={COLORS.greyMid} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search .skr IDs..."
            placeholderTextColor={COLORS.greyMid}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlashList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        estimatedItemSize={80}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.brandPrimary} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>The Void is quiet...</Text>
            <Text style={styles.emptySubtext}>Materialize a new chat to begin.</Text>
          </View>
        )}
      />
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
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerIcon: {
    padding: 5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    marginLeft: 10,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#30363D',
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#238636',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    flex: 1,
  },
  timestamp: {
    fontSize: 13,
    color: COLORS.greyMid,
    marginLeft: 10,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewText: {
    fontSize: 15,
    color: COLORS.greyMid,
    flex: 1,
  },
  shieldIconSmall: {
    marginRight: 6,
    opacity: 0.8,
  },
  unreadBadge: {
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 10,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  unreadCount: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    marginTop: 100,
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
  }
});

export default CommsListScreen;
