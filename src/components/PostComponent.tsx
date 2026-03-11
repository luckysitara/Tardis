import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '@/shared/state/store';
import { useTardisMobileWallet } from '@/modules/wallet-providers/hooks/useTardisMobileWallet';
import { useDomainLookup } from '@/shared/hooks/useDomainLookup';
import { toggleBookmark, deletePost } from '@/shared/state/post/slice';
import { HighlightedText } from '@/shared/components/HighlightedText';
import { ProductBlinkCard } from '@/shared/components/ProductBlinkCard';
import { SERVER_URL } from '@env';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import { Buffer } from 'buffer';
import TYPOGRAPHY from '@/assets/typography';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';

import type { ThreadPost } from '@/core/thread/components/thread.types';

const { width } = Dimensions.get('window');

interface PostComponentProps extends ThreadPost {
  isThreadView?: boolean;
}

const PostComponent: React.FC<PostComponentProps> = (props) => {
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
    isBookmarked: initialBookmarked,
    isLiked: initialLiked,
    feedType,
    repostedBy,
    replyToUsername,
    originalPostId,
    showThreadLine,
    isThreadView = false
  } = props;

  // Interaction ID should be the original post ID (if it's a repost)
  const interactionId = originalPostId || id;

  const handlePostPress = () => {
    if (isThreadView) return;
    navigation.navigate('ThreadDetail', { postId: interactionId });
  };

  const { resolveAddress } = useDomainLookup();

  const truncateAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Map fields from either direct props (ThreadPost) or backend format
  const author_wallet_address = user?.id || (props as any).author_wallet_address || (props as any).userId;
  const author_skr_username = user?.username || (props as any).author_skr_username || (props as any).authorName;
  
  const isWalletAddress = (val: string) => val && val.length > 30 && !val.includes('.');

  // 1. Initial Display Name Resolution
  const getInitialDisplayName = () => {
    if (user?.handle && !isWalletAddress(user.handle)) return user.handle;
    if (author_skr_username && !isWalletAddress(author_skr_username)) return author_skr_username;
    return author_wallet_address ? truncateAddress(author_wallet_address) : 'Seeker User';
  };

  // 2. Initial Handle Resolution
  const getInitialHandle = () => {
    let raw = author_wallet_address ? truncateAddress(author_wallet_address) : 'unknown';
    if (user?.username && !isWalletAddress(user.username)) raw = user.username;
    else if (author_skr_username && !isWalletAddress(author_skr_username)) raw = author_skr_username;
    return raw.startsWith('@') ? raw : `@${raw}`;
  };

  const [displayName, setDisplayName] = useState(getInitialDisplayName());
  const [handle, setHandle] = useState(getInitialHandle());

  // Effect to resolve .skr if we only have an address
  useEffect(() => {
    const resolveSkr = async () => {
      if (author_wallet_address && (isWalletAddress(displayName) || isWalletAddress(handle.replace('@', '')))) {
        try {
          const result = await resolveAddress(author_wallet_address);
          if (result.domain) {
            setDisplayName(result.domain);
            setHandle(`@${result.domain}`);
          }
        } catch (e) {
          // Silent fail for resolution
        }
      }
    };
    resolveSkr();
  }, [author_wallet_address]);
  
  const community_id = (props as any).community_id || (props as any).communityId;
  const is_public = (props as any).is_public || (props as any).isPublic;
  
  const isRepost = feedType === 'repost' || !!repostedBy;
  
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

  const rawContent = String(getContent());
  const mediaUri = getMedia();
  
  // Extract Blink URL if present
  const blinkMatch = rawContent.match(/solana-action:[^\s]+/);
  const solanaActionUrl = blinkMatch ? blinkMatch[0] : null;
  
  // Create clean content for display (remove the Blink URL)
  const displayContent = solanaActionUrl 
    ? rawContent.replace(solanaActionUrl, '').trim() 
    : rawContent;

  if (solanaActionUrl) {
    console.log(`[PostComponent] Blink detected in post ${id}:`, solanaActionUrl);
  }
  const timestamp = createdAt || (props as any).timestamp || new Date().toISOString();
  const initialLikes = like_count || reactionCount || 0;
  const initialReposts = repost_count || retweetCount || 0;

  const [likes, setLikes] = useState(initialLikes);
  const [reposts, setReposts] = useState(initialReposts);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [userHasLiked, setUserHasLiked] = useState(!!initialLiked);
  const [isBookmarked, setIsBookmarked] = useState(!!initialBookmarked);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const dispatch = useDispatch<any>();
  const { signMessage } = useTardisMobileWallet();
  const userId = useSelector((state: RootState) => state.auth.address);
  const SERVER_BASE_URL = 'https://seek.kikhaus.com';

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
      const result = await dispatch(toggleBookmark({ postId: interactionId, userId })).unwrap();
      setIsBookmarked(result.bookmarked);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleComment = () => {
    navigation.navigate('CreatePost', { 
      parentId: interactionId,
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
      const messageToSign = `{"post_id":"${interactionId}","user_wallet_address":"${userId}","timestamp":"${timestamp}"}`;
      const engagementSignature = await signMessage(messageToSign);

      if (!engagementSignature) {
        setIsLiking(false);
        return;
      }

      const signatureBase64 = Buffer.from(engagementSignature).toString('base64');
      const response = await fetch(`${SERVER_BASE_URL}/api/posts/${interactionId}/like`, {
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

  const handleMoreActions = async () => {
    if (!userId) {
      Alert.alert("Authentication Required", "Please connect your wallet to see more actions.");
      return;
    }

    const isAuthor = userId && author_wallet_address && userId.toLowerCase() === author_wallet_address.toLowerCase();
    
    // We'll use Alert.alert to simulate a menu
    const buttons: any[] = [
      {
        text: 'Cancel',
        style: 'cancel',
      }
    ];

    if (isAuthor) {
      buttons.unshift({
        text: 'Delete Post',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Delete", 
                style: "destructive", 
                onPress: async () => {
                  try {
                    const timestamp = new Date().toISOString();
                    // Message format: {"id":"...","author_wallet_address":"...","timestamp":"..."}
                    const messageToSign = JSON.stringify({ 
                      id: interactionId, 
                      author_wallet_address: userId, 
                      timestamp 
                    });
                    
                    const signature = await signMessage(messageToSign);
                    if (!signature) return;

                    const signatureBase64 = Buffer.from(signature).toString('base64');
                    
                    const result = await dispatch(deletePost({
                      postId: interactionId,
                      author_wallet_address: userId!,
                      signature: signatureBase64,
                      timestamp
                    })).unwrap();
                    
                    if (result.success) {
                      // Success is handled by reducer removing the post from state
                    }
                  } catch (error: any) {
                    console.error("Error deleting post:", error);
                    Alert.alert("Error", error || "Failed to delete post.");
                  }
                } 
              }
            ]
          );
        }
      });
    }

    Alert.alert('Post Actions', 'Choose an action', buttons);
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
      const messageToSign = `{"original_post_id":"${interactionId}","reposter_wallet_address":"${userId}","timestamp":"${timestamp}"}`;
      const engagementSignature = await signMessage(messageToSign);

      if (!engagementSignature) {
        setIsReposting(false);
        return;
      }

      const signatureBase64 = Buffer.from(engagementSignature).toString('base64');
      const response = await fetch(`${SERVER_BASE_URL}/api/posts/${interactionId}/repost`, {
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
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePostPress}
      activeOpacity={0.9}
    >
      {/* Repost Header */}
      {isRepost && (
        <View style={styles.repostHeader}>
          <Icons.RepostIcon width={12} height={12} color={COLORS.greyMid} />
          <Text style={styles.repostHeaderText}>
            {repostedBy?.displayName || repostedBy?.username || 'Someone'} Reposted
          </Text>
        </View>
      )}

      <View style={styles.mainRow}>
        {/* Left Column: Avatar */}
        <TouchableOpacity 
          style={styles.leftColumn}
          onPress={() => navigation.navigate('Profile', { userId: author_wallet_address })}
        >
          <View style={styles.avatarContainer}>
            <IPFSAwareImage
              source={getValidImageSource(user?.avatar)}
              defaultSource={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${author_skr_username}` }}
              style={styles.avatar}
            />
            {showThreadLine && <View style={styles.threadLine} />}
          </View>
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
              </Text>
              {user?.verified && (
                <Icons.Shield width={12} height={12} color={COLORS.brandPrimary} style={{ marginRight: 4 }} />
              )}
              <Text style={styles.handle} numberOfLines={1}>{handle}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.time}>{formatRelativeTime(timestamp)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton} onPress={handleMoreActions}>
              <Icons.Settings width={16} height={16} color={COLORS.greyMid} />
            </TouchableOpacity>
          </View>

          {/* Reply Context */}
          {replyToUsername && (
            <Text style={styles.replyingToText}>
              Replying to <Text style={styles.replyingToHandle}>@{replyToUsername}</Text>
            </Text>
          )}

          {/* Content Body */}
          <View style={styles.contentContainer}>
            {displayContent ? <HighlightedText text={displayContent} style={styles.content} /> : null}
            
            {solanaActionUrl && (
              <ProductBlinkCard 
                url={solanaActionUrl} 
                mediaUrls={(props as any).media_urls || (props as any).mediaUrls}
              />
            )}

            {mediaUri && !solanaActionUrl && (
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderDarkColor || 'rgba(255,255,255,0.1)',
    backgroundColor: COLORS.background,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
    marginBottom: 4,
  },
  repostHeaderText: {
    color: COLORS.greyMid,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  mainRow: {
    flexDirection: 'row',
  },
  leftColumn: {
    marginRight: 12,
  },
  avatarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  threadLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.borderDarkColor || 'rgba(255,255,255,0.1)',
    marginTop: 4,
    marginBottom: -12, // Extend into the padding of the next item
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
    marginBottom: 2,
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
  replyingToText: {
    color: COLORS.greyMid,
    fontSize: 13,
    marginBottom: 4,
  },
  replyingToHandle: {
    color: COLORS.brandPrimary,
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
