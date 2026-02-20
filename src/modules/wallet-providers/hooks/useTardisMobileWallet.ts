import React, { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { loginSuccess } from '@/shared/state/auth/reducer';
import { RootState } from '@/shared/state/store';
import { Buffer } from 'buffer';
import { navigationRef } from '@/shared/hooks/useAppNavigation';

import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import type { PublicKey as SolanaPublicKey } from '@solana/web3.js';

console.log('[Tardis MWA] useTardisMobileWallet.ts module loaded');

type TransactFunction = <T>(
  callback: (wallet: Web3MobileWallet) => Promise<T>
) => Promise<T>;

let transact: TransactFunction | undefined;
let PublicKey: typeof SolanaPublicKey | undefined;

if (Platform.OS === 'android') {
  try {
    console.log('[Tardis MWA] Attempting to require MWA modules...');
    const mwaModule = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
    transact = mwaModule.transact as TransactFunction;
    const web3Module = require('@solana/web3.js');
    PublicKey = web3Module.PublicKey;
    console.log('[Tardis MWA] MWA modules loaded successfully');
  } catch (e: any) {
    console.error('[Tardis MWA] Failed to load MWA modules:', e.message);
  }
}

const APP_IDENTITY = {
  name: 'Tardis',
  uri: 'https://tardis.xyz'
};

export interface SeekerAuthResult {
  address: string;
  authToken: string;
  label?: string;
}

export const useTardisMobileWallet = () => {
  const dispatch = useAppDispatch();
  const authState = useSelector((state: RootState) => state.auth);
  const authToken = authState.authToken;

  const authorizeSeeker = useCallback(async (): Promise<SeekerAuthResult | null> => {
    if (Platform.OS !== 'android' || !transact || !PublicKey) return null;

    try {
      return await transact(async (wallet: Web3MobileWallet) => {
        const result = await wallet.authorize({
          chain: 'solana:mainnet-beta',
          identity: APP_IDENTITY,
        });

        if (result?.accounts?.length) {
          const base58Address = new PublicKey(Buffer.from(result.accounts[0].address, 'base64')).toBase58();
          return {
            address: base58Address,
            authToken: result.auth_token,
            label: result.accounts[0].label
          };
        }
        return null;
      });
    } catch (e) {
      console.error('[Tardis MWA] Authorize Seeker Error:', e);
      return null;
    }
  }, []);

  const connectSeekerWallet = useCallback(async () => {
    console.log('[Tardis MWA] connectSeekerWallet called');
    if (Platform.OS !== 'android') {
        console.warn('[Tardis MWA] Not on Android, skipping connect');
        return;
    }
    if (!transact || !PublicKey) {
        console.error('[Tardis MWA] transact or PublicKey is missing!');
        return;
    }

    try {
      console.log('[Tardis MWA] Starting transact for authorize...');
      const result = await transact(async (wallet: Web3MobileWallet) => {
        console.log('[Tardis MWA] Wallet bridge active, calling authorize...');
        return await wallet.authorize({
          chain: 'solana:mainnet-beta',
          identity: APP_IDENTITY,
          sign_in_payload: {
            domain: 'tardis.xyz',
            statement: 'Sign in to Tardis Secure Messaging.',
            uri: 'https://tardis.xyz',
          },
        });
      });

      console.log('[Tardis MWA] Authorize result received:', !!result);

      if (result?.accounts?.length) {
        const base58Address = new PublicKey(Buffer.from(result.accounts[0].address, 'base64')).toBase58();
        console.log('[Tardis MWA] Connect successful for address:', base58Address);
        dispatch(loginSuccess({
          provider: 'mwa',
          address: base58Address,
          authToken: result.auth_token,
          username: result.accounts[0].label || 'Seeker User',
        }));
        
        if (navigationRef.isReady()) {
          navigationRef.navigate('Authenticated' as never);
        } else {
          console.warn('[Tardis MWA] navigationRef is not ready, falling back to local navigation if possible');
        }
      } else {
        console.log('[Tardis MWA] No accounts returned from authorize');
      }
    } catch (error: any) {
      console.error('[Tardis MWA] Connection Error:', error.message);
      Alert.alert('Connection Error', `Failed to connect to wallet: ${error.message}`);
    }
  }, [dispatch]);

  const signMessage = useCallback(async (message: string | Uint8Array): Promise<Uint8Array | null> => {
    if (Platform.OS !== 'android' || !transact || !PublicKey) return null;

    try {
      const messageUint8 = typeof message === 'string' 
        ? new Uint8Array(Buffer.from(message, 'utf8'))
        : message;
      
      console.log('[Tardis MWA] Initiating hardware signature...');

      const result = await transact(async (wallet: Web3MobileWallet) => {
        console.log('[Tardis MWA] Wallet bridge active, processing...');
        
        let auth;
        try {
          if (authToken) {
            console.log('[Tardis MWA] Attempting reauthorize...');
            auth = await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY });
          } else {
            console.log('[Tardis MWA] No token, calling authorize...');
            auth = await wallet.authorize({ chain: 'solana:mainnet-beta', identity: APP_IDENTITY });
          }
        } catch (e) {
          console.log('[Tardis MWA] Auth failed, falling back to fresh authorize...');
          auth = await wallet.authorize({ chain: 'solana:mainnet-beta', identity: APP_IDENTITY });
        }

        if (!auth || !auth.accounts || auth.accounts.length === 0) {
          throw new Error('Failed to authorize wallet');
        }

        // Get base58 address for the wallet routing
        const base58Address = new PublicKey(Buffer.from(auth.accounts[0].address, 'base64')).toBase58();
        console.log('[Tardis MWA] Authorized. Account (base58):', base58Address);
        
        console.log('[Tardis MWA] Sending signMessages request to bridge...');
        
        const signResult = await wallet.signMessages({ 
          payloads: [new Uint8Array(messageUint8)],
          addresses: [base58Address]
        });
        
        console.log('[Tardis MWA] Signature response keys:', Object.keys(signResult || {}));
        
        // Broad extraction logic
        const sr = signResult as any;
        const signature = sr?.signed_payloads?.[0] || sr?.signatures?.[0] || sr?.[0];
        
        if (!signature) {
          console.log('[Tardis MWA] Full signResult:', JSON.stringify(signResult));
          throw new Error('No signature found in wallet response');
        }

        return {
          signature: signature,
          token: auth.auth_token,
          address: auth.accounts[0].address,
          label: auth.accounts[0].label
        };
      });

      if (result?.signature && result?.address) {
        const base58Address = new PublicKey(Buffer.from(result.address, 'base64')).toBase58();
        dispatch(loginSuccess({
          provider: 'mwa',
          address: base58Address,
          authToken: result.token,
          username: result.label || authState.username
        }));

        console.log('[Tardis MWA] Hardware signature verified.');
        return new Uint8Array(result.signature);
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

  const getEncryptionSeed = useCallback(async (): Promise<Uint8Array | null> => {
    // Constant string to derive a unique but stable encryption seed for this device/app
    const derivationMessage = "Tardis_E2EE_Seed_v1";
    console.log('[Tardis MWA] Deriving encryption seed from hardware...');
    return await signMessage(derivationMessage);
  }, [signMessage]);

  return React.useMemo(() => ({ 
    connectSeekerWallet, 
    authorizeSeeker, // Added
    signMessage, 
    getEncryptionSeed 
  }), [connectSeekerWallet, authorizeSeeker, signMessage, getEncryptionSeed]);
};
