// src/components/socialFeed/PostItem.tsx

import React, { useState } from 'react'; // Import useState for local loading state
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Post } from '@/shared/types/socialFeed.types';
import { Colors } from '@/styles/theme';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { likePost, repostPost } from '@/shared/state/socialFeed/slice';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet'; // Import useWallet
import * as base58 from 'bs58'; // For base58 encoding

const { width } = Dimensions.get('window');

interface PostItemProps {
  post: Post;
}

const PostItem: React.FC<PostItemProps> = ({ post }) => {
  const dispatch = useAppDispatch();
  const { connected, address, signMessage } = useWallet(); // Get wallet state and signing function
  const [isLikingOrReposting, setIsLikingOrReposting] = useState(false); // Local loading state for interactions

  const currentUserId = useAppSelector(state => state.auth.address); 

  const handleInteraction = async (type: 'like' | 'repost', isPerforming: boolean) => {
    if (!currentUserId || !connected || !address) {
      Alert.alert('Error', 'Please connect your wallet to perform this action.');
      return;
    }
    setIsLikingOrReposting(true);
    let signatureString: string | undefined;

    try {
      const messageContent = `${type}:${post.id}:${address}`;
      const encoder = new TextEncoder();
      const message = encoder.encode(messageContent);
      const signature = await signMessage(message);
      signatureString = base58.encode(signature);
      console.log(`${type} action signed successfully:`, signatureString);
    } catch (error: any) {
      Alert.alert('Signing Failed', `Could not sign your ${type} action: ${error.message || 'Unknown error'}`);
      setIsLikingOrReposting(false);
      return;
    }

    try {
      if (type === 'like') {
        await dispatch(likePost({ postId: post.id, userId: currentUserId, isLiking: isPerforming, signature: signatureString })).unwrap();
      } else { // type === 'repost'
        await dispatch(repostPost({ postId: post.id, userId: currentUserId, isReposting: isPerforming, signature: signatureString })).unwrap();
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to ${type} post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLikingOrReposting(false);
    }
  };

  const handleLike = () => {
    handleInteraction('like', !post.isLikedByMe);
  };

  const handleRepost = () => {
    handleInteraction('repost', !post.isRepostedByMe);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
        <View>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.timestamp}>{new Date(post.timestamp).toLocaleString()}</Text>
        </View>
      </View>
      <Text style={styles.content}>{post.content}</Text>
      {post.media && post.media.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.media.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.media} resizeMode="cover" />
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionButton} disabled={isLikingOrReposting}>
          {isLikingOrReposting ? (
            <ActivityIndicator size="small" color={Colors.gray} />
          ) : (
            <Ionicons name={post.isLikedByMe ? "heart" : "heart-outline"} size={20} color={post.isLikedByMe ? Colors.red : Colors.gray} />
          )}
          <Text style={styles.actionText}>{post.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRepost} style={styles.actionButton} disabled={isLikingOrReposting}>
          {isLikingOrReposting ? (
            <ActivityIndicator size="small" color={Colors.gray} />
          ) : (
            <Ionicons name={post.isRepostedByMe ? "repeat" : "repeat-outline"} size={20} color={post.isRepostedByMe ? Colors.green : Colors.gray} />
          )}
          <Text style={styles.actionText}>{post.repostsCount}</Text>
        </TouchableOpacity>
        {post.signature && (
          <View style={styles.signatureIndicator}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.sonicCyan} />
            <Text style={styles.signatureText}>Signed</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.deepSpace,
    borderRadius: 10,
    marginVertical: 8,
    marginHorizontal: 15,
    padding: 15,
    borderColor: Colors.tardisBlue + '50',
    borderWidth: 1,
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
  },
  authorName: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  timestamp: {
    color: Colors.gray,
    fontSize: 12,
  },
  content: {
    color: Colors.white,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  mediaContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  media: {
    width: width - 60,
    height: width * 0.6,
    borderRadius: 8,
    marginVertical: 5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: Colors.gray,
    fontSize: 14,
    marginLeft: 5,
  },
  signatureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: Colors.tardisBlue + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
  },
  signatureText: {
    color: Colors.sonicCyan,
    fontSize: 12,
    marginLeft: 4,
  },
});

export default PostItem;
