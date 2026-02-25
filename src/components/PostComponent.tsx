import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '@/shared/state/store';
import { useTardisMobileWallet } from '@/modules/wallet-providers/hooks/useTardisMobileWallet';
import { toggleBookmark } from '@/shared/state/post/slice';
import { SERVER_URL } from '@env';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import { Buffer } from 'buffer';
import TYPOGRAPHY from '@/assets/typography';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';

import type { ThreadPost } from '@/core/thread/components/thread.types';

const { width } = Dimensions.get('window');

const PostComponent: React.FC<ThreadPost> = (props) => {
  const navigation = useNavigation<any>();
  const {
    id,
    user,
    sections,
    createdAt,
    like_count,
    repost_count,
    reactionCount,
    retweetCount,
    isBookmarked: initialBookmarked
  } = props;

  // Map fields from either direct props (ThreadPost) or backend format
  const author_wallet_address = user?.id || (props as any).author_wallet_address;
  const author_skr_username = user?.username || (props as any).author_skr_username || 'Seeker User';
  
  // Use user.handle (which contains display_name from server) for displayName
  // Use user.username (immutable .skr) for handle
  const displayName = user?.handle || author_skr_username;
  
  // Ensure handle starts with @ and contains the full username including .skr
  const rawHandle = user?.username || author_skr_username;
  const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  
  const community_id = (props as any).community_id || (props as any).communityId;
  const is_public = (props as any).is_public || (props as any).isPublic;
  
  // Content extraction logic
  const getContent = () => {
    if (sections && sections.length > 0) {
      const textSection = sections.find(s => s.type === 'TEXT_ONLY' || s.text);
      if (textSection) return textSection.text;
    }
    return (props as any).content || '';
  };

  const getMedia = () => {
    // 1. Check sections for MEDIA type (used by ChatComposer for thread posts)
    if (sections && sections.length > 0) {
      const mediaSection = sections.find(s => s.type === 'MEDIA' || s.type === 'TEXT_IMAGE' || s.imageUrl || s.mediaUrl);
      if (mediaSection) return (mediaSection as any).mediaUrl || (mediaSection as any).imageUrl;
    }
    
    // 2. Check root media_urls (used by CreatePostScreen)
    const media_urls = (props as any).media_urls;
    if (media_urls) {
      try {
        const parsed = typeof media_urls === 'string' ? JSON.parse(media_urls) : media_urls;
        return Array.isArray(parsed) ? parsed[0] : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const content = getContent();
  const mediaUri = getMedia();
  const timestamp = createdAt || (props as any).timestamp || new Date().toISOString();
  const initialLikes = like_count || reactionCount || 0;
  const initialReposts = repost_count || retweetCount || 0;

  const [likes, setLikes] = useState(initialLikes);
  const [reposts, setReposts] = useState(initialReposts);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(!!initialBookmarked);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const dispatch = useDispatch<any>();
  const { signMessage } = useTardisMobileWallet();
  const userId = useSelector((state: RootState) => state.auth.address);
  const SERVER_BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || SERVER_URL || 'http://10.203.135.79:8085';

  const formatRelativeTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleBookmark = async () => {
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to bookmark posts.");
      return;
    }
    if (isBookmarking) return;

    setIsBookmarking(true);
    try {
      const result = await dispatch(toggleBookmark({ postId: id, userId })).unwrap();
      setIsBookmarked(result.bookmarked);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleComment = () => {
    navigation.navigate('CreatePost', { 
      parentId: id,
      authorHandle: handle
    });
  };

  const handleLike = async () => {
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to like posts.");
      return;
    }
    if (isLiking || isReposting) return;

    setIsLiking(true);
    try {
      const timestamp = new Date().toISOString();
      const messageToSign = `{"post_id":"${id}","user_wallet_address":"${userId}","timestamp":"${timestamp}"}`;
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
      }
    } catch (error) {
      console.error("Error liking post:", error);
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
      const messageToSign = `{"original_post_id":"${id}","reposter_wallet_address":"${userId}","timestamp":"${timestamp}"}`;
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
      }
    } catch (error) {
      console.error("Error reposting post:", error);
    } finally {
      setIsReposting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Left Column: Avatar */}
      <TouchableOpacity 
        style={styles.leftColumn}
        onPress={() => navigation.navigate('Profile', { userId: author_wallet_address })}
      >
        <IPFSAwareImage
          source={getValidImageSource(user?.avatar)}
          defaultSource={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${author_skr_username}` }}
          style={styles.avatar}
        />
      </TouchableOpacity>

      {/* Right Column: Content */}
      <View style={styles.rightColumn}>
        {/* Header: Name, Handle, Time, More */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerTextContainer}
            onPress={() => navigation.navigate('Profile', { userId: author_wallet_address })}
          >
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName}
              {/* Optional Verified Icon could go here */}
            </Text>
            <Text style={styles.handle} numberOfLines={1}>{handle}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{formatRelativeTime(timestamp)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Icons.Settings width={16} height={16} color={COLORS.greyMid} />
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        <View style={styles.contentContainer}>
          <Text style={styles.content}>{content}</Text>
          
          {mediaUri && (
            <IPFSAwareImage 
              source={getValidImageSource(mediaUri)} 
              style={styles.media} 
              resizeMode="cover" 
            />
          )}
        </View>

        {/* Action Bar */}
        <View style={styles.actions}>
          {/* Reply */}
          <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
            <Icons.CommentIcon width={18} height={18} color={COLORS.greyMid} />
            <Text style={styles.actionText}>{(props as any).replyCount || 0}</Text>
          </TouchableOpacity>

          {/* Repost */}
          <TouchableOpacity onPress={handleRepost} style={styles.actionButton} disabled={isReposting}>
             <Icons.RepostIcon width={18} height={18} color={isReposting ? COLORS.brandPrimary : COLORS.greyMid} />
             <Text style={[styles.actionText, reposts > 0 && { color: COLORS.white }]}>{reposts || ''}</Text>
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity onPress={handleLike} style={styles.actionButton} disabled={isLiking}>
            <Icons.HeartIcon 
              width={18} 
              height={18} 
              color={userHasLiked ? COLORS.brandPink : COLORS.greyMid}
              fill={userHasLiked ? COLORS.brandPink : 'transparent'} 
            />
            <Text style={[styles.actionText, userHasLiked && { color: COLORS.brandPink }]}>
              {likes || ''}
            </Text>
          </TouchableOpacity>
          
          {/* Share/Bookmark */}
           <TouchableOpacity style={styles.actionButton} onPress={handleBookmark}>
            <Icons.ShareIcon 
              width={18} 
              height={18} 
              color={isBookmarked ? COLORS.brandPrimary : COLORS.greyMid} 
            />
          </TouchableOpacity>
        </View>

        {/* Footer Hardware Status */}
        <View style={styles.statusFooter}>
           <Icons.Shield width={12} height={12} color={COLORS.brandPrimary} style={{ opacity: 0.7 }} />
           <Text style={styles.statusText}>Signed</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderDarkColor || 'rgba(255,255,255,0.1)',
    backgroundColor: COLORS.background,
  },
  leftColumn: {
    marginRight: 12,
  },
  rightColumn: {
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGrey,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  displayName: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
    marginRight: 4,
  },
  handle: {
    color: COLORS.greyMid,
    fontSize: 14,
    marginRight: 4,
  },
  dot: {
    color: COLORS.greyMid,
    fontSize: 14,
    marginRight: 4,
  },
  time: {
    color: COLORS.greyMid,
    fontSize: 14,
  },
  moreButton: {
    padding: 2,
  },
  contentContainer: {
    marginBottom: 8,
  },
  content: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: COLORS.lightGrey,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    maxWidth: '90%', // Keep actions from stretching too far
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 40,
  },
  actionText: {
    color: COLORS.greyMid,
    fontSize: 13,
    marginLeft: 6,
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    opacity: 0.6,
  },
  statusText: {
    color: COLORS.brandPrimary,
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '600',
  }
});

export default PostComponent;
