import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SERVER_BASE_URL } from '../../config/server';

export interface AuthState {
  provider: 'privy' | 'dynamic' | 'turnkey' | 'mwa' |  null;
  address: string | null;
  authToken: string | null; // Added for MWA reauthorization
  publicEncryptionKey: string | null; // X25519 Public Key
  encryptionSeed: string | null; // Base64 encoded seed (in-memory only, not persisted)
  isLoggedIn: boolean;
  isVerified: boolean; // Added: Tracks if SGT/Hardware gate passed
  isHardwareVerified: boolean; // Verified via hardware-backed key registration
  profilePicUrl: string | null;
  username: string | null; // Immutable .skr handle
  displayName: string | null; // Mutable display name
  description: string | null; // storing user's bio description
  // NEW: attachmentData object to hold any attached profile data (e.g., coin)
  attachmentData?: {
    coin?: {
      mint: string;
      symbol?: string;
      name?: string;
    };
    coverImage?: string; // Add coverImage property
  };
}

const initialState: AuthState = {
  provider: null,
  address: null,
  authToken: null,
  publicEncryptionKey: null,
  isLoggedIn: false,
  isHardwareVerified: false,
  profilePicUrl: null,
  username: null,
  displayName: null,
  description: null,
  attachmentData: {},
};

// Debug environment variable loading (Keeping logs but forcing constant)
console.log('[Auth Reducer] Using SERVER_BASE_URL:', SERVER_BASE_URL);

/**
 * Register the user's public encryption key on the server.
 */
export const registerEncryptionKey = createAsyncThunk(
  'auth/registerEncryptionKey',
  async ({ userId, publicKey }: { userId: string; publicKey: string }, thunkAPI) => {
    try {
      console.log(`[registerEncryptionKey] Registering key for ${userId} at ${SERVER_BASE_URL}/api/profile/register-key`);
      const response = await fetch(`${SERVER_BASE_URL}/api/profile/register-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, publicKey }),
      });
      
      const data = await response.json();
      if (!data.success) {
        console.error('[registerEncryptionKey] Server error:', data.error);
        return thunkAPI.rejectWithValue(data.error || 'Failed to register encryption key');
      }
      return publicKey;
    } catch (error: any) {
      console.error('[registerEncryptionKey] Network error:', error);
      return thunkAPI.rejectWithValue(error.message || 'Error registering encryption key');
    }
  }
);

/**
 * Fetch the user's profile from the server, including profile pic URL, username,
 * and attachment data.
 */
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (userId: string, thunkAPI) => {
    const response = await fetch(
      `${SERVER_BASE_URL}/api/profile?userId=${userId}`,
    );
    const data = await response.json();
    if (data.success) {
      return {
        profilePicUrl: data.url,
        username: data.username,
        displayName: data.display_name,
        description: data.description,
        attachmentData: data.attachmentData || {},
      };
    } else {
      return thunkAPI.rejectWithValue(
        data.error || 'Failed to fetch user profile',
      );
    }
  },
);

/**
 * SECURE: Update the user's profile with hardware signature verification.
 */
export const updateProfileSecure = createAsyncThunk(
  'auth/updateProfileSecure',
  async (
    { 
      userId, 
      displayName, 
      description, 
      profilePicUrl, 
      signature, 
      timestamp 
    }: { 
      userId: string; 
      displayName?: string; 
      description?: string; 
      profilePicUrl?: string; 
      signature: string; 
      timestamp: string;
    },
    thunkAPI,
  ) => {
    try {
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/update`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
            userId, 
            displayName, 
            description, 
            profilePicUrl, 
            signature, 
            timestamp 
          }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        return thunkAPI.rejectWithValue(data.error || 'Failed to update profile');
      }
      return data.profile; // Returns { display_name, description, profile_picture_url, isHardwareVerified }
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Error updating profile');
    }
  },
);

/**
 * Update the user's username in the database.
 * @deprecated Use updateProfileSecure instead.
 */
export const updateUsername = createAsyncThunk(
  'auth/updateUsername',
  async (
    {userId, newUsername}: {userId: string; newUsername: string},
    thunkAPI,
  ) => {
    try {
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/updateUsername`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userId, username: newUsername}),
        },
      );
      const data = await response.json();
      if (!data.success) {
        return thunkAPI.rejectWithValue(
          data.error || 'Failed to update display name',
        );
      }
      return data.display_name as string;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.message || 'Error updating username',
      );
    }
  },
);

/**
 * Update the user's description in the database.
 */
export const updateDescription = createAsyncThunk(
  'auth/updateDescription',
  async (
    {userId, newDescription}: {userId: string; newDescription: string},
    thunkAPI,
  ) => {
    try {
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/updateDescription`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userId, description: newDescription}),
        },
      );
      const data = await response.json();
      if (!data.success) {
        return thunkAPI.rejectWithValue(
          data.error || 'Failed to update description',
        );
      }
      return data.description as string;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.message || 'Error updating description',
      );
    }
  },
);

