import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageBubbleProps, MessageData, NFTData, NftListingData } from './message.types';
import { messageBubbleStyles } from './message.styles';
import { mergeStyles } from '@/core/thread/utils';
import { IPFSAwareImage, getValidImageSource, fixIPFSUrl } from '@/shared/utils/IPFSImage';
import MessageTradeCard from './MessageTradeCard';
import MessageNFT from './MessageNFT';
import COLORS from '@/assets/colors';
import { DEFAULT_IMAGES } from '@/shared/config/constants';
import Icons from '@/assets/svgs';
import { ThreadPost } from '@/core/thread/components/thread.types';
import BlinkMessage from './BlinkMessage';

// Custom Retweet icon
const RetweetIcon = ({ width = 14, height = 14, color = COLORS.greyLight }) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: width * 0.7, height: height * 0.7, borderWidth: 1.5, borderColor: color, borderRadius: 2 }}>
      <View style={{ position: 'absolute', top: -3, right: -3, width: width * 0.4, height: height * 0.4, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', bottom: -3, left: -3, width: width * 0.4, height: height * 0.4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  </View>
);

function MessageBubble({ message, isCurrentUser, themeOverrides, styleOverrides }: MessageBubbleProps) {
  const styles = mergeStyles(
    messageBubbleStyles,
    styleOverrides,
    undefined
  );

  // Logic Change: For regular messages, we should NOT prioritize additional_data as the source
  // because hardware signatures are stored there. We only use additional_data for 
  // specialized content like trades or NFTs.
  
  const hasAdditionalData = typeof message === 'object' && message !== null && 'additional_data' in message && message.additional_data !== null && message.additional_data !== undefined;
  
  // Content extraction - always prefer the root content/text for display
  const messageText = (message as any).content || (message as any).text || "";

  // Specialized content source (trades, NFTs)
  const specializedSource = hasAdditionalData ? (message as any).additional_data : message;

  // Check if this is a retweet
  const isRetweet = typeof message === 'object' && message !== null && 'retweetOf' in message && message.retweetOf !== undefined && message.retweetOf !== null;
  const isQuoteRetweet = isRetweet && typeof message === 'object' && message !== null && 'sections' in message && Array.isArray((message as any).sections) && (message as any).sections.length > 0;

  // Determine message style based on sender
  const bubbleStyle = [
    styles.container,
    isCurrentUser ? styles.currentUser : styles.otherUser
  ];

  // Determine text style based on sender
  const textStyle = [
    styles.text,
    isCurrentUser ? styles.currentUserText : styles.otherUserText
  ];

  const getContentType = (msg: MessageData | ThreadPost): string => {
    // Priority 1: Check root fields
    if ('tradeData' in msg && msg.tradeData) return 'trade';
    if ('nftData' in msg && msg.nftData) return 'nft';
    
    // Priority 2: Check additional_data for specialized types ONLY
    if (hasAdditionalData) {
        const ad = (msg as any).additional_data;
        if (ad.tradeData) return 'trade';
        if (ad.nftData) return 'nft';
        if (ad.image_url) return 'image';
    }

    if ('sections' in msg && Array.isArray(msg.sections)) {
      const sections = msg.sections as any[];
      if (sections.some(section => section && typeof section === 'object' && section.type === 'TEXT_TRADE' && section.tradeData)) return 'trade';
      if (sections.some(section => section && typeof section === 'object' && section.type === 'NFT_LISTING' && section.listingData)) return 'nft';
      if (sections.some(section => section && typeof section === 'object' && (section.type === 'TEXT_IMAGE' || section.imageUrl || section.type === 'TEXT_VIDEO' || section.videoUrl))) return 'media';
    }

    return 'text';
  };

  const contentType = getContentType(message);

  const getMediaUrls = (msg: any) => {
    if (msg.media && Array.isArray(msg.media)) return msg.media;
    if (msg.sections && Array.isArray(msg.sections)) {
      return msg.sections
        .filter((section: any) => section && typeof section === 'object' && (section.type === 'TEXT_IMAGE' || section.imageUrl))
        .map((section: any) => section.imageUrl || '');
    }
    // Check additional data
    if (typeof msg.additional_data === 'object' && msg.additional_data?.image_url) {
        return [msg.additional_data.image_url];
    }
    return [];
  };

  const tradeData = (specializedSource?.tradeData) || null;
  const rawNftData = (specializedSource?.nftData) || null;

  const nftData: NFTData | null = useMemo(() => {
    if (!rawNftData || typeof rawNftData !== 'object') return null;
    const listing = rawNftData as any;
    if (listing.collId || listing.isCollection) {
      return {
        id: listing.collId || listing.mint || 'unknown-id',
        name: listing.name || 'NFT Listing',
        description: listing.collectionDescription || listing.description || '',
        image: listing.image || listing.collectionImage || '',
        collectionName: listing.collectionName || '',
        mintAddress: listing.mint || '',
        isCollection: listing.isCollection || false,
        collId: listing.collId || '',
      };
    }
    return {
      id: listing.id || listing.mint || 'unknown-id',
      name: listing.name || 'Unknown NFT',
      image: listing.image || '',
      mintAddress: listing.mint || '',
      isCollection: !!listing.isCollection,
      collId: listing.collId || '',
    };
  }, [rawNftData]);

  const renderPostContent = (msg: any) => {
    const type = getContentType(msg);
    const contentText = msg.content || msg.text || "";

    switch (type) {
      case 'image':
        const imgUrl = msg.image_url || (typeof msg.additional_data === 'object' && msg.additional_data?.image_url);
        return (
          <View style={styles.messageContent}>
            <View style={styles.imageContainer}>
              <IPFSAwareImage
                source={getValidImageSource(imgUrl)}
                style={styles.messageImage}
                defaultSource={DEFAULT_IMAGES.placeholder}
                resizeMode="cover"
              />
            </View>
            {contentText ? <Text style={[textStyle, styles.imageCaption]}>{contentText}</Text> : null}
          </View>
        );
      case 'trade':
        if (tradeData) {
          const avatar = msg.user?.avatar || (typeof msg.additional_data === 'object' && msg.additional_data?.user?.avatar);
          return <MessageTradeCard tradeData={tradeData} isCurrentUser={isCurrentUser} userAvatar={avatar} />;
        }
        break;
      case 'nft':
        if (nftData) return <MessageNFT nftData={nftData} isCurrentUser={isCurrentUser} />;
        break;
      case 'media':
        const urls = getMediaUrls(msg);
        return (
          <View>
            {contentText ? <Text style={textStyle}>{contentText}</Text> : null}
            <View style={styles.mediaContainer}>
              {urls.map((url: string, idx: number) => (
                <IPFSAwareImage key={idx} source={getValidImageSource(url)} style={styles.mediaImage} resizeMode="cover" />
              ))}
            </View>
          </View>
        );
      case 'text':
      default:
        const solanaActionUrl = typeof contentText === 'string' ? contentText.match(/(solana-action:https?:\/\/\S+)|(https?:\/\/actions\.dialect\.to\/\S+)/)?.[0] : null;
        return (
          <View>
            <Text style={textStyle}>{contentText}</Text>
            {solanaActionUrl && <BlinkMessage url={solanaActionUrl} />}
          </View>
        );
    }
    return null;
  };

  if (contentType === 'trade' || contentType === 'nft') {
    return <View style={bubbleStyle}>{renderPostContent(message)}</View>;
  }

  return (
    <View style={bubbleStyle}>
      {isRetweet && (
        <View style={styles.retweetHeader}>
          <RetweetIcon />
          <Text style={styles.retweetText}>Reposted</Text>
        </View>
      )}
      {renderPostContent(message)}
    </View>
  );
}

export default MessageBubble;