import { Connection, PublicKey } from '@solana/web3.js';
import { ENDPOINTS } from '@/shared/config/constants';
import { TokenInfo } from '../types/tokenTypes';
import { JupiterUltraService } from '@/modules/swap/services/jupiterUltraService';

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
];

/**
 * Fetches the balance for a specific token
 */
export async function fetchTokenBalance(
  walletPublicKey: PublicKey,
  tokenInfo: TokenInfo | null
): Promise<number | null> {
  if (!tokenInfo) return null;

  try {
    const mint = tokenInfo.address;
    console.log(`[TokenService] 💰 Fetching balance for ${tokenInfo.symbol} (${mint})`);
    
    // Leverage Jupiter Ultra Holdings API
    const response = await JupiterUltraService.getHoldings(walletPublicKey.toBase58());
    
    if (response) {
      let tokenHolding: any = null;

      // Case 1: Response is an array of objects
      if (Array.isArray(response)) {
        tokenHolding = response.find((h: any) => (h.id || h.mint || h.address) === mint);
      } 
      // Case 2: Response has a tokens map
      else if (response.tokens) {
        tokenHolding = response.tokens[mint];
      }
      // Case 3: Response itself is a map
      else if (response[mint]) {
        tokenHolding = response[mint];
      }

      if (tokenHolding !== undefined && tokenHolding !== null) {
        // If holding is just a number or string
        if (typeof tokenHolding === 'number' || typeof tokenHolding === 'string') {
          const val = Number(tokenHolding);
          console.log(`[TokenService] ✅ Found balance (direct): ${val}`);
          return val / Math.pow(10, tokenInfo.decimals);
        }

        // If holding is an object, try common balance fields
        const rawAmount = tokenHolding.uiAmount !== undefined ? tokenHolding.uiAmount : 
                         (tokenHolding.amount !== undefined ? tokenHolding.amount : 
                         (tokenHolding.balance !== undefined ? tokenHolding.balance : null));
        
        if (rawAmount !== null) {
          const val = Number(rawAmount);
          const isUiAmount = tokenHolding.uiAmount !== undefined || tokenHolding.uiAmountString !== undefined;
          
          console.log(`[TokenService] ✅ Found balance in holdings: ${val} (isUi: ${isUiAmount})`);
          
          return isUiAmount ? val : val / Math.pow(10, tokenInfo.decimals);
        }
      }
    }
    
    console.log(`[TokenService] ℹ️ Token not found in Jupiter holdings, falling back to RPC`);
    // Fallback to RPC if not found in holdings
    const connection = new Connection(ENDPOINTS.helius, 'confirmed');

    if (mint === 'So11111111111111111111111111111111111111112') {
      const balance = await connection.getBalance(walletPublicKey);
      return Math.max(0, balance - 500000) / 1e9; // Reserve 0.0005 SOL
    } else {
      const tokenPubkey = new PublicKey(mint);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { mint: tokenPubkey }
      );

      if (tokenAccounts.value.length > 0) {
        const tokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
        const val = parseFloat(tokenBalance.uiAmountString || tokenBalance.uiAmount) || (parseFloat(tokenBalance.amount) / Math.pow(10, tokenBalance.decimals));
        console.log(`[TokenService] ✅ Found balance via RPC: ${val}`);
        return val;
      }
      return 0;
    }
  } catch (err) {
    console.error('[TokenService] Error fetching balance:', err);
    return 0;
  }
}

/**
 * Fetches the current price of a token from Jupiter API
 */