/**
 * Attach or update a coin on the user's profile.
 * Now accepts: { userId, attachmentData } where attachmentData = { coin: { mint, symbol, name } }
 */
export const attachCoinToProfile = createAsyncThunk(
  'auth/attachCoinToProfile',
  async (
    {
      userId,
      attachmentData,
    }: {
      userId: string;
      attachmentData: {coin: {mint: string; symbol?: string; name?: string}};
    },
    thunkAPI,
  ) => {
    try {
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/attachCoin`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            userId,
            attachmentData,
          }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        return thunkAPI.rejectWithValue(data.error || 'Failed to attach coin');
      }
      return data.attachmentData as {
        coin: {mint: string; symbol?: string; name?: string};
      };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err.message || 'Attach coin request failed.',
      );
    }
  },
);

/**
 * Remove an attached coin from the user's profile.
 */
export const removeAttachedCoin = createAsyncThunk(
  'auth/removeAttachedCoin',
  async (
    {
      userId,
    }: {
      userId: string;
    },
    thunkAPI,
  ) => {
    try {
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/removeAttachedCoin`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            userId,
          }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        return thunkAPI.rejectWithValue(data.error || 'Failed to remove coin');
      }
      return data.success;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err.message || 'Remove coin request failed.',
      );
    }
  },
);

/**
 * Delete the current user's account.
 * The server will expect userId in the body since requireAuth was temporarily removed.
 * IMPORTANT: Proper authentication should be reinstated on the server for this endpoint.
 */
export const deleteAccountAction = createAsyncThunk<
  { success: boolean; message: string }, // Expected success response type
  { userId: string; signature: string; timestamp: string }, // Argument type: Object with auth
  { rejectValue: string } // Type for thunkAPI.rejectWithValue
