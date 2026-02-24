import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';

// Define common types to be used
type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
type FlexAlign = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
type FlexJustify = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
type Overflow = 'visible' | 'hidden' | 'scroll';

export function getMessageBaseStyles() {
  return StyleSheet.create({
    messageContainer: {
      marginBottom: 2, // Tighter grouping
      marginHorizontal: 12,
    },
    currentUserMessageContainer: {
      alignSelf: 'flex-end',
    },
    otherUserMessageContainer: {
      alignSelf: 'flex-start',
    },
    // Header styles
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      paddingHorizontal: 4,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginRight: 8,
      backgroundColor: COLORS.gray,
    },
    username: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.greyMid,
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    userInfoContainer: {
      flexDirection: 'column',
    },
    headerTimestamp: {
      fontSize: 11,
      color: COLORS.greyMid,
      marginTop: 2,
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    // Footer styles
    footerContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 2,
    },
    timestamp: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.5)',
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    currentUserTimestamp: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    readStatus: {
      marginLeft: 4,
    },
  });
}

export const messageBubbleStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 1,
    minWidth: 80, // Ensure small messages aren't too thin
  },
  currentUser: {
    backgroundColor: COLORS.brandBlue,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  otherUser: {
    backgroundColor: '#2F3336', // X-like Dark Grey
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily,
    lineHeight: 22,
    fontWeight: '400',
  },
  currentUserText: {
    color: COLORS.white,
  },
  otherUserText: {
    color: COLORS.white,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    alignSelf: 'flex-end',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  sectionContainer: {
    marginTop: 8,
    width: '100%',
  },
  messageContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  imageContainer: {
    marginTop: 8,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  messageImage: {
    width: 260,
    height: 200,
    borderRadius: 16,
  },
  imageCaption: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    lineHeight: 18,
  },
  retweetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  retweetText: {
    fontSize: 12,
    color: COLORS.greyMid,
    marginLeft: 6,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  // Media container styles
  mediaContainer: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 240,
    height: 180,
    borderRadius: 12,
    marginBottom: 4,
  },
  // Retweet styles
  retweetContainer: {
    backgroundColor: COLORS.lighterBackground,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quoteContent: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  originalPostContainer: {
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  originalPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalPostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  originalPostUsername: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
      originalPostHandle: {
      fontSize: TYPOGRAPHY.size.xs,
      color: COLORS.greyMid,
      marginTop: 2,
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    tipCard: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      marginTop: 4,
      minWidth: 200,
    },
    tipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tipTitle: {
      color: COLORS.greyMid,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    tipAmount: {
      color: COLORS.white,
      fontSize: 18,
      fontWeight: '800',
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    viewOnSolana: {
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    viewOnSolanaText: {
      color: COLORS.brandPrimary,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      fontFamily: TYPOGRAPHY.fontFamily,
    },
    reactionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 6,
    },
    reactionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 4,
      marginBottom: 4,
    },
    reactionEmoji: {
      fontSize: 12,
    },
    reactionCount: {
      color: COLORS.white,
      fontSize: 10,
      marginLeft: 2,
      fontWeight: '600',
    },
    quotedMessageContainer: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderRadius: 8,
      padding: 8,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: COLORS.brandPrimary,
    },
    quotedIndicator: {
      width: 2,
      backgroundColor: COLORS.brandPrimary,
      marginRight: 8,
    },
    quotedTextContainer: {
      flex: 1,
    },
    quotedUser: {
      color: COLORS.brandPrimary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 2,
    },
    quotedContent: {
      color: COLORS.greyMid,
      fontSize: 12,
    },
  });
  export const messageHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
    width: '100%',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(50, 212, 222, 0.2)',
    shadowColor: COLORS.brandBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoContainer: {
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    flexShrink: 1,
  },
  headerTimestamp: {
    fontSize: 11,
    color: COLORS.greyMid,
    marginTop: 2,
    fontFamily: TYPOGRAPHY.fontFamily,
    flexShrink: 1,
  },
});

export const messageFooterStyles = StyleSheet.create<{
  container: ViewStyle;
  timestamp: TextStyle;
  currentUserTimestamp: TextStyle;
  readStatus: ViewStyle;
}>({
  container: getMessageBaseStyles().footerContainer as ViewStyle,
  timestamp: getMessageBaseStyles().timestamp as TextStyle,
  currentUserTimestamp: getMessageBaseStyles().currentUserTimestamp as TextStyle,
  readStatus: getMessageBaseStyles().readStatus as ViewStyle,
}); 