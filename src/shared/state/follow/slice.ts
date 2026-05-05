import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { SERVER_BASE_URL } from '../../config/server';

interface FollowState {
  following: string[];
  suggestedUsers: any[];
  loading: boolean;
  error: string | null;
}

const initialState: FollowState = {
  following: [],
  suggestedUsers: [],
  loading: false,
  error: null,
};

export const fetchFollowing = createAsyncThunk(
  'follow/fetchFollowing',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/api/follows/following/${userId}`);
      return response.data.following;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch following');
    }
  }
);

export const fetchSuggestedUsers = createAsyncThunk(
  'follow/fetchSuggestedUsers',
  async (userId: string | undefined, { rejectWithValue }) => {
    try {
      const url = userId 
        ? `${SERVER_BASE_URL}/api/follows/suggested?userId=${userId}`
        : `${SERVER_BASE_URL}/api/follows/suggested`;
      const response = await axios.get(url);
      return response.data.users;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch suggested users');
    }
  }
);

export const followUser = createAsyncThunk(
  'follow/followUser',
  async ({ followerId, followingId }: { followerId: string; followingId: string }, { rejectWithValue }) => {
    try {
      await axios.post(`${SERVER_BASE_URL}/api/follows/follow`, { followerId, followingId });
      return followingId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to follow user');
    }
  }
);

export const unfollowUser = createAsyncThunk(
  'follow/unfollowUser',
  async ({ followerId, followingId }: { followerId: string; followingId: string }, { rejectWithValue }) => {
    try {
      await axios.post(`${SERVER_BASE_URL}/api/follows/unfollow`, { followerId, followingId });
      return followingId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to unfollow user');
    }
  }
);

const followSlice = createSlice({
  name: 'follow',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowing.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFollowing.fulfilled, (state, action) => {
        state.loading = false;
        state.following = action.payload;
      })
      .addCase(fetchFollowing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchSuggestedUsers.fulfilled, (state, action) => {
        state.suggestedUsers = action.payload;
      })
      .addCase(followUser.fulfilled, (state, action) => {
        if (!state.following.includes(action.payload)) {
          state.following.push(action.payload);
        }
      })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        state.following = state.following.filter(id => id !== action.payload);
      });
  },
});

export default followSlice.reducer;
