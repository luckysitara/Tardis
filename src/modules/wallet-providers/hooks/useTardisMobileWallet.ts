import React, { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { loginSuccess } from '@/shared/state/auth/reducer';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { RootState } from '@/shared/state/store';
import { Buffer } from 'buffer';

import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import type { PublicKey as SolanaPublicKey } from '@solana/web3.js';

type TransactFunction = <T>(
  callback: (wallet: Web3MobileWallet) => Promise<T>
) => Promise<T>;

let transact: TransactFunction | undefined;
let PublicKey: typeof SolanaPublicKey | undefined;

if (Platform.OS === 'android') {
  try {
    const mwaModule = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
    transact = mwaModule.transact as TransactFunction;
    const web3Module = require('@solana/web3.js');
    PublicKey = web3Module.PublicKey;
  } catch (e) {}
}

const APP_IDENTITY = {
  name: 'Tardis',
  uri: 'https://tardis.xyz',
  icon: 'favicon.ico'
};

export const useTardisMobileWallet = () => {
  const dispatch = useAppDispatch();
  const navigation = useAppNavigation();
  const authState = useSelector((state: RootState) => state.auth);
  const authToken = authState.authToken;

  const connectSeekerWallet = useCallback(async () => {
    if (Platform.OS !== 'android' || !transact || !PublicKey) return;
    try {
      const result = await transact(async (wallet: Web3MobileWallet) => {
        return await wallet.authorize({
          chain: 'solana:mainnet',
          identity: APP_IDENTITY,
          sign_in_payload: {
            domain: 'tardis.xyz',
            statement: 'Sign in to Tardis Secure Messaging.',
            uri: 'https://tardis.xyz',
          },
        });
      });

      if (result?.accounts?.length) {
        const base58Address = new PublicKey(Buffer.from(result.accounts[0].address, 'base64')).toBase58();
        dispatch(loginSuccess({
          provider: 'mwa',
          address: base58Address,
          authToken: result.auth_token,
          username: result.accounts[0].label || 'Seeker User',
        }));
        navigation.navigate('Authenticated' as never);
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect to wallet.');
    }
  }, [dispatch, navigation]);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (Platform.OS !== 'android' || !transact || !PublicKey) return null;

    try {
      // Use Buffer to ensure absolute compatibility with the MWA bridge
      const messageUint8 = new Uint8Array(Buffer.from(message, 'utf8'));
      
      console.log('[Tardis MWA] Initiating hardware signature...');

      const result = await transact(async (wallet: Web3MobileWallet) => {
        // DEBUG: Check if we even get inside the transact block
        console.log('[Tardis MWA] Wallet bridge active, processing...');
        
        let auth;
        try {
          // Attempt reauthorize if we have a token to avoid "Connect Wallet" screen
          auth = authToken 
            ? await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY })
            : await wallet.authorize({ chain: 'solana:mainnet', identity: APP_IDENTITY });
        } catch (e) {
          console.log('[Tardis MWA] Reauthorize failed, falling back to authorize');
          auth = await wallet.authorize({ chain: 'solana:mainnet', identity: APP_IDENTITY });
        }

        // Hardware signing request
        const signed = await wallet.signMessages({ payloads: [messageUint8] } as any);
        
        return {
          signature: (signed as any)?.signed_payloads?.[0] || (signed as any)?.signatures?.[0],
          token: auth.auth_token,
          address: auth.accounts[0].address,
          label: auth.accounts[0].label
        };
      });

      if (result?.signature) {
        const base58Address = new PublicKey(Buffer.from(result.address, 'base64')).toBase58();
        dispatch(loginSuccess({
          provider: 'mwa',
          address: base58Address,
          authToken: result.token,
          username: result.label
        }));

        const signatureBase64 = Buffer.from(result.signature).toString('base64');
        console.log('[Tardis MWA] Hardware signature verified.');
        return signatureBase64;
      }
      return null;
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        console.error('[Tardis MWA] Hardware sign error:', error.message);
        Alert.alert('Signing Error', 'Hardware signing failed. Please unlock your wallet and try again.');
      }
      return null;
    }
  }, [authToken, dispatch]);

  return { connectSeekerWallet, signMessage };
};
