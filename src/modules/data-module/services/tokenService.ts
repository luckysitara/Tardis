import { Connection, clusterApiUrl, Cluster, PublicKey } from '@solana/web3.js';

import { TokenInfo } from '../types/tokenTypes';
import { useCallback } from 'react'; // Keep useCallback if used elsewhere, otherwise remove
import { ENDPOINTS } from '@/shared/config/constants';

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
 * Fetches the price of a token
 */
export async function fetchTokenPrice(tokenInfo: TokenInfo | null): Promise<number | null> {
  if (!tokenInfo) {
    console.error('[TokenService] Cannot fetch price: Token info is null');
    return null;
  }

  try {
    console.log(`[TokenService] Fetching price for ${tokenInfo.symbol} (${tokenInfo.address}) from Jupiter`);
    const jupResponse = await fetch(`https://price.jup.ag/v4/price?ids=${tokenInfo.address}`);
    if (jupResponse.ok) {
      const jupData = await jupResponse.json();
      if (jupData?.data?.[tokenInfo.address]?.price) {
        const price = jupData.data[tokenInfo.address].price;
        console.log(`[TokenService] Jupiter returned price for ${tokenInfo.symbol}: ${price}`);
        return price;
      } else {
        console.log(`[TokenService] Jupiter API returned invalid price data:`, JSON.stringify(jupData));
      }
    } else {
        const errorText = await jupResponse.text();
        console.error(`[TokenService] Jupiter API error: ${jupResponse.status}, ${errorText}`);
    }
    
    console.log(`[TokenService] Failed to get price for ${tokenInfo.symbol} from Jupiter`);
    return null;
  } catch (err: any) {
    console.error('[TokenService] Error fetching token price from Jupiter:', err);
    return null;
  }
}

/**
 * Estimates the USD value of a token amount
 */
export async function estimateTokenUsdValue(
  tokenAmount: number,
  decimals: number,
  tokenMint: string,
  tokenSymbol?: string
): Promise<string> {
  try {
    // Convert to normalized amount
    const normalizedAmount = tokenAmount / Math.pow(10, decimals);

    const tokenInfo: TokenInfo = {
      address: tokenMint,
      symbol: tokenSymbol || '',
      name: tokenSymbol || '',
      decimals: decimals,
      logoURI: ''
    };
    
    const price = await fetchTokenPrice(tokenInfo);
    
    if (price && normalizedAmount > 0) {
      const estimatedValue = normalizedAmount * price;
      return `$${estimatedValue.toFixed(2)}`;
    }
    
    return '';
  } catch (err) {
    console.error('Error estimating token value:', err);
    return '';
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

// --- Jupiter Token List Integration ---
let jupiterTokenList: TokenInfo[] = [];
const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/all'; // Jupiter's comprehensive token list

/**
 * Fetches and caches the Jupiter token list.
 * @returns {Promise<TokenInfo[]>} The fetched token list.
 */
async function _fetchJupiterTokenList(): Promise<TokenInfo[]> {
  if (jupiterTokenList.length > 0) {
    return jupiterTokenList; // Return cached list if available
  }

  try {
    console.log('[TokenService] Fetching Jupiter token list...');
    const response = await fetch(JUPITER_TOKEN_LIST_URL);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TokenService] Jupiter token list API error: ${response.status}, ${errorText}`);
      throw new Error(`Failed to fetch Jupiter token list: ${response.status}`);
    }
    const data = await response.json();
    jupiterTokenList = data.map((item: any) => ({
      address: item.address || '',
      symbol: item.symbol || 'Unknown',
      name: item.name || 'Unknown Token',
      decimals: item.decimals !== undefined ? item.decimals : 9,
      logoURI: item.logoURI || '',
      // Jupiter list does not typically include price, marketCap, etc.
      // These will be fetched separately via fetchTokenPrice.
      price: 0, 
      marketCap: 0,
      volume24h: 0,
      priceChange24h: 0,
      liquidity: 0
    }));
    console.log(`[TokenService] Fetched ${jupiterTokenList.length} tokens from Jupiter list.`);
    return jupiterTokenList;
  } catch (error) {
    console.error('Error fetching Jupiter token list:', error);
    return [];
  }
}

/**
 * Fetches token list from Jupiter
 * @returns {Promise<TokenInfo[]>} A list of popular tokens.
 */
export async function fetchTokenList(): Promise<TokenInfo[]> {
  return await _fetchJupiterTokenList();
}

/**
 * Searches for tokens in the Jupiter token list.
 * @param {string} keyword - The search keyword.
 * @returns {Promise<TokenInfo[]>} A list of matching tokens.
 */
export async function searchTokens(keyword: string): Promise<TokenInfo[]> {
  const list = await _fetchJupiterTokenList();
  if (!keyword || keyword.trim() === '') {
    return list;
  }
  const lowerCaseKeyword = keyword.toLowerCase();
  return list.filter(token =>
    token.symbol.toLowerCase().includes(lowerCaseKeyword) ||
    token.name.toLowerCase().includes(lowerCaseKeyword) ||
    token.address.toLowerCase().includes(lowerCaseKeyword)
  );
}

/**
 * Fetches complete token metadata for a given token from the cached list.
 * @param {string} tokenAddress - The address of the token.
 * @returns {Promise<TokenInfo | null>} The token info if found, otherwise null.
 */
export async function fetchTokenMetadata(tokenAddress: string): Promise<TokenInfo | null> {
  const list = await _fetchJupiterTokenList();
  const foundToken = list.find(token => token.address === tokenAddress);
  
  if (foundToken) {
    // If the token is found, enrich it with price information
    const price = await fetchTokenPrice(foundToken);
    return { ...foundToken, price: price || 0 };
  }
  
  // If we can't fetch the data, return a basic token with the address
  return {
    address: tokenAddress,
    symbol: 'Unknown',
    name: 'Unknown Token',
    decimals: 9,
    logoURI: '',
    price: 0,
    marketCap: 0,
    volume24h: 0,
    priceChange24h: 0,
    liquidity: 0
  };
}


/**
 * Ensures a token has complete metadata
 */
export async function ensureCompleteTokenInfo(token: Partial<TokenInfo>): Promise<TokenInfo> {
  // Initialize with default values to ensure no nulls
  const defaultToken: TokenInfo = {
    address: token.address || '',
    symbol: token.symbol || 'Unknown',
    name: token.name || 'Unknown Token',
    decimals: token.decimals !== undefined ? token.decimals : 9,
    logoURI: token.logoURI || '',
    price: token.price || 0,
    marketCap: token.marketCap || 0,
    volume24h: token.volume24h || 0,
    priceChange24h: token.priceChange24h || 0,
    liquidity: token.liquidity || 0
  };

  // Only if we have an address, try to fetch complete metadata
  if (token.address) {
    try {
      const metadata = await fetchTokenMetadata(token.address);
    if (metadata) {
        // Merge fetched data with existing data, preferring existing non-null values
      return {
        ...metadata,
          symbol: token.symbol || metadata.symbol,
          name: token.name || metadata.name,
          decimals: token.decimals !== undefined ? token.decimals : metadata.decimals,
          logoURI: token.logoURI || metadata.logoURI
        };
      }
    } catch (error) {
      console.error('Error in ensureCompleteTokenInfo:', error);
      // Continue with default token if fetch fails
    }
  }

  // Return the token with default values for any missing fields
  return defaultToken;
}
