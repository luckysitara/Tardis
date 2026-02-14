import React, { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { loginSuccess } from '@/shared/state/auth/reducer';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';

import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import type { PublicKey as SolanaPublicKey } from '@solana/web3.js';

type TransactFunction = <T>(
  callback: (wallet: Web3MobileWallet) => Promise<T>
) => Promise<T>;

let transact: TransactFunction | undefined;
let PublicKey: typeof SolanaPublicKey | undefined;
let Buffer: { from: (data: string, encoding: string) => Uint8Array } | undefined;

// Conditionally load MWA modules for Android
if (Platform.OS === 'android') {
  try {
    const mwaModule = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
    transact = mwaModule.transact as TransactFunction;
  } catch (error) {
    console.warn('Mobile Wallet Adapter (transact) not available:', error);
  }

  try {
    const web3Module = require('@solana/web3.js');
    PublicKey = web3Module.PublicKey;
  } catch (error) {
    console.warn('Solana Web3 (PublicKey) module not available:', error);
  }

  try {
    const bufferModule = require('buffer');
    Buffer = bufferModule.Buffer;
  } catch (error) {
    console.warn('Buffer module not available:', error);
  }
}

export const useTardisMobileWallet = () => {
  const dispatch = useAppDispatch();
  const navigation = useAppNavigation();

  const connectSeekerWallet = useCallback(async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Supported', 'Solana Seeker (MWA) is only available on Android devices.');
      return;
    }

    if (!transact || !PublicKey || !Buffer) {
      Alert.alert(
        'Not Available',
        'Mobile Wallet Adapter is not properly initialized. Please ensure your environment is set up correctly.'
      );
      return;
    }

    const APP_IDENTITY = {
      name: 'Tardis',
      uri: 'https://tardis.xyz', // Placeholder URI, should be replaced with actual Tardis URI
      icon: 'favicon.ico', // Placeholder icon, should be replaced with actual Tardis icon
    };

    try {
      const authorizationResult = await transact(async (wallet: Web3MobileWallet) => {
        return await wallet.authorize({
          chain: 'solana:mainnet', // Assuming mainnet, adjust if necessary
          identity: APP_IDENTITY,
          sign_in_payload: {
            domain: 'tardis.xyz', // Placeholder, replace with actual domain
            statement: 'You are signing in to Tardis, the high-security Solana messaging platform.',
            uri: 'https://tardis.xyz', // Placeholder, replace with actual URI
          },
        });
      });

      if (authorizationResult?.accounts?.length) {
        const encodedPublicKey = authorizationResult.accounts[0].address;
        const publicKeyBuffer = Buffer.from(encodedPublicKey, 'base64');
        const publicKey = new PublicKey(publicKeyBuffer);
        const base58Address = publicKey.toBase58();

        console.log('Tardis MWA connection successful, address:', base58Address);

        const usernameLabel = authorizationResult.accounts[0].label;
        dispatch(
          loginSuccess({
            provider: 'mwa',
            address: base58Address,
            username: usernameLabel, // Pass the extracted label as username
          })
        );

        // Navigate to the main app after successful connection
        navigation.navigate('Authenticated' as never); // Navigate to the Authenticated stack
      } else {
        Alert.alert('Connection Error', 'No accounts found in your Seeker wallet.');
      }
    } catch (error) {
      console.error('Tardis MWA connection error:', error);
      Alert.alert('Connection Error', 'Failed to connect to your Seeker wallet. Please ensure your Seeker is connected and authorized.');
    }
  }, [dispatch, navigation]);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Supported', 'Solana Seeker (MWA) is only available on Android devices.');
      return null;
    }

    if (!transact || !Buffer) {
      Alert.alert(
        'Not Available',
        'Mobile Wallet Adapter is not properly initialized. Please ensure your environment is set up correctly.'
      );
      return null;
    }

    try {
      const messageUint8 = new TextEncoder().encode(message);
      const result = await transact(async (wallet: Web3MobileWallet) => {
        return await wallet.signMessages({
          messages: [messageUint8],
        });
      });

      // Ensure result and result.signatures are not null/undefined
      const signatures = result?.signatures || [];

      if (signatures.length > 0) {
        // MWA returns Uint8Array, convert to base64 string
        return Buffer.from(signatures[0]).toString('base64');
      } else {
        Alert.alert('Signing Error', 'No signature received from wallet or signing was cancelled.');
        return null;
      }
    } catch (error) {
      console.error('Tardis MWA signMessage error:', error);
      Alert.alert('Signing Error', 'Failed to sign message with your Seeker wallet.');
      return null;
    }
  }, []);

  return { connectSeekerWallet, signMessage };
};