// src/shared/types/socialFeed.types.ts

export interface User {
  id: string;
  name: string;
  avatar: string; // URL to the user's profile picture
  // Add other relevant user fields as needed
}

export interface Post {
  id: string;
  userId: string;
  author: User;
  content: string; // The text content of the post
  media?: string[]; // Optional: Array of URLs to images/videos
  timestamp: string; // ISO 8601 string for when the post was created
  likesCount: number;
  repostsCount: number;
  isLikedByMe: boolean; // Indicates if the current user liked this post
  isRepostedByMe: boolean; // Indicates if the current user reposted this post
  signature?: string; // Optional: MWA signature of the post content
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  timestamp: string; // ISO 8601 string for when the like was created
  signature?: string; // Optional: MWA signature of the like action
}

export interface Repost {
  id: string;
  postId: string;
  userId: string;
  originalPostId: string; // ID of the post being reposted
  timestamp: string; // ISO 8601 string for when the repost was created
  signature?: string; // Optional: MWA signature of the repost action
}

export interface SocialFeedState {
  posts: Post[];
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}
