import { Platform } from 'react-native';
import * as Device from 'expo-device'; 
import { Connection, PublicKey } from '@solana/web3.js';
import { unpackMint, getTokenGroupMemberState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { ENDPOINTS } from '@/shared/config/constants';

// Constants from Official Solana Mobile Seeker Docs
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_GROUP_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

const getRpcUrl = () => {
  // If we have a proxied helius endpoint, use it - but ensure it's a valid URL string
  if (ENDPOINTS.helius && 
      !ENDPOINTS.helius.startsWith('undefined') && 
      ENDPOINTS.helius.startsWith('http') &&
      !ENDPOINTS.helius.includes('10.203.135.79')) {
    return ENDPOINTS.helius;
  }
  // Fallback to a highly reliable public RPC for SGT verification
  return 'https://api.mainnet-beta.solana.com';
};

export const verifyHardware = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  
  const manufacturer = (Device.manufacturer ?? "").toLowerCase();
  const model = (Device.modelName ?? Device.designName ?? "").toLowerCase();

  console.log(`[VerificationService] Hardware Detected: Mfr='${Device.manufacturer}', Model='${Device.modelName}'`);

  // Seeker or Saga - allow either for developer flexibility
  const isSolanaDevice = manufacturer.includes('solana') || manufacturer.includes('osom') || model.includes('seeker') || model.includes('saga');

  if (isSolanaDevice) {
    console.log("✅ Verified Solana Mobile Hardware!");
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
  
  // Create a connection with a clear timeout to avoid hanging the UI
  const connection = new Connection(getRpcUrl(), {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 10000
  });

  try {
    const pubkey = new PublicKey(address);

    // Step 1: Get all token-2022 accounts for this owner
    const fetchTokenAccounts = async () => {
      return await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: TOKEN_2022_PROGRAM_ID,
      });
    };

    const tokenAccounts = await Promise.race([
      fetchTokenAccounts(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 10000))
    ]);

    if (!tokenAccounts || tokenAccounts.value.length === 0) {
      console.log(`[VerificationService] No Token-2022 accounts found for wallet: ${address}`);
      // Only cache negative results for a shorter time in case of network blips
      cachedSGTResult[address] = { result: false, timestamp: now - (CACHE_DURATION / 2) };
      return false;
    }

    // Filter for accounts that have a balance > 0
    const activeAccounts = tokenAccounts.value.filter(
      (a: any) => parseFloat(a.account.data.parsed.info.tokenAmount.uiAmountString) > 0
    );

    const mintAddresses = activeAccounts.map((a: any) => new PublicKey(a.account.data.parsed.info.mint));
    
    if (mintAddresses.length === 0) {
      cachedSGTResult[address] = { result: false, timestamp: now };
      return false;
    }

    // Batch fetch all mint infos
    const mintInfos = await connection.getMultipleAccountsInfo(mintAddresses);

    for (let i = 0; i < mintInfos.length; i++) {
      const info = mintInfos[i];
      const mintPubkey = mintAddresses[i];

      if (info) {
        try {
          const mint = unpackMint(mintPubkey, info, TOKEN_2022_PROGRAM_ID);
          const isAuthValid = mint.mintAuthority?.toBase58() === SGT_MINT_AUTHORITY;
          
          // Check for Group Member extension if present
          let isGroupValid = false;
          try {
            const groupMember = getTokenGroupMemberState(mint);
            isGroupValid = groupMember?.group?.toBase58() === SGT_GROUP_ADDRESS;
          } catch (e) {
            // Some SGTs might not have the extension yet or parser might fail
          }

          // Authority check is the primary verification method
          if (isAuthValid) {
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
    return false;
  }
};
