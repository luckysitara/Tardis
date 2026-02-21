export interface ThreadPost {
  id: string;
  parentId: string | null;
  user: {
    id: string;
    username: string;
    handle: string;
    avatar: string;
    publicEncryptionKey?: string;
    verified: boolean;
  };
  sections: Array<{
    id: string;
    type: 'TEXT_ONLY' | 'MEDIA';
    text?: string;
    mediaUrl?: string;
  }>;
  createdAt: string;
  replies: ThreadPost[]; // Nested replies
  reactionCount: number;
  retweetCount: number;
  quoteCount: number;
  reactions: Record<string, any>; // Adjust as per your reaction structure
  communityId?: string; // Optional community ID
  isPublic?: boolean; // Whether it's visible in Town Hall
  isBookmarked?: boolean; // Bookmark status for current user
}

export interface CreatePostPayload {
  author_wallet_address: string;
  author_skr_username: string;
  content: string;
  media_urls?: string[];
  signature: string;
  timestamp: string;
  community_id?: string;
  is_public?: boolean;
}

export interface FetchPostsParams {
  limit?: number;
  offset?: number;
  communityId?: string;
  userId?: string; // To check bookmark status
}