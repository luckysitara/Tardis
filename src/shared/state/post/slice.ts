import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { ThreadPost, CreatePostPayload, FetchPostsParams } from './types';

// Replace with your actual server base URL
const SERVER_BASE_URL = 'http://192.168.1.175:8080';

interface PostState {
  posts: ThreadPost[];
  bookmarkedPosts: ThreadPost[];
  loading: boolean;
  error: string | null;
}

const initialState: PostState = {
  posts: [],
  bookmarkedPosts: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchPosts = createAsyncThunk(
  'post/fetchPosts',
  async (params: FetchPostsParams = {}, { rejectWithValue }) => {
    try {
      const { limit, offset, communityId, userId } = params;
      const response = await axios.get(`${SERVER_BASE_URL}/api/posts`, {
        params: { limit, offset, communityId, userId },
      });
      return response.data.posts;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const toggleBookmark = createAsyncThunk(
  'post/toggleBookmark',
  async ({ postId, userId }: { postId: string; userId: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${SERVER_BASE_URL}/api/posts/${postId}/bookmark`, { user_id: userId });
      return { postId, bookmarked: response.data.bookmarked };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchBookmarkedPosts = createAsyncThunk(
  'post/fetchBookmarkedPosts',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/api/posts/bookmarks/${userId}`);
      return response.data.posts;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createPost = createAsyncThunk(
  'post/createPost',
  async (postData: CreatePostPayload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${SERVER_BASE_URL}/api/posts`, postData);
      return response.data.post;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// Add other post-related async thunks (like, repost, delete) as needed

const postSlice = createSlice({
  name: 'post',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchPosts
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action: PayloadAction<ThreadPost[]>) => {
        state.loading = false;
        state.posts = action.payload; // Or append if pagination
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createPost
      .addCase(createPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action: PayloadAction<ThreadPost>) => {
        state.loading = false;
        state.posts.unshift(action.payload); // Add new post to the top
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // toggleBookmark
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        const post = state.posts.find(p => p.id === action.payload.postId);
        if (post) {
          post.isBookmarked = action.payload.bookmarked;
        }
        // Also update in bookmarkedPosts if they exist there
        if (action.payload.bookmarked === false) {
          state.bookmarkedPosts = state.bookmarkedPosts.filter(p => p.id !== action.payload.postId);
        }
      })
      // fetchBookmarkedPosts
      .addCase(fetchBookmarkedPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookmarkedPosts.fulfilled, (state, action: PayloadAction<ThreadPost[]>) => {
        state.loading = false;
        state.bookmarkedPosts = action.payload;
      })
      .addCase(fetchBookmarkedPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default postSlice.reducer;