export async function fetchTokenPrice(tokenInfo: TokenInfo | null): Promise<number | null> {
  if (!tokenInfo || !tokenInfo.address) return null;
  
  console.log(`[TokenService] 🏷️ Fetching price for ${tokenInfo.symbol} (${tokenInfo.address})`);
  
  // 1. Try backend proxy first (has API key)
  try {
    const data = await JupiterUltraService.getPrice(tokenInfo.address);
    // V3 returns { "MINT": { "usdPrice": ... }, ... }
    const tokenData = data[tokenInfo.address] || (data.data && data.data[tokenInfo.address]);
    if (tokenData) {
      const price = parseFloat(tokenData.usdPrice || tokenData.price || '0');
      console.log(`[TokenService] ✅ Price success (proxy): ${price}`);
      return price;
    }
  } catch (proxyError) {
    console.warn(`[TokenService] Proxy price fetch failed, trying public API fallback`);
  }

  // 2. Fallback to direct public API (no API key, might be rate limited)
  try {
    const response = await fetch(`https://api.jup.ag/price/v3?ids=${tokenInfo.address}`);
    if (response.ok) {
      const data = await response.json();
      const tokenData = data[tokenInfo.address];
      if (tokenData) {
        const price = parseFloat(tokenData.usdPrice || tokenData.price || '0');
        console.log(`[TokenService] ✅ Price success (public): ${price}`);
        return price;
      }
    }
  } catch (publicError) {
    console.warn(`[TokenService] Public price fetch error:`, publicError);
  }

  console.warn(`[TokenService] ⚠️ No price data found for ${tokenInfo.symbol}`);
  return null;
}

/**
 * Fetches token metadata using Jupiter Ultra Search
 */
export async function fetchTokenMetadata(tokenAddress: string): Promise<TokenInfo | null> {
  if (!tokenAddress) return null;

  console.log(`[TokenService] 📑 Fetching metadata for ${tokenAddress}`);
  try {
    const results = await JupiterUltraService.searchTokens(tokenAddress);
    if (results && Array.isArray(results) && results.length > 0) {
      const token = results.find((t: any) => (t.id || t.address || t.mint) === tokenAddress) || results[0];
      console.log(`[TokenService] ✅ Metadata success: ${token.symbol}`);
      return {
        address: token.id || token.address || token.mint,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.icon || token.logoURI || '',
      };
    }
    console.warn(`[TokenService] ⚠️ No metadata results found for ${tokenAddress}`);
  } catch (err) {
    console.warn(`[TokenService] ❌ Metadata fetch error:`, err);
  }

  return null;
}

/**
 * Fetches a list of tokens using Jupiter Ultra Search
 */
export async function fetchTokenList(params: any = {}): Promise<TokenInfo[]> {
  try {
    // For a general list, we can search for a common term or use a default list
    const results = await JupiterUltraService.searchTokens(params.keyword || 'SOL');
    if (results && Array.isArray(results)) {
      return results.map((item: any) => ({
        address: item.id || item.address || item.mint,
        symbol: item.symbol,
        name: item.name,
        decimals: item.decimals,
        logoURI: item.icon || item.logoURI || '',
        price: item.usdPrice || item.price,
        priceChange24h: item.stats24h?.priceChange
      }));
    }
    return EXTENDED_DEFAULT_TOKENS;
  } catch (err) {
    console.error('[TokenService] Error fetching token list:', err);
    return EXTENDED_DEFAULT_TOKENS;
  }
}

/**
 * Searches for tokens by keyword using Jupiter Ultra API
 */
export async function searchTokens(params: { keyword: string }): Promise<TokenInfo[]> {
  try {
    const results = await JupiterUltraService.searchTokens(params.keyword);
    console.log(`[TokenService] searchTokens raw results count: ${results?.length || 0}`);
    
    if (results && Array.isArray(results)) {
      return results.map((item: any) => ({
        address: item.id || item.address || item.mint,
        symbol: item.symbol,
        name: item.name,
        decimals: item.decimals,
        logoURI: item.icon || item.logoURI || '',
        price: item.usdPrice || item.price,
        priceChange24h: item.stats24h?.priceChange
      }));
    }
    return [];
  } catch (err) {
    console.error('[TokenService] Error searching tokens:', err);
    return [];
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
