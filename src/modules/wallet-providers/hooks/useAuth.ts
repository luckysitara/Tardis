import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {loginSuccess, logoutSuccess} from '@/shared/state/auth/reducer';
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

  // Get wallet address and provider from Redux state
  const storedAddress = authState.address;
  const storedProvider = authState.provider;

  // Only MWA case is handled now
  if (selectedProvider === 'mwa' || (storedProvider === 'mwa' && storedAddress)) {
    console.log('[useAuth] Using MWA logic.');
    // Create standardized wallet object for MWA
    const mwaWallet: StandardWallet = {
      provider: 'mwa',
      address: storedAddress || '', // Use storedAddress or empty string
      publicKey: storedAddress || '', // Use storedAddress or empty string
      rawWallet: { address: storedAddress || '' },
      getWalletInfo: () => ({
        walletType: 'MWA',
        address: storedAddress || '',
      }),
      getProvider: async () => {
        // Throw error with useful message about MWA not having a provider
        throw new Error('MWA uses external wallet for signing. This is expected behavior.');
      }
    };

    // Create a solanaWallet object for backward compatibility
    const solanaWallet = {
      wallets: [{
        publicKey: storedAddress || '',
        address: storedAddress || ''
      }],
      // Same behavior as the standardized wallet
      getProvider: mwaWallet.getProvider
    };

    const logout = useCallback(async () => {
      console.log('[useAuth] Attempting MWA logout (dispatching Redux action only)...');
      try {
        // For MWA, just clean up Redux state since there's no SDK to log out from
        console.log('[useAuth] Dispatching logoutSuccess for MWA.');
        dispatch(logoutSuccess());
        console.log('[useAuth] Redux logout dispatched for MWA. Resetting navigation.');
        
        // Use setTimeout to allow React to process state changes before navigation
        setTimeout(() => {
          try {
            // Reset navigation to the initial route of the logged-out stack
            navigation.reset({
              index: 0,
              routes: [{ name: 'LandingScreen' }],
            });
          } catch (navError) {
            console.error('[useAuth] Error during navigation reset:', navError);
          }
        }, 50);
      } catch (error) {
        console.error('[useAuth] Error during MWA logout dispatch:', error);
      }
    }, [dispatch, navigation]);

    // Simplified auth methods to reflect MWA-only for now
    const loginWithGoogle = async () => Alert.alert("Login Error", "Google login not configured for MWA.");
    const loginWithApple = async () => Alert.alert("Login Error", "Apple login not configured for MWA.");
    const loginWithEmail = async () => Alert.alert("Login Error", "Email login not configured for MWA.");
    const loginWithSMS = async () => Alert.alert("Login Error", "SMS login not configured for MWA.");
    const initEmailOtpLogin = async () => {};
    const verifyEmailOtp = async () => {};

    return {
      status: storedAddress ? 'authenticated' : '', // Simplified status for MWA
      logout,
      user: storedAddress ? { id: storedAddress } : null,
      solanaWallet,
      wallet: mwaWallet,
      loginWithGoogle,
      loginWithApple,
      loginWithEmail,
      loginWithSMS,
      initEmailOtpLogin,
      verifyEmailOtp,
      loading: false, // MWA login handled by external app, no loading state here
      otpResponse: null,
      isAuthenticated: !!storedAddress, // Simplified isAuthenticated
      connected: !!storedAddress, // Simplified connected
    };
  }

  // Fallback if no MWA provider or stored address
  console.warn('[useAuth] No MWA provider selected or wallet not stored. Returning empty auth methods.');
  
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
