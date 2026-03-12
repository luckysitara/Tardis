// File: src/modules/pumpFun/hooks/usePumpFun.ts

import {useCallback} from 'react';
import {Alert} from 'react-native';
import {useAuth, useWallet, TransactionService} from '@/modules/wallet-providers';
import {
  buyTokenViaPumpfun,
  sellTokenViaPumpfun,
  createAndBuyTokenViaPumpfun,
} from '@/modules/pump-fun/services/pumpfunService';
import {
  PumpfunBuyParams,
  PumpfunSellParams,
  PumpfunLaunchParams,
} from '../types';
import {
  verifyToken,
  VerifyTokenParams,
} from '@/shared/services/rugCheckService';

/**
 * Hook for interacting with Pump.fun platform
 * @returns Methods for buying, selling, and launching tokens on Pump.fun
 */
export function usePumpFun() {
  const {wallet, solanaWallet} = useAuth();
  // Also use the new useWallet hook which provides standard transaction methods
  const {address, connected, signMessage} = useWallet();

  /**
   * Buy a token on Pump.fun
   */
  const buyToken = useCallback(
    async ({
      tokenAddress,
      solAmount,
      onStatusUpdate,
    }: {
      tokenAddress: string;
      solAmount: number;
      onStatusUpdate?: (status: string) => void;
    }) => {
      const availableWallet = wallet || solanaWallet;

      if (!availableWallet) {
        Alert.alert('Error', 'No Solana wallet found. Please connect first.');
        return;
      }
      try {
        onStatusUpdate?.('Preparing buy transaction...');

        const buyParams: PumpfunBuyParams = {
          buyerPublicKey:
            address || solanaWallet?.wallets?.[0]?.publicKey || '',
          tokenAddress,
          solAmount,
          solanaWallet: availableWallet,
          onStatusUpdate,
        };

        const txSignature = await buyTokenViaPumpfun(buyParams);
        TransactionService.showSuccess(txSignature, 'token');
      } catch (error: any) {
        console.error('[usePumpfun.buyToken] Error:', error);
        TransactionService.showError(error);
        throw error;
      }
    },
    [wallet, solanaWallet, address],
  );

  /**
   * Sell a token on Pump.fun
   */
  const sellToken = useCallback(
    async ({
      tokenAddress,
      tokenAmount,
      onStatusUpdate,
    }: {
      tokenAddress: string;
      tokenAmount: number;
      onStatusUpdate?: (status: string) => void;
    }) => {
      const availableWallet = wallet || solanaWallet;

      if (!availableWallet) {
        Alert.alert('Error', 'No Solana wallet found. Please connect first.');
        return;
      }
      try {
        onStatusUpdate?.('Preparing sell transaction...');

        const sellParams: PumpfunSellParams = {
          sellerPublicKey:
            address || solanaWallet?.wallets?.[0]?.publicKey || '',
          tokenAddress,
          tokenAmount,
          solanaWallet: availableWallet,
          onStatusUpdate,
        };

        const txSignature = await sellTokenViaPumpfun(sellParams);
        TransactionService.showSuccess(txSignature, 'token');
      } catch (error: any) {
        console.error('[usePumpfun.sellToken] Error:', error);
        TransactionService.showError(error);
        throw error;
      }
    },
    [wallet, solanaWallet, address],
  );

  /**
   * Submit token for verification on RugCheck
   */
  const submitTokenForVerification = useCallback(
    async (
      tokenMint: string,
      description: string,
      links: {[key: string]: string} = {},
      dataIntegrityAccepted: boolean = true,
      termsAccepted: boolean = true,
      onStatusUpdate?: (status: string) => void,
    ) => {
      try {
        onStatusUpdate?.('Preparing token verification...');

        const userPublicKey =
          address || solanaWallet?.wallets?.[0]?.publicKey || '';
        if (!userPublicKey) {
          throw new Error('No wallet public key available for verification');
        }

        const messageToSign = `Verify token ${tokenMint} on RugCheck`;
        let signature;

        try {
          onStatusUpdate?.('Requesting signature from wallet...');
          const signResult = await signMessage(
            new TextEncoder().encode(messageToSign),
          );
          // Handle different signature return types
          signature = typeof signResult === 'string' ? signResult : Buffer.from(signResult).toString('base64');
        } catch (signError) {
          console.error('[usePumpfun.submitTokenForVerification] Signing error:', signError);
          onStatusUpdate?.('Failed to obtain signature for verification');
          throw new Error('Failed to sign verification message.');
        }

        const verifyParams: VerifyTokenParams = {
          mint: tokenMint,
          payer: userPublicKey,
          signature: signature,
          data: {
            description,
            dataIntegrityAccepted,
            termsAccepted,
            links,
          },
        };

        onStatusUpdate?.('Submitting token verification...');
        const result = await verifyToken(verifyParams);

        if (result && result.ok) {
          onStatusUpdate?.('Token verification submitted successfully!');
          return true;
        } else {
          onStatusUpdate?.('Token verification failed');
          return false;
        }
      } catch (error) {
        console.error('[usePumpfun.submitTokenForVerification] Error:', error);
        onStatusUpdate?.('Token verification failed');
        return false;
      }
    },
    [address, solanaWallet, signMessage],
  );

  /**
   * Launch a new token on Pump.fun
   */
  const launchToken = useCallback(
    async ({
      tokenName,
      tokenSymbol,
      description = '',
      twitter = '',
      telegram = '',
      website = '',
      imageUri,
      solAmount,
      verifyToken = false,
      dataIntegrityAccepted = false,
      termsAccepted = false,
      onStatusUpdate,
    }: {
      tokenName: string;
      tokenSymbol: string;
      description?: string;
      twitter?: string;
      telegram?: string;
      website?: string;
      imageUri: string;
      solAmount: number;
      verifyToken?: boolean;
      dataIntegrityAccepted?: boolean;
      termsAccepted?: boolean;
      onStatusUpdate?: (status: string) => void;
    }) => {
      const availableWallet = wallet || solanaWallet;

      if (!availableWallet) {
        Alert.alert('Error', 'No Solana wallet found. Please connect first.');
        return;
      }

      const userPublicKey =
        address || solanaWallet?.wallets?.[0]?.publicKey || '';

      try {
        onStatusUpdate?.('Preparing token launch...');

        const launchParams: PumpfunLaunchParams = {
          userPublicKey,
          tokenName,
          tokenSymbol,
          description,
          twitter,
          telegram,
          website,
          imageUri,
          solAmount,
          solanaWallet: availableWallet,
          onStatusUpdate,
          verifyToken,
          dataIntegrityAccepted,
          termsAccepted,
        };

        const result = await createAndBuyTokenViaPumpfun(launchParams);
        console.log('[usePumpfun.launchToken] Result:', result);
        return result;
      } catch (error: any) {
        console.error('[usePumpfun.launchToken] Error:', error);
        TransactionService.showError(error);
        throw error;
      }
    },
    [wallet, solanaWallet, address],
  );

  return {
    buyToken,
    sellToken,
    launchToken,
    submitTokenForVerification,
  };
}
