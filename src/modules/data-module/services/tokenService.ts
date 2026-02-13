import { Connection, clusterApiUrl, Cluster, PublicKey } from '@solana/web3.js';
import { ENDPOINTS } from '@/shared/config/constants';
import { TokenInfo } from '../types/tokenTypes';

/**
 * Default token entries
 */
export const DEFAULT_SOL_TOKEN: TokenInfo = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
};

export const DEFAULT_USDC_TOKEN: TokenInfo = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
};

/**
 * Fetches the balance for a specific token
 */
export async function fetchTokenBalance(
  walletPublicKey: PublicKey,
  tokenInfo: TokenInfo | null
): Promise<number | null> {
  // Return null if token is null
  if (!tokenInfo) {
    console.error('[TokenService] Cannot fetch balance: Token info is null');
    return null;
  }

  try {
    const rpcUrl = process.env.EXPO_PUBLIC_HELIUS_STAKED_URL || ENDPOINTS.helius || clusterApiUrl(process.env.EXPO_PUBLIC_CLUSTER as Cluster);
    const connection = new Connection(rpcUrl, 'confirmed');

    if (
      tokenInfo.symbol === 'SOL' ||
      tokenInfo.address === 'So11111111111111111111111111111111111111112'
    ) {
      // For native SOL
      const balance = await connection.getBalance(walletPublicKey);
      console.log("[TokenService] SOL balance in lamports:", balance);
      
      // Convert lamports to SOL
      const SOL_DECIMALS = 9;
      
      // For very small SOL amounts (less than 0.001 SOL), return the full balance
      // without reserving any for fees, since the user likely just wants to see what they have
      if (balance < 1_000_000) { // 0.001 SOL in lamports
        const fullSolBalance = balance / Math.pow(10, SOL_DECIMALS);
        console.log("[TokenService] SOL balance is very small, returning full amount:", fullSolBalance);
        return fullSolBalance;
      }
      
      // Otherwise, reserve a small amount for fees
      const MIN_SOL_RESERVE = 0.0005; // 0.0005 SOL reserved for fees (500,000 lamports)
      const MIN_LAMPORTS_RESERVE = MIN_SOL_RESERVE * Math.pow(10, SOL_DECIMALS);
      
      // Calculate usable balance
      const usableBalance = Math.max(0, balance - MIN_LAMPORTS_RESERVE);
      const solBalance = usableBalance / Math.pow(10, SOL_DECIMALS);
      
      console.log("[TokenService] SOL balance converted to SOL:", solBalance, 
        `(Reserved ${MIN_SOL_RESERVE} SOL for fees, raw balance: ${balance / Math.pow(10, SOL_DECIMALS)} SOL)`);
      
      return solBalance;
    } else {
      // For SPL tokens
      try {
        const tokenPubkey = new PublicKey(tokenInfo.address);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          walletPublicKey,
          { mint: tokenPubkey }
        );

        if (tokenAccounts.value.length > 0) {
          // Get the token amount from the first account
          const tokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
          const amount = parseFloat(tokenBalance.amount) / Math.pow(10, tokenBalance.decimals);
          console.log(`[TokenService] ${tokenInfo.symbol} balance:`, amount);
          return amount;
        } else {
          console.log(`[TokenService] No ${tokenInfo.symbol} token account found`);
          return 0;
        }
      } catch (err) {
        console.error(`[TokenService] Error fetching ${tokenInfo.symbol} token balance:`, err);
        return 0;
      }
    }
  } catch (err) {
    console.error('[TokenService] Error fetching balance:', err);
    return 0; // Return 0 instead of null to avoid UI issues
  }
}

/**
 * Converts a decimal amount to base units (e.g., SOL -> lamports)
 */
export function toBaseUnits(amount: string, decimals: number): number {
  const val = parseFloat(amount);
  if (isNaN(val)) return 0;
  return val * Math.pow(10, decimals);
}

// All Jupiter token list/price/search functions removed as per user request.
// All Birdeye related code was already removed.
// The frontend will now rely on external services for token prices/lists
// or will need a custom implementation if basic token info is required.
