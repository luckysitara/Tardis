import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { ThreadPost, CreatePostPayload, FetchPostsParams } from './types';

// Replace with your actual server base URL
const SERVER_BASE_URL = 'http://192.168.1.175:8080';

interface PostState {
  posts: ThreadPost[];
  loading: boolean;
  error: string | null;
}

const initialState: PostState = {
  posts: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchPosts = createAsyncThunk(
  'post/fetchPosts',
  async (params: FetchPostsParams = {}, { rejectWithValue }) => {
    try {
      const { limit, offset, communityId } = params;
      const response = await axios.get(`${SERVER_BASE_URL}/api/posts`, {
        params: { limit, offset, communityId },
      });
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
      });
  },
});

export default postSlice.reducer;
