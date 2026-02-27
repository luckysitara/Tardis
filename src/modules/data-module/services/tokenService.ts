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

export const EXTENDED_DEFAULT_TOKENS: TokenInfo[] = [
  DEFAULT_SOL_TOKEN,
  DEFAULT_USDC_TOKEN,
  {
    address: 'So11111111111111111111111111111111111111112', // WSOL is the same address as SOL but is an SPL token
    symbol: 'WSOL',
    name: 'Wrapped Solana',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  {
    address: '3FMf92c2U54UcNn1b5aCjS5wVwK2g6rT52E34k26pL2T', // Example BTC (Wrapped Bitcoin on Solana)
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/3FMf92c2U54UcNn1b5aCjS5wVwK2g6rT52E34k26pL2T/logo.png',
  },
  {
    address: '2FPyTwcZgRPZEo7oW2t5DgUWKpYkJBkR8K3g8T5d5e2m', // Example ETH (Wrapped Ethereum on Solana)
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 8,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/2FPyTwcZgRPZEo7oW2t5DgUWKpYkJBkR8K3g8T5d5e2m/logo.png',
  },
];

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
    const rpcUrl = ENDPOINTS.helius;
    const connection = new Connection(rpcUrl, 'confirmed');

    if (
      tokenInfo.symbol === 'SOL' ||
      tokenInfo.address === 'So11111111111111111111111111111111111111112'
    ) {
      // For native SOL
      const balance = await connection.getBalance(walletPublicKey);
      console.warn("[TokenService] SOL balance in lamports:", balance);
      
      // Convert lamports to SOL
      const SOL_DECIMALS = 9;
      
      // For very small SOL amounts (less than 0.001 SOL), return the full balance
      // without reserving any for fees, since the user likely just wants to see what they have
      if (balance < 1_000_000) { // 0.001 SOL in lamports
        const fullSolBalance = balance / Math.pow(10, SOL_DECIMALS);
        console.warn("[TokenService] SOL balance is very small, returning full amount:", fullSolBalance);
        return fullSolBalance;
      }
      
      // Otherwise, reserve a small amount for fees
      const MIN_SOL_RESERVE = 0.0005; // 0.0005 SOL reserved for fees (500,000 lamports)
      const MIN_LAMPORTS_RESERVE = MIN_SOL_RESERVE * Math.pow(10, SOL_DECIMALS);
      
      // Calculate usable balance
      const usableBalance = Math.max(0, balance - MIN_LAMPORTS_RESERVE);
      const solBalance = usableBalance / Math.pow(10, SOL_DECIMALS);
      
      console.warn("[TokenService] SOL balance converted to SOL:", solBalance, 
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
          console.warn(`[TokenService] ${tokenInfo.symbol} balance:`, amount);
          return amount;
        } else {
          console.warn(`[TokenService] No ${tokenInfo.symbol} token account found`);
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

/**
 * Fetches the current price of a token from Jupiter API
 */
export async function fetchTokenPrice(tokenInfo: TokenInfo | null): Promise<number | null> {
  if (!tokenInfo || !tokenInfo.address) return null;
  
  console.warn(`[TokenService] Fetching price for: ${tokenInfo.symbol} (${tokenInfo.address})`);
  
  // Special case for SOL
  if (tokenInfo.symbol === 'SOL' || tokenInfo.address === 'So11111111111111111111111111111111111111112') {
    try {
      const response = await fetch('https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112');
      if (!response.ok) return null;
      const data = await response.json();
      
      if (data && data.data && data.data['So11111111111111111111111111111111111111112']) {
        const price = parseFloat(data.data['So11111111111111111111111111111111111111112'].price || '0');
        console.warn(`[TokenService] SOL Price: ${price}`);
        return price;
      }
      return null;
    } catch (e) {
      console.warn('[TokenService] SOL Price fetch error:', e);
      return null;
    }
  }

  try {
    const response = await fetch(`https://api.jup.ag/price/v2?ids=${tokenInfo.address}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data && data.data && data.data[tokenInfo.address]) {
      const price = parseFloat(data.data[tokenInfo.address].price || '0');
      console.warn(`[TokenService] ${tokenInfo.symbol} Price: ${price}`);
      return price;
    }
    
    console.warn(`[TokenService] No price data found for ${tokenInfo.symbol}`);
    return null;
  } catch (err) {
    console.warn(`[TokenService] Error fetching price for ${tokenInfo.symbol}:`, err);
    return null;
  }
}

/**
 * Fetches prices for multiple tokens at once from Jupiter API
 */
export async function fetchMultipleTokenPrices(addresses: string[]): Promise<Record<string, number>> {
  if (!addresses || addresses.length === 0) return {};

  try {
    const ids = addresses.join(',');
    const url = `https://api.jup.ag/price/v2?ids=${ids}`;
    console.warn(`[TokenService] Fetching bulk prices for ${addresses.length} tokens`);
    
    const response = await fetch(url);
    if (!response.ok) return {};
    const data = await response.json();
    
    const prices: Record<string, number> = {};
    if (data && data.data) {
      Object.keys(data.data).forEach(address => {
        if (data.data[address]) {
          prices[address] = parseFloat(data.data[address].price || '0');
        }
      });
    }
    
    return prices;
  } catch (err) {
    console.warn('[TokenService] Error fetching bulk prices:', err);
    return {};
  }
}

/**
 * Fetches token metadata from Jupiter
 */
export async function fetchTokenMetadata(tokenAddress: string): Promise<TokenInfo | null> {
  if (!tokenAddress) return null;

  // Try the main API first
  try {
    const url = `https://api.jup.ag/tokens/v1/token/${tokenAddress}`;
    console.warn(`[TokenService] Fetching metadata from: ${url}`);
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.warn(`[TokenService] Metadata received from api.jup.ag for ${tokenAddress}: ${data.symbol}`);
      return {
        address: data.address,
        symbol: data.symbol,
        name: data.name,
        decimals: data.decimals,
        logoURI: data.logoURI || '',
      };
    }
    console.warn(`[TokenService] api.jup.ag fetch failed: ${response.status}`);
  } catch (err) {
    console.warn(`[TokenService] api.jup.ag fetch error:`, err);
  }

  // Try the search API as a fallback
  try {
    const searchUrl = `https://api.jup.ag/tokens/v2/search?query=${tokenAddress}`;
    console.warn(`[TokenService] Trying search fallback: ${searchUrl}`);
    const searchResponse = await fetch(searchUrl);
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      // Search returns an array, pick the first exact match or first result
      const tokens = searchData.data || searchData;
      if (Array.isArray(tokens) && tokens.length > 0) {
        const token = tokens.find((t: any) => t.address === tokenAddress) || tokens[0];
        console.warn(`[TokenService] Metadata received from search fallback for ${tokenAddress}: ${token.symbol}`);
        return {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI || '',
        };
      }
    }
  } catch (err) {
    console.warn(`[TokenService] Search fallback error:`, err);
  }

  return null;
}

export interface TokenListParams {
  sort_by?: 'market_cap' | 'volume_24h_usd' | 'price_change_24h_percent';
  sort_type?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface TokenSearchParams {
  keyword: string;
  sort_by?: 'market_cap' | 'volume_24h_usd' | 'price_change_24h_percent';
  sort_type?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

/**
 * Fetches a list of top tokens from Jupiter
 */
export async function fetchTokenList(params: TokenListParams = {}): Promise<TokenInfo[]> {
  try {
    // Note: Jupiter's /tokens/v1/all is large, typically we'd use a more specific list or a cached version.
    // For this implementation, we'll use their "strict" list which is smaller and safer.
    const response = await fetch('https://token.jup.ag/strict');
    if (!response.ok) throw new Error('Failed to fetch token list');
    const data = await response.json();
    
    // Jupiter's list is just an array. We'll handle pagination and sorting locally for now
    // as their public CDN-hosted lists don't support these query params directly.
    let tokens = data.map((item: any) => ({
      address: item.address,
      symbol: item.symbol,
      name: item.name,
      decimals: item.decimals,
      logoURI: item.logoURI || '',
    }));

    // Simple mock pagination for the list
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    return tokens.slice(offset, offset + limit);
  } catch (err) {
    console.error('[TokenService] Error fetching token list:', err);
    return EXTENDED_DEFAULT_TOKENS;
  }
}

/**
 * Searches for tokens by keyword using Jupiter API
 */
export async function searchTokens(params: TokenSearchParams): Promise<TokenInfo[]> {
  try {
    if (!params.keyword || params.keyword.length < 2) {
      return EXTENDED_DEFAULT_TOKENS;
    }

    // Since Jupiter doesn't have a direct "search" endpoint in their v1 public API that works with keywords,
    // we'll fetch the strict list and filter locally. In a real production app, 
    // this should be done on a backend with a proper search index.
    const response = await fetch('https://token.jup.ag/strict');
    if (!response.ok) throw new Error('Failed to fetch tokens for search');
    const data = await response.json();
    
    const keyword = params.keyword.toLowerCase();
    const filtered = data.filter((item: any) => 
      item.symbol.toLowerCase().includes(keyword) || 
      item.name.toLowerCase().includes(keyword) ||
      item.address.toLowerCase() === keyword
    );

    const offset = params.offset || 0;
    const limit = params.limit || 20;
    return filtered.slice(offset, offset + limit).map((item: any) => ({
      address: item.address,
      symbol: item.symbol,
      name: item.name,
      decimals: item.decimals,
      logoURI: item.logoURI || '',
    }));
  } catch (err) {
    console.error('[TokenService] Error searching tokens:', err);
    return EXTENDED_DEFAULT_TOKENS;
  }
}

/**
 * Ensures a partial TokenInfo object is populated with full metadata
 */
export async function ensureCompleteTokenInfo(token: TokenInfo): Promise<TokenInfo> {
  if (token.name && token.decimals !== undefined && token.logoURI) {
    return token;
  }

  const metadata = await fetchTokenMetadata(token.address);
  if (metadata) {
    return {
      ...token,
      ...metadata,
    };
  }

  return token;
}

// All Jupiter token list/price/search functions removed as per user request.
// All Birdeye related code was already removed.
// The frontend will now rely on external services for token prices/lists
// or will need a custom implementation if basic token info is required.
