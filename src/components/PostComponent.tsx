import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import COLORS from '@/assets/colors';

type PostProps = {
  id: string;
  username: string; // .skr username
  content: string;
  mediaUri?: string; // Optional: URL for image/video thumbnail
  timestamp: string;
  isSigned: boolean; // Indicates hardware-signed post
  likes: number;
  reposts: number;
};

const PostComponent: React.FC<PostProps> = ({
  id,
  username,
  content,
  mediaUri,
  timestamp,
  isSigned,
  likes: initialLikes,
  reposts: initialReposts,
}) => {
  const [likes, setLikes] = useState(initialLikes);
  const [reposts, setReposts] = useState(initialReposts);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

  // Simulated off-chain signing function for engagement
  const simulateOffChainEngagementSigning = async (action: 'like' | 'repost', postId: string) => {
    console.log(`Simulating off-chain signing for ${action} on post ${postId}`);
    return new Promise(resolve => {
      setTimeout(() => {
        const signedEngagement = `SIGNED_ENGAGEMENT_${action.toUpperCase()}_POST_${postId}_BY_SEED_VAULT_${Date.now()}`;
        console.log(`Off-chain signing complete for ${action}. Signed engagement:`, signedEngagement);
        resolve(signedEngagement);
      }, 1000); // Simulate network delay for signing
    });
  };

  const handleLike = async () => {
    if (isLiking || isReposting) return; // Prevent multiple simultaneous actions
    setIsLiking(true);
    try {
      const signedEngagement = await simulateOffChainEngagementSigning('like', id);
      console.log(`Sending signed like to backend for post ${id}:`, signedEngagement);
      // In a real app, you would make an API call to record the like.
      // Assuming success, update UI:
      setLikes(prev => prev + 1);
    } catch (error) {
      console.error("Error liking post:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = async () => {
    if (isLiking || isReposting) return; // Prevent multiple simultaneous actions
    setIsReposting(true);
    try {
      const signedEngagement = await simulateOffChainEngagementSigning('repost', id);
      console.log(`Sending signed repost to backend for post ${id}:`, signedEngagement);
      // In a real app, you would make an API call to record the repost.
      // Assuming success, update UI:
      setReposts(prev => prev + 1);
    } catch (error) {
      console.error("Error reposting post:", error);
    } finally {
      setIsReposting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* User Info and Signed Badge */}
      <View style={styles.header}>
        <Image
          source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${username}` }} // Placeholder avatar
          style={styles.avatar}
        />
        <View>
          <Text style={styles.username}>{username}</Text>
          {isSigned && (
            <Text style={styles.signedBadge}>✅ Hardware Signed</Text>
          )}
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.content}>{content}</Text>

      {/* Media */}
      {mediaUri && (
        <Image source={{ uri: mediaUri }} style={styles.media} resizeMode="cover" />
      )}

      {/* Engagement Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionButton} disabled={isLiking || isReposting}>
          {isLiking ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : <Text style={styles.actionText}>❤️ {likes}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRepost} style={styles.actionButton} disabled={isLiking || isReposting}>
          {isReposting ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : <Text style={styles.actionText}>🔄 {reposts}</Text>}
        </TouchableOpacity>
        <Text style={styles.timestamp}>{new Date(timestamp).toLocaleString()}</Text>
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
    color: COLORS.gray,
    fontSize: 14,
    marginLeft: 5,
  },
  timestamp: {
    color: COLORS.gray,
    fontSize: 12,
  },
});

export default PostComponent;

