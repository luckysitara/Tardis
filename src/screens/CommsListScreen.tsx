import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  TextInput,
  StatusBar,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchUserChats, setSelectedChat, ChatRoom } from '@/shared/state/chat/slice';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_IMAGES } from '@/shared/config/constants';
import { decryptMessage, getKeypairFromSeed } from '@/shared/utils/crypto';
import { Buffer } from 'buffer';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Formats a timestamp into a relative "Tardis" format
 */
const formatTemporalTime = (timestamp: string | Date | number | undefined) => {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
};

const CommsListScreen = () => {
  const insets = useSafeAreaInsets();
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
    const sorted = [...chats]
      .filter(chat => chat.type === 'direct' || chat.type === 'group')
      .sort((a, b) => {
        const timeA = new Date(a.lastMessage?.created_at || a.updated_at).getTime();
        const timeB = new Date(b.lastMessage?.created_at || b.updated_at).getTime();
        return timeB - timeA;
      });

    if (!searchQuery) return sorted;
    return sorted.filter(chat => {
      const otherParticipant = chat.participants?.find(p => p.id !== userId);
      const name = chat.name || otherParticipant?.username || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, userId]);

  const renderChatItem = ({ item }: { item: ChatRoom }) => {
    const isGroup = item.type === 'group' || item.type === 'global';
    const otherParticipant = item.participants?.find(p => p.id !== userId);
    const chatName = item.name || otherParticipant?.username || 'Seeker';
    
    const avatar = isGroup 
      ? (item.avatar_url || `https://api.dicebear.com/7.x/initials/png?seed=${chatName}`)
      : (otherParticipant?.profile_picture_url || `https://api.dicebear.com/7.x/initials/png?seed=${chatName}`);
      
    const lastMessage = item.lastMessage;
    const isE2EE = item.type === 'direct';

    let previewText = lastMessage ? lastMessage.content : 'New chat started';
    
    if (lastMessage?.is_encrypted && encryptionSeed && isE2EE) {
      try {
        const otherPk = otherParticipant?.public_encryption_key;
        if (otherPk && otherPk.length > 20) {
          const seedUint8 = new Uint8Array(Buffer.from(encryptionSeed, 'base64'));
          const keypair = getKeypairFromSeed(seedUint8);
          const decrypted = decryptMessage(
            lastMessage.content,
            lastMessage.nonce || '',
            otherPk,
            keypair.secretKey
          );
          previewText = decrypted || '[Encrypted]';
        } else {
          previewText = '[Encrypted]';
        }
      } catch (e) {
        previewText = '[Encrypted]';
      }
    }

    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() => {
          dispatch(setSelectedChat(item.id));
          navigation.navigate('ChatScreen', { chatId: item.id, title: chatName });
        }}
      >
        <View style={styles.avatarContainer}>
          <IPFSAwareImage
            source={getValidImageSource(avatar)}
            style={styles.avatar}
          />
          {otherParticipant?.is_active && <View style={styles.onlineStatus} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{chatName}</Text>
            <Text style={[styles.timestamp, item.unreadCount > 0 && styles.activeTimestamp]}>
              {formatTemporalTime(lastMessage?.created_at || (lastMessage as any)?.createdAt || item.updated_at)}
            </Text>
          </View>

          <View style={styles.chatFooter}>
            <View style={styles.previewContainer}>
              {isE2EE && (
                <Icons.Shield width={12} height={12} color={COLORS.brandPrimary} style={styles.shieldIcon} />
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => navigation.navigate('StartChatScreen')}
        >
          <Ionicons name="create-outline" size={26} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icons.SearchIcon width={16} height={16} color={COLORS.greyMid} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Direct Messages"
            placeholderTextColor={COLORS.greyMid}
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardAppearance="dark"
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
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.greyMid} />
            <Text style={styles.emptyText}>Welcome to your inbox</Text>
            <Text style={styles.emptySubtext}>Message anyone on Solana with end-to-end encryption.</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
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
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.darkerBackground,
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.brandGreen,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 12,
    marginBottom: -12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    flex: 1,
  },
  timestamp: {
    fontSize: 13,
    color: COLORS.greyMid,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  activeTimestamp: {
    color: COLORS.brandPrimary,
    fontWeight: '600',
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
    marginRight: 10,
  },
  shieldIcon: {
    marginRight: 4,
    opacity: 0.8,
  },
  previewText: {
    fontSize: 14,
    color: COLORS.greyMid,
    fontFamily: TYPOGRAPHY.fontFamily,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.greyMid,
    textAlign: 'center',
    lineHeight: 20,
  }
});

export default CommsListScreen;
