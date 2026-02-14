import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import * as Device from 'expo-device'; 
import { Connection, PublicKey } from '@solana/web3.js';
import { unpackMint, getTokenGroupMemberState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { useAppSelector } from '@/shared/hooks/useReduxHooks';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { Colors } from '@/styles/theme';

// Constants from Official Solana Mobile Seeker Docs
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_GROUP_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

const getRpcUrl = () => {
  return process.env.HELIUS_STAKED_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
};

interface TardisShieldProps {
  children: React.ReactNode;
}

const TardisShield: React.FC<TardisShieldProps> = ({ children }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const walletAddress = useAppSelector(state => state.auth.address);
  const navigation = useAppNavigation();

  const verifySGT = useCallback(async (address: string): Promise<boolean> => {
    console.log(`[TardisShield] Verifying SGT for wallet: ${address}`);
    try {
      const connection = new Connection(getRpcUrl());
      const pubkey = new PublicKey(address);

      const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: TOKEN_2022_PROGRAM_ID,
      });

      if (accounts.value.length === 0) {
        console.log(`[TardisShield] No Token-2022 accounts found for wallet: ${address}`);
        return false;
      }

      for (const account of accounts.value) {
        const mintPubkey = new PublicKey(account.account.data.parsed.info.mint);
        const info = await connection.getAccountInfo(mintPubkey);

        if (info) {
          try {
            const mint = unpackMint(mintPubkey, info, TOKEN_2022_PROGRAM_ID);
            const isAuthValid = mint.mintAuthority?.toBase58() === SGT_MINT_AUTHORITY;
            const groupMember = getTokenGroupMemberState(mint);
            const isGroupValid = groupMember?.group?.toBase58() === SGT_GROUP_ADDRESS;

            if (isAuthValid && isGroupValid) {
              console.log("✅ Verified Seeker Genesis Token Found!");
              return true;
            }
          } catch (e) {
            continue;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('[TardisShield] SGT Verification Error:', error);
      return false;
    }
  }, []);

  const verifyHardware = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    
    // Use friendlier fields with fallbacks
    const manufacturer = (Device.manufacturer ?? "").toLowerCase();
    const model = (Device.modelName ?? Device.designName ?? "").toLowerCase();

    console.log(`[TardisShield] Hardware Detected: Mfr='${Device.manufacturer}', Model='${Device.modelName}'`);

    // Gating Logic: Prioritize Manufacturer (Solana or OSOM)
    const isSolanaDevice = manufacturer.includes('solana') || manufacturer.includes('osom');

    // Model check is now an optional hint
    if (isSolanaDevice) {
      const isSeeker = model.includes('seeker') || model.includes('saga');
      console.log(isSeeker ? "✅ Verified Seeker Hardware!" : "⚠️ Solana device found, allowing access despite model name.");
      return true; 
    }

    return false;
  }, []);

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
        setHasAccess(true);
      } else {
        const reason = !hardwareVerified ? 'Hardware check failed.' : 'Seeker Genesis Token missing.';
        Alert.alert('Access Denied', `A verified Seeker device and SGT are required. Reason: ${reason}`, [
          { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'LandingScreen' }] }) }
        ]);
      }
      setIsLoading(false);
    };

    checkAccess();
  }, [walletAddress, verifyHardware, verifySGT, navigation]);

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