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
    console.log(`[TokenService] 💰 Fetching balance for ${tokenInfo.symbol} (${tokenInfo.address})`);
    // Leverage Jupiter Ultra Holdings API if possible, or fallback to RPC
    const holdings = await JupiterUltraService.getHoldings(walletPublicKey.toBase58());
    
    if (holdings && Array.isArray(holdings)) {
      const tokenHolding = holdings.find((h: any) => h.mint === tokenInfo.address);
      if (tokenHolding) {
        console.log(`[TokenService] ✅ Found balance in Jupiter holdings: ${tokenHolding.amount}`);
        return tokenHolding.amount / Math.pow(10, tokenInfo.decimals);
      }
    }
    
    console.log(`[TokenService] ℹ️ Token not found in Jupiter holdings, falling back to RPC`);
    // Fallback to RPC if not found in holdings
    const connection = new Connection(ENDPOINTS.helius, 'confirmed');

    if (tokenInfo.address === 'So11111111111111111111111111111111111111112') {
      const balance = await connection.getBalance(walletPublicKey);
      return Math.max(0, balance - 500000) / 1e9; // Reserve 0.0005 SOL
    } else {
      const tokenPubkey = new PublicKey(tokenInfo.address);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { mint: tokenPubkey }
      );

      if (tokenAccounts.value.length > 0) {
        const tokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
        return parseFloat(tokenBalance.amount) / Math.pow(10, tokenBalance.decimals);
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
    if (data && data.data && data.data[tokenInfo.address]) {
      const price = parseFloat(data.data[tokenInfo.address].price || '0');
      console.log(`[TokenService] ✅ Price success (proxy): ${price}`);
      return price;
    }
  } catch (proxyError) {
    console.warn(`[TokenService] Proxy price fetch failed, trying public API fallback`);
  }

  // 2. Fallback to direct public API (no API key, might be rate limited)
  try {
    const response = await fetch(`https://api.jup.ag/price/v2?ids=${tokenInfo.address}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data[tokenInfo.address]) {
        const price = parseFloat(data.data[tokenInfo.address].price || '0');
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
      const token = results.find((t: any) => t.address === tokenAddress) || results[0];
      console.log(`[TokenService] ✅ Metadata success: ${token.symbol}`);
      return {
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI || '',
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
        address: item.address,
        symbol: item.symbol,
        name: item.name,
        decimals: item.decimals,
        logoURI: item.logoURI || '',
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
    if (results && Array.isArray(results)) {
      return results.map((item: any) => ({
        address: item.address,
        symbol: item.symbol,
        name: item.name,
        decimals: item.decimals,
        logoURI: item.logoURI || '',
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
