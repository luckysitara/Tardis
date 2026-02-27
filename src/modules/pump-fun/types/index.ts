/**
 * Types for the PumpFun module
 */
import { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { PublicKey, Connection } from '@solana/web3.js';
import { PumpFunSDK } from 'pumpdotfun-sdk';

/**
 * Props for the PumpfunCard component
 */
export interface PumpfunCardProps {
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Props for the PumpfunBuySection component
 */
export interface PumpfunBuySectionProps {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  buyButtonLabel?: string;
}

/**
 * Interface representing a token selected for selling
 */
export interface SelectedToken {
  mintPubkey: string;
  uiAmount: number;
}

/**
 * Props for the PumpfunSellSection component
 */
export interface PumpfunSellSectionProps {
  selectedToken?: SelectedToken | null;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  sellButtonLabel?: string;
}

/**
 * Props for the PumpfunLaunchSection component
 */
export interface PumpfunLaunchSectionProps {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  launchButtonLabel?: string;
}

/**
 * Types for the services
 */
export interface PumpfunBuyParams {
  buyerPublicKey: string;
  tokenAddress: string;
  solAmount: number;
  solanaWallet: any;
  onStatusUpdate?: (status: string) => void;
}

export interface PumpfunSellParams {
  sellerPublicKey: string;
  tokenAddress: string;
  tokenAmount: number;
  solanaWallet: any;
  onStatusUpdate?: (status: string) => void;
}

export interface PumpfunLaunchParams {
  userPublicKey: string;
  tokenName: string;
  tokenSymbol: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  imageUri: string;
  solAmount: number;
  slippageBasisPoints?: bigint;
  solanaWallet: any;
  onStatusUpdate?: (status: string) => void;
  verifyToken?: boolean;
  dataIntegrityAccepted?: boolean;
  termsAccepted?: boolean;
}

export interface PumpFunBondingBuyParams {
  payerPubkey: PublicKey;
  tokenMint: PublicKey;
  lamportsToBuy: bigint;
  slippageBasis?: bigint;
  sdk: PumpFunSDK;
  connection: Connection;
}

export interface PumpFunBondingSellParams {
  sellerPubkey: PublicKey;
  tokenMint: PublicKey;
  lamportsToSell: bigint;
  slippageBasis?: bigint;
  sdk: PumpFunSDK;
  connection: Connection;
}

// Re-export TokenEntry from common utils for convenience
export { TokenEntry } from '../../data-module/types/tokenTypes';
