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

// Custom Retweet icon since it doesn't exist in the Icons object
const RetweetIcon = ({ width = 14, height = 14, color = COLORS.greyLight }) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: width * 0.7, height: height * 0.7, borderWidth: 1.5, borderColor: color, borderRadius: 2 }}>
      <View style={{ position: 'absolute', top: -3, right: -3, width: width * 0.4, height: height * 0.4, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', bottom: -3, left: -3, width: width * 0.4, height: height * 0.4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  </View>
);

function MessageBubble({ message, isCurrentUser, themeOverrides, styleOverrides }: MessageBubbleProps) {
  // Use utility function to merge styles
  const styles = mergeStyles(
    messageBubbleStyles,
    styleOverrides,
    undefined
  );

  // Determine the actual data source, safely checking for additional_data
  const hasAdditionalData = typeof message === 'object' && message !== null && 'additional_data' in message && message.additional_data !== null && message.additional_data !== undefined;
  const messageDataSource = hasAdditionalData ? (message as any).additional_data : message;

  // Check if this is a retweet
  const isRetweet = typeof message === 'object' && message !== null && 'retweetOf' in message && message.retweetOf !== undefined && message.retweetOf !== null;
  const isQuoteRetweet = isRetweet && typeof message === 'object' && message !== null && 'sections' in message && Array.isArray((message as any).sections) && (message as any).sections.length > 0;

  // Use the determined data source for display
  const postToDisplay = isRetweet && typeof message === 'object' && message !== null && (message as any).retweetOf ? (message as any).retweetOf : messageDataSource;

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

  // Update getContentType to check additional_data safely
  const getContentType = (msg: MessageData | ThreadPost): string => {
    const source = (typeof msg === 'object' && msg !== null && 'additional_data' in msg && msg.additional_data) ? msg.additional_data : msg;

    // Type guard to ensure source is not null/undefined if it came from additional_data
    if (!source || typeof source !== 'object') return 'text';

    if ('contentType' in source && source.contentType) return source.contentType;
    // Check specific data fields if they exist on the source
    if ('tradeData' in source && source.tradeData) return 'trade';
    if ('nftData' in source && source.nftData) return 'nft';
    if ('media' in source && source.media && Array.isArray(source.media) && source.media.length > 0) return 'media';
    if ('image_url' in source && source.image_url) return 'image';

    if ('sections' in source && Array.isArray(source.sections)) {
      const sections = source.sections as any[];
      if (sections.some(section => section && typeof section === 'object' && section.type === 'TEXT_TRADE' && section.tradeData)) return 'trade';
      if (sections.some(section => section && typeof section === 'object' && section.type === 'NFT_LISTING' && section.listingData)) return 'nft';
      if (sections.some(section => section && typeof section === 'object' && (section.type === 'TEXT_IMAGE' || section.imageUrl || section.type === 'TEXT_VIDEO' || section.videoUrl))) return 'media';
    }

    return 'text';
  };

  const contentType = getContentType(message);

  // Update getMessageText to check additional_data safely
  const getMessageText = (post: any) => {
    const source = (typeof post === 'object' && post !== null && 'additional_data' in post && post.additional_data) ? post.additional_data : post;
    if (!source || typeof source !== 'object') return '';
    return ('sections' in source && Array.isArray(source.sections))
      ? source.sections.map((section: any) => section?.text || '').join('\n')
      : (source.text || source.content || '');
  };

  const messageText = getMessageText(postToDisplay);

  // Update getMediaUrls to check additional_data safely
  const getMediaUrls = (post: any) => {
    const source = (typeof post === 'object' && post !== null && 'additional_data' in post && post.additional_data) ? post.additional_data : post;
    if (!source || typeof source !== 'object') return [];
    if ('media' in source && Array.isArray(source.media)) {
      return source.media;
    } else if ('sections' in source && Array.isArray(source.sections)) {
      return source.sections
        .filter((section: any) => section && typeof section === 'object' && (section.type === 'TEXT_IMAGE' || section.imageUrl))
        .map((section: any) => section.imageUrl || '');
    }
    return [];
  };

  const mediaUrls = getMediaUrls(postToDisplay);

  // Get trade data (check additional_data first)
  const getTradeDataFromSections = (post: any) => {
    if (typeof post === 'object' && post !== null && 'sections' in post && Array.isArray(post.sections)) {
      const tradeSection = post.sections.find((section: any) =>
        section && typeof section === 'object' && section.type === 'TEXT_TRADE' && section.tradeData
      );
      return tradeSection?.tradeData;
    }
    return null;
  };

  // Get NFT data (check additional_data first)
  const getNftDataFromSections = (post: any) => {
    if (typeof post === 'object' && post !== null && 'sections' in post && Array.isArray(post.sections)) {
      const nftSection = post.sections.find((section: any) =>
        section && typeof section === 'object' && section.type === 'NFT_LISTING' && section.listingData
      );

      if (nftSection?.listingData && typeof nftSection.listingData === 'object') {
        const listingData = nftSection.listingData;
        return {
          id: listingData.mint || nftSection.id || 'unknown-nft',
          name: listingData.name || 'NFT',
          description: listingData.collectionDescription || listingData.name || '',
          image: listingData.image || '',
          collectionName: listingData.collectionName || '',
          mintAddress: listingData.mint || ''
        };
      }
    }
    return null;
  };

  // Update tradeData retrieval with null check
  const tradeData =
    (hasAdditionalData && messageDataSource && typeof messageDataSource === 'object' && 'tradeData' in messageDataSource ? messageDataSource.tradeData :
      (postToDisplay && typeof postToDisplay === 'object' && 'tradeData' in postToDisplay && postToDisplay.tradeData) ||
      getTradeDataFromSections(postToDisplay)) || null;

  // Update nftData retrieval with null check
  const rawNftData =
    (hasAdditionalData && messageDataSource && typeof messageDataSource === 'object' && 'nftData' in messageDataSource ? messageDataSource.nftData :
      (postToDisplay && typeof postToDisplay === 'object' && 'nftData' in postToDisplay && postToDisplay.nftData) ||
      getNftDataFromSections(postToDisplay)) || null;

  // Harmonize rawNftData into the NFTData structure expected by MessageNFT
  const nftData: NFTData | null = useMemo(() => {
    if (!rawNftData || typeof rawNftData !== 'object') {
      return null;
    }

    if (('collId' in rawNftData && rawNftData.collId) || ('isCollection' in rawNftData && rawNftData.isCollection)) {
      const listing = rawNftData as any;
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

    else if ('id' in rawNftData && 'mintAddress' in rawNftData) {
      return {
        ...rawNftData,
        isCollection: ('isCollection' in rawNftData && rawNftData.isCollection) || false,
        collId: ('collId' in rawNftData && rawNftData.collId) || ''
      } as NFTData;
    }

    return {
      id: (('id' in rawNftData) ? (rawNftData as any).id : null) || (('mint' in rawNftData) ? (rawNftData as any).mint : null) || 'unknown-fallback-id',
      name: (('name' in rawNftData) ? (rawNftData as any).name : null) || 'Unknown NFT',
      image: (('image' in rawNftData) ? (rawNftData as any).image : null) || '',
      mintAddress: (('mint' in rawNftData) ? (rawNftData as any).mint : null) || '',
      isCollection: ('isCollection' in rawNftData && (rawNftData as any).isCollection) || false,
      collId: (('collId' in rawNftData) ? (rawNftData as any).collId : null) || '',
    };

  }, [rawNftData]);

  // Update renderPostContent to handle potential null source from additional_data
  const renderPostContent = (post: any) => {
    const source = (typeof post === 'object' && post !== null && 'additional_data' in post && post.additional_data) ? post.additional_data : post;

    if (!source || typeof source !== 'object') {
      return null;
    }

    const postContentType = getContentType(post);

    switch (postContentType) {
      case 'image':
        return (
          <View style={styles.messageContent}>
            <View style={styles.imageContainer}>
              <IPFSAwareImage
                source={getValidImageSource(source.image_url)}
                style={styles.messageImage}
                defaultSource={DEFAULT_IMAGES.placeholder}
                resizeMode="cover"
              />
            </View>
            {'text' in source && source.text && typeof source.text === 'string' && source.text.trim() !== '' && (
              <Text style={[textStyle, styles.imageCaption]}>{source.text}</Text>
            )}
          </View>
        );
      case 'trade':
        if (tradeData) {
          const avatar = (typeof post === 'object' && post !== null && post.user && typeof post.user === 'object') ? post.user.avatar : 
                         (typeof source === 'object' && source !== null && source.user && typeof source.user === 'object' ? source.user.avatar : null);
          return <MessageTradeCard tradeData={tradeData} isCurrentUser={isCurrentUser} userAvatar={avatar} />;
        }
        break;
      case 'nft':
        if (nftData) {
          return <MessageNFT nftData={nftData} isCurrentUser={isCurrentUser} />;
        }
        break;
      case 'media':
        const mediaDataSource = (typeof source === 'object' && source !== null && 'sections' in source && Array.isArray(source.sections)) ? source : post;
        return (
          <View>
            {getMessageText(mediaDataSource) && <Text style={textStyle}>{getMessageText(mediaDataSource)}</Text>}
            <View style={styles.mediaContainer}>
              {getMediaUrls(mediaDataSource).map((mediaUrl: string, index: number) => (
                <IPFSAwareImage key={`media-${index}`} source={getValidImageSource(mediaUrl)} style={styles.mediaImage} resizeMode="cover" />
              ))}
            </View>
          </View>
        );
      case 'text':
      default:
        const textToShow = source.text || source.content || (typeof post === 'object' && post !== null ? (post.text || post.content) : '') || '';
        
        const solanaActionUrl = typeof textToShow === 'string' ? textToShow.match(/(solana-action:https?:\/\/\S+)|(https?:\/\/actions\.dialect\.to\/\S+)/)?.[0] : null;

        return (
          <View>
            <Text style={textStyle}>{textToShow}</Text>
            {solanaActionUrl && <BlinkMessage url={solanaActionUrl} />}
          </View>
        );
    }
    return null;
  };

  // If this is a retweet, show it with the retweet header
  if (isRetweet && typeof message === 'object' && message !== null && (message as any).retweetOf) {
    const retweetOf = (message as any).retweetOf;
    // For quote retweets, show the user's added content first
    const quoteContent = isQuoteRetweet && typeof message === 'object' && message !== null && Array.isArray((message as any).sections) ? (
      <View style={styles.quoteContent}>
        {(message as any).sections.map((section: any, index: number) => (
          <Text key={`quote-${index}`} style={textStyle}>
            {section?.text || ''}
          </Text>
        ))}
      </View>
    ) : null;

    return (
      <View style={styles.retweetContainer}>
        <View style={styles.retweetHeader}>
          {Icons.RetweetIdle ? (
            <Icons.RetweetIdle width={12} height={12} color={COLORS.greyMid} />
          ) : (
            <View style={styles.retweetIcon} />
          )}
          <Text style={styles.retweetHeaderText}>
            {(typeof message === 'object' && message !== null && (message as any).user?.username) || 'User'} Retweeted
          </Text>
        </View>

        {quoteContent}

        <View style={styles.originalPostContainer}>
          <View style={styles.originalPostHeader}>
            <IPFSAwareImage
              source={
                retweetOf.user?.avatar
                  ? getValidImageSource(retweetOf.user.avatar)
                  : DEFAULT_IMAGES.user
              }
              style={styles.originalPostAvatar}
              defaultSource={DEFAULT_IMAGES.user}
            />
            <View>
              <Text style={styles.originalPostUsername}>
                {retweetOf.user?.username || 'User'}
              </Text>
              <Text style={styles.originalPostHandle}>
                {retweetOf.user?.handle || '@user'}
              </Text>
            </View>
          </View>

          {renderPostContent(retweetOf)}
        </View>
      </View>
    );
  }

  // For trade and NFT content, return without the bubble container
  if (contentType === 'trade' || contentType === 'nft') {
    return (
      <View style={bubbleStyle}>
        {renderPostContent(postToDisplay)}
      </View>
    );
  }

  // Render when the content type is text
  if (contentType === 'text') {
    return (
      <View style={bubbleStyle}>
        {isRetweet && (
          <View style={styles.retweetHeader}>
            <RetweetIcon />
            <Text style={styles.retweetText}>Retweet{isQuoteRetweet ? 'ed with comment' : ''}</Text>
          </View>
        )}
        <Text style={textStyle}>{messageText || ''}</Text>
      </View>
    );
  }

  // For text and media content, wrap in a bubble
  return (
    <View style={bubbleStyle}>
      {isRetweet && !isQuoteRetweet && (
        <View style={styles.retweetHeader}>
          <RetweetIcon width={14} height={14} color={COLORS.greyLight} />
          <Text style={styles.retweetText}>Reposted</Text>
        </View>
      )}
      {renderPostContent(postToDisplay)}
    </View>
  );
}

export default MessageBubble;