import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { resolveTardisIdentity } from '@/shared/services/IdentityService';
import { DEFAULT_IMAGES } from '@/shared/config/constants';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';

const UserChatItem = ({ user, onPress }) => {
  const [resolvedUsername, setResolvedUsername] = useState(user.username);
  const [resolvedHandle, setResolvedHandle] = useState(user.id.substring(0, 8) + '...' + user.id.substring(user.id.length - 4));

  useEffect(() => {
    const resolveIdentity = async () => {
      if (user?.id) {
        const handle = await resolveTardisIdentity(user.id, user.username);
        setResolvedUsername(handle);
        setResolvedHandle(handle.startsWith('@') ? handle : `@${handle}`);
      }
    };
    resolveIdentity();
  }, [user]);

  return (
    <TouchableOpacity style={styles.userItem} onPress={() => onPress(user)}>
      <Image 
        source={user.profile_picture_url ? { uri: user.profile_picture_url } : DEFAULT_IMAGES.user} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{resolvedUsername}</Text>
        <Text style={styles.userHandle}>{resolvedHandle}</Text>
      </View>
      <Icons.BackIcon 
        width={20} 
        height={20} 
        color={COLORS.greyMid} 
        style={{ transform: [{ rotate: '180deg' }] }} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});

export default UserChatItem;
