import {useCallback, useMemo} from 'react';
import {useDispatch} from 'react-redux';
import {Alert} from 'react-native';
import {loginSuccess, logoutSuccess} from '@/shared/state/auth/reducer';
import {useTardisMobileWallet} from './useTardisMobileWallet';
// Removed: import {usePrivyWalletLogic} from '../services/walletProviders/privy';
import {useCustomization} from '@/shared/config/CustomizationProvider';
import {useAppNavigation} from '@/shared/hooks/useAppNavigation';
// Removed: import {getDynamicClient} from '../services/walletProviders/dynamic';
import {useAppSelector} from '@/shared/hooks/useReduxHooks';
import {VersionedTransaction, PublicKey} from '@solana/web3.js'; // Keep VersionedTransaction and PublicKey as they might be used by MWA provider implementation
// Removed: import {useLoginWithOAuth} from '@privy-io/expo';
// Removed: import { useDynamicWalletLogic } from './useDynamicWalletLogic';
// Removed: import { useTurnkeyWalletLogic } from './useTurnkeyWalletLogic';
import { StandardWallet, LoginMethod, WalletMonitorParams } from '../types';

/**
 * Summarized usage:
 *  1) Read which provider is set from config.
 *  2) If 'mwa', we handle via `mwaWallet` logic.
 */
export function useAuth() {
  const {auth: authConfig} = useCustomization();
  const selectedProvider = authConfig.provider; // Should now always be 'mwa'
  const dispatch = useDispatch();
  const navigation = useAppNavigation();
  const authState = useAppSelector(state => state.auth);
  const { signMessage, getEncryptionSeed } = useTardisMobileWallet();

  // Get wallet address and provider from Redux state
  const storedAddress = authState.address;
  const storedProvider = authState.provider;

  // Only MWA case is handled now
  const result = useMemo(() => {
    if (selectedProvider === 'mwa' || (storedProvider === 'mwa' && storedAddress)) {
      console.log('[useAuth] Using MWA logic.');
      
      // Create standardized wallet object for MWA
      const mwaWallet: StandardWallet = {
        provider: 'mwa',
        address: storedAddress || '',
        publicKey: storedAddress || '',
        rawWallet: { address: storedAddress || '' },
        getWalletInfo: () => ({
          walletType: 'MWA',
          address: storedAddress || '',
        }),
        getProvider: async () => {
          throw new Error('MWA uses external wallet for signing. Use signMessage or signTransaction directly.');
        },
        signMessage: async (message: Uint8Array) => {
          const res = await signMessage(message);
          if (!res) throw new Error('Message signing failed or was cancelled');
          return res;
        },
        signTransaction: async (transaction: any) => {
          Alert.alert("Not Implemented", "Transaction signing via MWA is being finalized.");
          throw new Error('Transaction signing not yet implemented for MWA');
        },
        getEncryptionSeed: async () => {
          return await getEncryptionSeed();
        }
      };

      // Create a solanaWallet object for backward compatibility
      const solanaWallet = {
        wallets: [{
          publicKey: storedAddress || '',
          address: storedAddress || ''
        }],
        getProvider: mwaWallet.getProvider,
        signMessage: mwaWallet.signMessage,
        signTransaction: mwaWallet.signTransaction,
        getEncryptionSeed: mwaWallet.getEncryptionSeed
      };

      const logout = async () => {
        console.log('[useAuth] Attempting MWA logout...');
        try {
          dispatch(logoutSuccess());
          setTimeout(() => {
            try {
              navigation.reset({
                index: 0,
                routes: [{ name: 'LandingScreen' }],
              });
            } catch (navError) {
              console.error('[useAuth] Error during navigation reset:', navError);
            }
          }, 50);
        } catch (error) {
          console.error('[useAuth] Error during MWA logout:', error);
        }
      };

      return {
        status: (storedAddress ? 'authenticated' : '') as any,
        logout,
        user: storedAddress ? { id: storedAddress } : null,
        solanaWallet,
        wallet: mwaWallet,
        loginWithGoogle: async () => Alert.alert("Login Error", "Google login not configured for MWA."),
        loginWithApple: async () => Alert.alert("Login Error", "Apple login not configured for MWA."),
        loginWithEmail: async () => Alert.alert("Login Error", "Email login not configured for MWA."),
        loginWithSMS: async () => Alert.alert("Login Error", "SMS login not configured for MWA."),
        initEmailOtpLogin: async () => {},
        verifyEmailOtp: async () => {},
        loading: false,
        otpResponse: null,
        isAuthenticated: !!storedAddress,
        connected: !!storedAddress,
      };
    }
    return null;
  }, [selectedProvider, storedProvider, storedAddress, signMessage, dispatch, navigation]);

  if (result) return result;

  // Fallback if no MWA provider or stored address
  console.warn('[useAuth] No MWA provider selected or wallet not stored.');
  
  const safeLogout = async () => { 
    console.warn('[useAuth] Logout called but no provider active.');
    // Still dispatch logout action to ensure clean state
    dispatch(logoutSuccess());
    // Navigate to landing screen for safety
    setTimeout(() => {
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'LandingScreen' }],
        });
      } catch (navError) {
        console.error('[useAuth] Error during navigation reset:', navError);
      }
    }, 50);
  };
  
  // Create a complete empty interface with all methods that
  // could be called from any component
  return {
    status: '', 
    logout: safeLogout,
    // Auth methods
    loginWithGoogle: async () => {},
    loginWithApple: async () => {},
    loginWithEmail: async () => {},
    loginWithSMS: async () => {},
    initEmailOtpLogin: async () => {},
    verifyEmailOtp: async () => {},
    // Data
    user: null,
    solanaWallet: null,
    wallet: null,
    // State
    loading: false,
    otpResponse: null,
    isAuthenticated: false,
    connected: false
  };
}
