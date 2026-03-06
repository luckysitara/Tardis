import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import * as Device from 'expo-device'; 
import { Connection, PublicKey } from '@solana/web3.js';
import { unpackMint, getTokenGroupMemberState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { Colors } from '@/styles/theme';
import { setVerified, logoutSuccess } from '@/shared/state/auth/reducer';
import { verifyHardware, verifySGT } from '@/shared/services/VerificationService';

interface TardisShieldProps {
  children: React.ReactNode;
}

const TardisShield: React.FC<TardisShieldProps> = ({ children }) => {
  const isVerifiedInStore = useAppSelector(state => state.auth.isVerified);
  const [hasAccess, setHasAccess] = useState(isVerifiedInStore);
  const [isLoading, setIsLoading] = useState(!isVerifiedInStore);
  const walletAddress = useAppSelector(state => state.auth.address);
  const navigation = useAppNavigation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkAccess = async () => {
      // 1. If we already know the user is verified in the Redux store, we can skip the heavy RPC check
      // unless the wallet address changed.
      if (isVerifiedInStore && hasAccess) {
        setIsLoading(false);
        return;
      }
      
      if (!walletAddress) {
        setHasAccess(false);
        navigation.reset({ index: 0, routes: [{ name: 'LandingScreen' }] });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [hardwareVerified, sgtVerified] = await Promise.all([
          verifyHardware(),
          verifySGT(walletAddress)
        ]);

        console.log(`[TardisShield] Verification Results -> HW: ${hardwareVerified}, SGT: ${sgtVerified}`);

        if (hardwareVerified && sgtVerified) {
          // Sync with Redux store if needed
          if (!isVerifiedInStore) {
            dispatch(setVerified(true));
          }
          setHasAccess(true);
        } else {
          // Failure case: only update store if it was previously true
          if (isVerifiedInStore) {
            dispatch(setVerified(false));
          }
          setHasAccess(false);
          
          const reason = !hardwareVerified ? 'Hardware check failed.' : 'Seeker Genesis Token missing.';
          Alert.alert('Access Denied', `A verified Seeker device and SGT are required. Reason: ${reason}`, [
            { 
              text: 'OK', 
              onPress: () => {
                dispatch(logoutSuccess());
                navigation.reset({ index: 0, routes: [{ name: 'LandingScreen' }] });
              } 
            }
          ]);
        }
      } catch (error) {
        console.error('[TardisShield] Error checking access:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [walletAddress]); // Only re-run if the wallet address actually changes

  if (isLoading && !isVerifiedInStore) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.sonicCyan} />
        <Text style={styles.loadingText}>Verifying Tardis Access...</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: Colors.deepSpace, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.white, marginTop: 20, fontSize: 16 }
});

export default TardisShield;