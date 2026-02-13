// server/src/types/socialFeed.d.ts

import { PublicKey } from '@solana/web3.js';

export interface UserProfile {
  id: string; // Wallet address as ID
  name: string;
  avatar: string; // URL to the user's profile picture
  // Add other backend-specific user fields like createdAt, etc.
}

export interface Post {
  id: string; // UUID or database ID
  userId: string; // Wallet address of the author
  content: string;
  mediaUrls?: string[]; // Array of URLs to images/videos
  signature: string; // MWA signature of the post content
  likesCount: number;
  repostsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  id: string; // UUID or database ID
  postId: string;
  userId: string; // Wallet address of the user who liked
  signature: string; // MWA signature of the like action
  createdAt: Date;
}

export interface Repost {
  id: string; // UUID or database ID
  postId: string;
  userId: string; // Wallet address of the user who reposted
  originalPostId: string; // ID of the original post (if this is a quote repost)
  signature: string; // MWA signature of the repost action
  createdAt: Date;
}

// Interfaces for request bodies
export interface CreatePostRequest {
  userId: string;
  content: string;
  mediaUrls?: string[];
  signature: string;
}

export interface LikeRepostRequest {
  postId: string;
  userId: string;
  signature: string;
}

export interface LikeRepostToggleResponse {
  postId: string;
  likesCount?: number;
  repostsCount?: number;
  isLikedByMe?: boolean;
  isRepostedByMe?: boolean;
}