>(
  'auth/deleteAccount',
  async ({ userId, signature, timestamp }, thunkAPI) => {
    if (!userId || !signature || !timestamp) {
      return thunkAPI.rejectWithValue('User ID, signature, and timestamp are required.');
    }
    try {
      console.log(`[AuthThunk deleteAccountAction] Attempting to delete account for userId: ${userId}`);
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/delete-account`,
        {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, signature, timestamp }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error('[AuthThunk deleteAccountAction] API error:', data.error || `HTTP error! status: ${response.status}`);
        return thunkAPI.rejectWithValue(
          data.error || `Failed to delete account. Status: ${response.status}`,
        );
      }
      console.log('[AuthThunk deleteAccountAction] Account deletion successful:', data);
      return data; // Should be { success: true, message: '...' }
    } catch (error: any) {
      console.error('[AuthThunk deleteAccountAction] Network or other error:', error);
      return thunkAPI.rejectWithValue(
        error.message || 'Network error during account deletion.',
      );
    }
  },
);

/**
 * Update the user's profile picture URL in the database.
 */
export const updateProfilePicAction = createAsyncThunk(
  'auth/updateProfilePic',
  async (
    {userId, profilePicUrl}: {userId: string; profilePicUrl: string},
    thunkAPI,
  ) => {
    try {
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/updateProfilePic`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userId, profilePicUrl}),
        },
      );
      const data = await response.json();
      if (!data.success) {
        return thunkAPI.rejectWithValue(
          data.error || 'Failed to update profile picture',
        );
      }
      return data.profilePicUrl as string;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.message || 'Error updating profile picture',
      );
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(
      state,
      action: PayloadAction<{
        provider: 'privy' | 'dynamic' | 'turnkey' | 'mwa';
        address: string;
        authToken?: string | null; // Added for MWA reauthorization
        profilePicUrl?: string;
        username?: string;
        displayName?: string;
        description?: string;
      }>,
    ) {
      console.log('[AuthReducer] loginSuccess payload received:', JSON.stringify(action.payload, null, 2));
      console.log('[AuthReducer] loginSuccess payload.username:', action.payload.username);
      // Preserve existing profile data if available and no new data provided
      state.provider = action.payload.provider;
      state.address = action.payload.address;
      state.authToken = action.payload.authToken || state.authToken;
      state.isLoggedIn = true;
      
      // Only update these if they are provided or we don't have them
      if (action.payload.profilePicUrl || !state.profilePicUrl) {
        state.profilePicUrl = action.payload.profilePicUrl || state.profilePicUrl;
      }
      
      if (action.payload.username) {
        state.username = action.payload.username;
      }

      if (action.payload.displayName) {
        state.displayName = action.payload.displayName;
      } else if (!state.displayName && action.payload.username) {
        state.displayName = action.payload.username;
      }
      
      if (action.payload.description || !state.description) {
        state.description = action.payload.description || state.description;
      }

      // If no profile picture is set after login, we'll let the fetchUserProfile handle avatar generation
      // This way we don't duplicate avatar generation logic here
    },
    logoutSuccess(state) {
      console.log('[AuthReducer] logoutSuccess: Resetting state.');
      state.provider = null;
      state.address = null;
      state.authToken = null;
      state.isLoggedIn = false;
      state.isVerified = false;
      state.isHardwareVerified = false;
      state.profilePicUrl = null;
      state.username = null;
      state.description = null;
      state.attachmentData = {};
      console.log('[AuthReducer] State after logoutSuccess:', JSON.stringify(state));
    },
    updateProfilePic(state, action: PayloadAction<string>) {
      state.profilePicUrl = action.payload;
    },
    setEncryptionSeed(state, action: PayloadAction<string | null>) {
      state.encryptionSeed = action.payload;
    },
    setVerified(state, action: PayloadAction<boolean>) {
      state.isVerified = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchUserProfile.fulfilled, (state, action) => {
      const {
        profilePicUrl: fetchedProfilePicUrl,
        username: fetchedUsername,
        displayName: fetchedDisplayName,
        description: fetchedDescription,
        attachmentData,
        isHardwareVerified
      } = action.payload as any;

      // Get the userId that was requested as the argument to the thunk
      const requestedUserId = action.meta.arg;

      // Only update auth state if:
      // 1. We are logged in AND
      // 2. The requested user ID matches the current user's address
      if (state.isLoggedIn && 
          state.address && 
          requestedUserId && 
          requestedUserId.toLowerCase() === state.address.toLowerCase()) {
        state.profilePicUrl = fetchedProfilePicUrl || state.profilePicUrl;
        
        // CRITICAL: Always sync the username (immutable handle) from the DB 
        // to ensure .skr is present if it was previously missing in Redux.
        if (fetchedUsername) {
          state.username = fetchedUsername.toLowerCase().endsWith('.skr') ? fetchedUsername : `${fetchedUsername}.skr`;
        }
        
        state.displayName = fetchedDisplayName || state.displayName;
        state.description = fetchedDescription || state.description;
        state.isHardwareVerified = !!isHardwareVerified;
        state.attachmentData = attachmentData || state.attachmentData || {};
      }
      // If the user IDs don't match, we don't update the auth state
      // This prevents other users' profiles from affecting the current user's profile
    });

    builder.addCase(updateUsername.fulfilled, (state, action) => {
      state.displayName = action.payload;
    });

    builder.addCase(updateProfileSecure.fulfilled, (state, action) => {
      const { display_name, description, profile_picture_url, isHardwareVerified } = action.payload;
      if (display_name !== undefined) state.displayName = display_name;
      if (description !== undefined) state.description = description;
      if (profile_picture_url !== undefined) state.profilePicUrl = profile_picture_url;
      state.isHardwareVerified = !!isHardwareVerified;
    });

    builder.addCase(updateDescription.fulfilled, (state, action) => {
      state.description = action.payload;
    });

    builder.addCase(updateProfilePicAction.fulfilled, (state, action) => {
      state.profilePicUrl = action.payload;
    });

    builder.addCase(attachCoinToProfile.fulfilled, (state, action) => {
      if (state.address) {
        state.attachmentData = {coin: action.payload.coin};
      }
    });

    builder.addCase(removeAttachedCoin.fulfilled, (state) => {
      if (state.address) {
        // Remove the coin property from attachmentData
        if (state.attachmentData) {
          delete state.attachmentData.coin;
        }
      }
    });

    builder.addCase(deleteAccountAction.pending, (state) => {
      // Optional: Handle pending state, e.g., set a global loading flag if needed
      console.log('[AuthSlice] deleteAccountAction pending...');
    });
    builder.addCase(deleteAccountAction.fulfilled, (state, action) => {
      // On successful account deletion from the server, the client should logout.
      // The logoutSuccess reducer (called by useAuth().logout()) will clear user state.
      // No direct state changes here needed if logout handles it.
      console.log('[AuthSlice] deleteAccountAction fulfilled:', action.payload.message);
    });
    builder.addCase(deleteAccountAction.rejected, (state, action) => {
      // Optional: Handle rejected state, e.g., display a global error
      console.error('[AuthSlice] deleteAccountAction rejected:', action.payload || action.error.message);
    });

    builder.addCase(registerEncryptionKey.fulfilled, (state, action) => {
      state.publicEncryptionKey = action.payload;
      state.isHardwareVerified = true;
    });
  },
});

export const {loginSuccess, logoutSuccess, updateProfilePic, setEncryptionSeed, setVerified} =
  authSlice.actions;
export default authSlice.reducer;
