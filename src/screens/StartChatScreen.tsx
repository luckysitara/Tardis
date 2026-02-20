import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { fetchUsersForChat, createDirectChat } from '@/shared/state/chat/slice';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { DEFAULT_IMAGES } from '@/shared/config/constants';

const StartChatScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { address: userId } = useAppSelector(state => state.auth);
  const { usersForChat, loadingUsers } = useAppSelector(state => state.chat);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Initial fetch of users
    dispatch(fetchUsersForChat({ userId: userId || '' }));
  }, [dispatch, userId]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    dispatch(fetchUsersForChat({ query: text, userId: userId || '' }));
  };

  const handleStartChat = async (otherUser: any) => {
    if (!userId) return;

    try {
      const result = await dispatch(createDirectChat({ 
        userId, 
        otherUserId: otherUser.id 
      })).unwrap();

      if (result.success && result.chatId) {
        navigation.replace('ChatScreen', { 
          chatId: result.chatId, 
          title: otherUser.username 
        });
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => handleStartChat(item)}
    >
      <Image 
        source={item.profile_picture_url ? { uri: item.profile_picture_url } : DEFAULT_IMAGES.user} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.userHandle}>{item.id.substring(0, 8)}...{item.id.substring(item.id.length - 4)}</Text>
      </View>
      <Icons.BackIcon 
        width={20} 
        height={20} 
        color={COLORS.greyMid} 
        style={{ transform: [{ rotate: '180deg' }] }} 
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icons.SearchIcon width={18} height={18} color={COLORS.greyMid} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by .skr ID or wallet..."
            placeholderTextColor={COLORS.greyMid}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>
      </View>

      {loadingUsers ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={usersForChat}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No seekers found in this sector.</Text>
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
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  closeButton: {
    width: 60,
  },
  closeText: {
    color: COLORS.brandPrimary,
    fontSize: 16,
  },
  searchContainer: {
    padding: 15,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    marginLeft: 10,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#30363D',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  userHandle: {
    fontSize: 14,
    color: COLORS.greyMid,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: COLORS.greyMid,
    fontSize: 16,
  },
});

export default StartChatScreen;
