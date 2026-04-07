import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MessageHeaderProps } from './message.types';
import { messageHeaderStyles } from './message.styles';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import { DEFAULT_IMAGES } from '@/shared/config/constants';

function MessageHeader({ message, showAvatar = true, onPressUser }: MessageHeaderProps) {
  // Handle ThreadPost or MessageData types
  const user = message.user;

  // Skip header if it shouldn't be shown
  if (!showAvatar) return null;

  const handleUserPress = () => {
    if (onPressUser && user) {
      onPressUser(user);
    }
  };

  // Format the timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Get timestamp from different message types
  const timestamp = message.created_at || (message as any).createdAt || '';

  return (
    <View style={messageHeaderStyles.container}>
      <TouchableOpacity
        style={messageHeaderStyles.left}
        onPress={handleUserPress}
        disabled={!onPressUser}
      >
        {showAvatar && (
          <IPFSAwareImage
            source={
              (user.avatar || (user as any).profile_picture_url)
                ? getValidImageSource(user.avatar || (user as any).profile_picture_url)
                : DEFAULT_IMAGES.user
            }
            style={messageHeaderStyles.avatar}
            defaultSource={DEFAULT_IMAGES.user}
          />
        )}
        <View style={messageHeaderStyles.userInfoContainer}>
          <Text style={messageHeaderStyles.username}>
            {user.username || 'Anonymous'}
          </Text>
          <Text style={messageHeaderStyles.headerTimestamp}>
            {formatTimestamp(timestamp)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default MessageHeader; 