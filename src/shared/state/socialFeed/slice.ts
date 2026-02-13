// src/shared/state/socialFeed/slice.ts

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Post, User, SocialFeedState } from '@/shared/types/socialFeed.types'; // Assuming Like and Repost are not directly used in slice state

// --- Backend API Base URL ---
const BACKEND_API_BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL ? `${process.env.EXPO_PUBLIC_SERVER_URL}/api/social-feed` : 'http://localhost:8080/api/social-feed'; // Use EXPO_PUBLIC_SERVER_URL or default

// --- Async Thunks for API Interactions ---

export const fetchPosts = createAsyncThunk('socialFeed/fetchPosts', async (currentUserId: string | undefined, { rejectWithValue }) => {
  try {
    const url = currentUserId ? `${BACKEND_API_BASE_URL}/posts?userId=${currentUserId}` : `${BACKEND_API_BASE_URL}/posts`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(errorData.message || 'Failed to fetch posts');
    }
    const data = await response.json();
    // Backend returns 'mediaUrls' and 'authorName', 'authorAvatar', 'userId'
    // Map to frontend Post interface
    return data.map((post: any) => ({
      ...post,
      media: post.mediaUrls,
      author: {
        id: post.userId,
        name: post.authorName,
        avatar: post.authorAvatar,
      },
      // Ensure likesCount and repostsCount are numbers
      likesCount: Number(post.likesCount),
      repostsCount: Number(post.repostsCount),
    })) as Post[];
  } catch (error: any) {
    return rejectWithValue(error.message || 'Network error');
  }
});

export const createPost = createAsyncThunk('socialFeed/createPost', async (postData: { userId: string; content: string; media?: string[]; signature?: string }, { rejectWithValue }) => {
  try {
    const requestBody = {
      userId: postData.userId,
      content: postData.content,
      mediaUrls: postData.media, // Backend expects mediaUrls
      signature: postData.signature,
    };
    const response = await fetch(`${BACKEND_API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(errorData.message || 'Failed to create post');
    }
    const data = await response.json();
    // Map backend response to frontend Post interface
    return {
      ...data,
      media: data.mediaUrls,
      author: {
        id: data.userId,
        name: data.authorName, // Backend should return author info with created post
        avatar: data.authorAvatar,
      },
      likesCount: Number(data.likesCount),
      repostsCount: Number(data.repostsCount),
    } as Post;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Network error');
  }
});

export const likePost = createAsyncThunk('socialFeed/likePost', async (payload: { postId: string; userId: string; isLiking: boolean; signature: string }, { rejectWithValue }) => {
  try {
    const { postId, userId, signature } = payload;
    const response = await fetch(`${BACKEND_API_BASE_URL}/posts/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId, userId, signature }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(errorData.message || 'Failed to toggle like');
    }
    const data = await response.json(); // Expecting { likesCount: number; isLikedByMe: boolean }
    return { postId: data.postId, likesCountChange: data.likesCount, isLikedByMe: data.isLikedByMe };
  } catch (error: any) {
    return rejectWithValue(error.message || 'Network error');
  }
});

export const repostPost = createAsyncThunk('socialFeed/repostPost', async (payload: { postId: string; userId: string; isReposting: boolean; signature: string; originalPostId?: string }, { rejectWithValue }) => {
  try {
    const { postId, userId, signature, originalPostId } = payload;
    const response = await fetch(`${BACKEND_API_BASE_URL}/posts/repost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId, userId, signature, originalPostId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(errorData.message || 'Failed to toggle repost');
    }
    const data = await response.json(); // Expecting { repostsCount: number; isRepostedByMe: boolean }
    return { postId: data.postId, repostsCountChange: data.repostsCount, isRepostedByMe: data.isRepostedByMe };
  } catch (error: any) {
    return rejectWithValue(error.message || 'Network error');
  }
});

// --- Slice Definition ---

const initialState: SocialFeedState = {
  posts: [],
  loading: 'idle',
  error: null,
};

const socialFeedSlice = createSlice({
  name: 'socialFeed',
  initialState,
  reducers: {
    // Synchronous reducers if needed
  },
  extraReducers: builder => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = 'pending';
      })
      .addCase(fetchPosts.fulfilled, (state, action: PayloadAction<Post[]>) => {
        state.loading = 'succeeded';
        state.posts = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string || action.error.message || 'Failed to fetch posts';
      })
      .addCase(createPost.fulfilled, (state, action: PayloadAction<Post>) => {
        state.posts.unshift(action.payload); // Add new post to the beginning of the feed
      })
      .addCase(likePost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p.id === action.payload.postId);
        if (post) {
          post.likesCount = action.payload.likesCountChange; // Backend should return updated total count
          post.isLikedByMe = action.payload.isLikedByMe;
        }
      })
      .addCase(repostPost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p.id === action.payload.postId);
        if (post) {
          post.repostsCount = action.payload.repostsCountChange; // Backend should return updated total count
          post.isRepostedByMe = action.payload.isRepostedByMe;
        }
      });
  },
});

export default socialFeedSlice.reducer;