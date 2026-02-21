import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { Community } from './types'; // Assuming types are defined in types.ts

// Replace with your actual server base URL
const SERVER_BASE_URL = 'http://192.168.1.175:8080';

interface CommunityState {
  communities: Community[];
  loading: boolean;
  error: string | null;
}

const initialState: CommunityState = {
  communities: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchCommunities = createAsyncThunk(
  'community/fetchCommunities',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/api/communities`);
      return response.data.communities;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

interface CreateCommunityPayload {
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPublic?: boolean;
  creatorId: string;
  gates?: Array<{
    type: 'TOKEN' | 'NFT' | 'GENESIS';
    mintAddress?: string;
    minBalance?: string;
    symbol?: string;
  }>;
}

export const createCommunity = createAsyncThunk(
  'community/createCommunity',
  async (communityData: CreateCommunityPayload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${SERVER_BASE_URL}/api/communities`, communityData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

interface JoinCommunityPayload {
  communityId: string;
  userId: string;
}

export const joinCommunity = createAsyncThunk(
  'community/joinCommunity',
  async ({ communityId, userId }: JoinCommunityPayload, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${SERVER_BASE_URL}/api/communities/join`, { communityId, userId });
      return { communityId, ...response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const communitySlice = createSlice({
  name: 'community',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchCommunities
      .addCase(fetchCommunities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommunities.fulfilled, (state, action: PayloadAction<Community[]>) => {
        state.loading = false;
        state.communities = action.payload;
      })
      .addCase(fetchCommunities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createCommunity
      .addCase(createCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCommunity.fulfilled, (state, action) => {
        state.loading = false;
        // Optionally add the new community to the list, or refetch
        // For simplicity, we might refetch or add a placeholder
      })
      .addCase(createCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // joinCommunity
      .addCase(joinCommunity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinCommunity.fulfilled, (state, action: PayloadAction<{ communityId: string; message: string }>) => {
        state.loading = false;
        // Update the joined status of the community if necessary
        const community = state.communities.find(c => c.id === action.payload.communityId);
        if (community) {
          community.is_member = true; // Assuming the API returns success means joined
        }
      })
      .addCase(joinCommunity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default communitySlice.reducer;
