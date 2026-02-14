// File: src/config/index.ts

// Removed: All specific environment variable imports for Privy, Dynamic, Turnkey
// import {
//   PRIVY_APP_ID,
//   PRIVY_CLIENT_ID,
//   DYNAMIC_ENVIRONMENT_ID,
//   TURNKEY_BASE_URL,
//   TURNKEY_RP_ID,
//   TURNKEY_RP_NAME,
//   TURNKEY_ORGANIZATION_ID,
// } from '@env';

import {dummyProfileData} from '@/shared/mocks/profileInfoData';
import {tweetsData} from '@/shared/mocks/tweets';
import {dummyData} from '@/shared/mocks/users';

// Removed: PrivyConfig, DynamicConfig, TurnkeyConfig interfaces

/** The shape of our custom AuthProviderConfig - Simplified for MWA only */
export interface AuthProviderConfig {
  provider: 'mwa'; // Only MWA for Phase 1
  // Removed: loginMethods: Array<'email' | 'sms' | 'google' | 'apple'>;
  // Removed: privy: PrivyConfig;
  // Removed: dynamic: DynamicConfig;
  // Removed: turnkey: TurnkeyConfig;
}

/** Transaction config (unchanged) */
export interface TransactionProviderConfig {
  defaultFeeTier: string;
  defaultMode: 'priority' | 'jito';
  feeTiers: {
    low: number;
    medium: number;
    high: number;
    'very-high': number;
  };
  network: 'mainnet-beta' | 'devnet' | 'testnet';
}

/** Mock data config (unchanged) */
export interface MockDataConfig {
  profileData: typeof dummyProfileData;
  tweetsData: typeof tweetsData;
  usersData: typeof dummyData;
}

/** Provide default auth config - Simplified for MWA only. */
export const DefaultAuthConfig: AuthProviderConfig = {
  provider: 'mwa', // Only MWA for Phase 1
  // Removed: loginMethods: [], // Not applicable for MWA
  // Removed: privy: {},
  // Removed: dynamic: {},
  // Removed: turnkey: {},
};

/** Provide default transaction config. */
export const DefaultTransactionConfig: TransactionProviderConfig = {
  defaultMode: 'priority',
  feeTiers: {
    low: 100000,
    medium: 5000000,
    high: 100000000,
    'very-high': 2000000000,
  },
  network: 'mainnet-beta',
  defaultFeeTier: ''
};

/** Provide default mock data config. */
export const DefaultMockDataConfig: MockDataConfig = {
  profileData: dummyProfileData,
  tweetsData: tweetsData,
  usersData: dummyData,
};

/** Overall customization config shape. */
export interface CustomizationConfig {
  auth: AuthProviderConfig;
  transaction: TransactionProviderConfig;
  mockData: MockDataConfig;
}

/** The combined default config. */
export const DefaultCustomizationConfig: CustomizationConfig = {
  auth: DefaultAuthConfig,
  transaction: DefaultTransactionConfig,
  mockData: DefaultMockDataConfig,
};
