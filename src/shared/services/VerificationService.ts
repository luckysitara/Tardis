import { Platform } from 'react-native';
import * as Device from 'expo-device'; 
import { Connection, PublicKey } from '@solana/web3.js';
import { unpackMint, getTokenGroupMemberState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Constants from Official Solana Mobile Seeker Docs
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_GROUP_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

const getRpcUrl = () => {
  return process.env.EXPO_PUBLIC_HELIUS_STAKED_URL || process.env.EXPO_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
};

export const verifyHardware = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  
  const manufacturer = (Device.manufacturer ?? "").toLowerCase();
  const model = (Device.modelName ?? Device.designName ?? "").toLowerCase();

  console.log(`[VerificationService] Hardware Detected: Mfr='${Device.manufacturer}', Model='${Device.modelName}'`);

  const isSolanaDevice = manufacturer.includes('solana') || manufacturer.includes('osom');

  if (isSolanaDevice) {
    const isSeeker = model.includes('seeker') || model.includes('saga');
    console.log(isSeeker ? "✅ Verified Seeker Hardware!" : "⚠️ Solana device found, allowing access.");
    return true; 
  }

  return false;
};

export const verifySGT = async (address: string): Promise<boolean> => {
  console.log(`[VerificationService] Verifying SGT for wallet: ${address}`);
  try {
    const connection = new Connection(getRpcUrl());
    const pubkey = new PublicKey(address);

    const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_2022_PROGRAM_ID,
    });

    if (accounts.value.length === 0) {
      console.log(`[VerificationService] No Token-2022 accounts found for wallet: ${address}`);
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
    console.error('[VerificationService] SGT Verification Error:', error);
    return false;
  }
};
