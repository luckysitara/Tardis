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
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const walletAddress = useAppSelector(state => state.auth.address);
  const navigation = useAppNavigation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      if (!walletAddress) {
        setHasAccess(false);
        navigation.reset({ index: 0, routes: [{ name: 'LandingScreen' }] });
        setIsLoading(false);
        return;
      }

      const [hardwareVerified, sgtVerified] = await Promise.all([
        verifyHardware(),
        verifySGT(walletAddress)
      ]);

      console.log(`[TardisShield] Results -> HW: ${hardwareVerified}, SGT: ${sgtVerified}`);

      if (hardwareVerified && sgtVerified) {
        dispatch(setVerified(true));
        setHasAccess(true);
      } else {
        dispatch(setVerified(false));
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
      setIsLoading(false);
    };

    checkAccess();
  }, [walletAddress, navigation, dispatch]);

  if (isLoading || !hasAccess) {
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