import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/shared/state/store';
import { useTardisMobileWallet } from '@/modules/wallet-providers/hooks/useTardisMobileWallet';
import { SERVER_URL } from '@env';
import COLORS from '@/assets/colors';

import type { ThreadPost } from '@/core/thread/components/thread.types';

const PostComponent: React.FC<ThreadPost> = ({
  id,
  user,
  sections,
  createdAt,
  like_count,
  repost_count,
  reactionCount,
  retweetCount,
}) => {
  // Map fields from either direct props (ThreadPost) or backend format
  const author_wallet_address = user?.id;
  const author_skr_username = user?.username || 'Seeker User';
  const content = sections?.[0]?.text || '';
  const mediaUri = sections?.[0]?.imageUrl; // Extract from section if exists
  const timestamp = createdAt;
  const initialLikes = reactionCount || like_count || 0;
  const initialReposts = retweetCount || repost_count || 0;

  const [likes, setLikes] = useState(initialLikes);
  const [reposts, setReposts] = useState(initialReposts);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [userHasLiked, setUserHasLiked] = useState(false);

  const { signMessage } = useTardisMobileWallet();
  const userId = useSelector((state: RootState) => state.auth.address);
  const SERVER_BASE_URL = SERVER_URL || 'http://192.168.1.175:8080';

  const handleLike = async () => {
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to like posts.");
      return;
    }
    if (isLiking || isReposting) return;

    setIsLiking(true);
    try {
      const timestamp = new Date().toISOString();
      // DETERMINISTIC: Keys must be in this exact order for backend verification
      const messageToSign = `{"post_id":"${id}","user_wallet_address":"${userId}","timestamp":"${timestamp}"}`;

      console.log("[PostComponent] Requesting MWA signature for Like:", messageToSign);
      const engagementSignature = await signMessage(messageToSign);

      if (!engagementSignature) {
        setIsLiking(false);
        return;
      }

      const signatureBase64 = Buffer.from(engagementSignature).toString('base64');

      const response = await fetch(`${SERVER_BASE_URL}/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_wallet_address: userId,
          signature: signatureBase64,
          timestamp: timestamp,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLikes(prev => result.liked ? prev + 1 : prev - 1);
        setUserHasLiked(result.liked);
      } else {
        Alert.alert("Error", result.error || "Failed to like post.");
      }
    } catch (error) {
      console.error("Error liking post:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = async () => {
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to repost.");
      return;
    }
    if (isLiking || isReposting) return;

    setIsReposting(true);
    try {
      const timestamp = new Date().toISOString();
      // DETERMINISTIC: Keys must be in this exact order for backend verification
      const messageToSign = `{"original_post_id":"${id}","reposter_wallet_address":"${userId}","timestamp":"${timestamp}"}`;

      console.log("[PostComponent] Requesting MWA signature for Repost:", messageToSign);
      const engagementSignature = await signMessage(messageToSign);

      if (!engagementSignature) {
        setIsReposting(false);
        return;
      }

      const signatureBase64 = Buffer.from(engagementSignature).toString('base64');

      const response = await fetch(`${SERVER_BASE_URL}/api/posts/${id}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reposter_wallet_address: userId,
          signature: signatureBase64,
          timestamp: timestamp,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setReposts(prev => prev + 1);
        Alert.alert("Success", "Post hardware-reposted!");
      } else {
        Alert.alert("Error", result.error || "Failed to repost.");
      }
    } catch (error) {
      console.error("Error reposting post:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setIsReposting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${author_skr_username}` }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.username}>{author_skr_username}</Text>
          <Text style={styles.signedBadge}>✅ Hardware Signed</Text>
        </View>
      </View>

      <Text style={styles.content}>{content}</Text>

      {mediaUri && (
        <Image source={{ uri: mediaUri }} style={styles.media} resizeMode="cover" />
      )}

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionButton} disabled={isLiking || isReposting}>
          {isLiking ? (
            <ActivityIndicator size="small" color={COLORS.brandPrimary} />
          ) : (
            <Text style={[styles.actionText, userHasLiked && { color: COLORS.brandPink }]}>
              {userHasLiked ? '❤️' : '🤍'} {likes}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRepost} style={styles.actionButton} disabled={isLiking || isReposting}>
          {isReposting ? (
            <ActivityIndicator size="small" color={COLORS.brandPrimary} />
          ) : (
            <Text style={styles.actionText}>🔄 {reposts}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.timestamp}>{new Date(timestamp).toLocaleDateString()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: COLORS.gray,
  },
  username: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  signedBadge: {
    color: COLORS.brandPrimary,
    fontSize: 12,
  },
  content: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  media: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: COLORS.gray,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDarkColor,
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  actionText: {
    color: COLORS.greyMid || '#B7B7B7',
    fontSize: 14,
    marginLeft: 5,
  },
  timestamp: {
    color: COLORS.greyMid || '#B7B7B7',
    fontSize: 12,
  },
});

export default PostComponent;
