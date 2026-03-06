import { Platform } from 'react-native';
import * as Device from 'expo-device'; 
import { Connection, PublicKey } from '@solana/web3.js';
import { unpackMint, getTokenGroupMemberState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { ENDPOINTS } from '@/shared/config/constants';

// Constants from Official Solana Mobile Seeker Docs
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_GROUP_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

const getRpcUrl = () => {
  // If we have a proxied helius endpoint, use it
  if (ENDPOINTS.helius && !ENDPOINTS.helius.startsWith('undefined') && !ENDPOINTS.helius.includes('10.203.135.79')) {
    return ENDPOINTS.helius;
  }
  // Fallback to a public RPC for SGT verification if backend is not configured
  return 'https://api.mainnet-beta.solana.com';
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

// Session-level cache to prevent redundant RPC calls during a single app session
let cachedSGTResult: { [address: string]: { result: boolean, timestamp: number } } = {};
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes

export const verifySGT = async (address: string): Promise<boolean> => {
  // Check session cache first
  const now = Date.now();
  if (cachedSGTResult[address] && (now - cachedSGTResult[address].timestamp < CACHE_DURATION)) {
    console.log(`[VerificationService] Using cached SGT result for ${address}: ${cachedSGTResult[address].result}`);
    return cachedSGTResult[address].result;
  }

  console.log(`[VerificationService] Verifying SGT for wallet: ${address}`);
  try {
    const connection = new Connection(getRpcUrl());
    const pubkey = new PublicKey(address);

    // OPTIMIZATION: Use getProgramAccounts with filters to find the SGT in ONE RPC call.
    // We filter for accounts owned by TOKEN_2022_PROGRAM_ID that belong to the SGT group.
    // The SGT Group Member extension stores the group address at offset 164 of the mint account.
    // However, the most reliable way to find the user's SGT is to check their token accounts.
    
    // Step 1: Get all token-2022 accounts for this owner
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_2022_PROGRAM_ID,
    });

    if (tokenAccounts.value.length === 0) {
      console.log(`[VerificationService] No Token-2022 accounts found for wallet: ${address}`);
      cachedSGTResult[address] = { result: false, timestamp: now };
      return false;
    }

    // Filter for accounts that have a balance > 0
    const activeAccounts = tokenAccounts.value.filter(
      (a) => parseFloat(a.account.data.parsed.info.tokenAmount.uiAmountString) > 0
    );

    // We still need to check the mint of these accounts, but we can do them in a single call using getMultipleAccountsInfo
    const mintAddresses = activeAccounts.map(a => new PublicKey(a.account.data.parsed.info.mint));
    
    if (mintAddresses.length === 0) {
      cachedSGTResult[address] = { result: false, timestamp: now };
      return false;
    }

    // Batch fetch all mint infos in ONE call instead of a loop of N calls
    const mintInfos = await connection.getMultipleAccountsInfo(mintAddresses);

    for (let i = 0; i < mintInfos.length; i++) {
      const info = mintInfos[i];
      const mintPubkey = mintAddresses[i];

      if (info) {
        try {
          const mint = unpackMint(mintPubkey, info, TOKEN_2022_PROGRAM_ID);
          const isAuthValid = mint.mintAuthority?.toBase58() === SGT_MINT_AUTHORITY;
          
          // Check for Group Member extension
          const groupMember = getTokenGroupMemberState(mint);
          const isGroupValid = groupMember?.group?.toBase58() === SGT_GROUP_ADDRESS;

          if (isAuthValid && isGroupValid) {
            console.log("✅ Verified Seeker Genesis Token Found!");
            cachedSGTResult[address] = { result: true, timestamp: now };
            return true;
          }
        } catch (e) {
          continue;
        }
      }
    }

    cachedSGTResult[address] = { result: false, timestamp: now };
    return false;
  } catch (error) {
    console.error('[VerificationService] SGT Verification Error:', error);
    // Don't cache errors to allow for retries
    return false;
  }
};
