import { Router, Request, Response } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import axios from 'axios';
import { getConnection } from '../../utils/connection';
import Decimal from 'decimal.js';

const router = Router();

// Cache for token metadata to avoid repeated API calls
const metadataCache = new Map();

/**
 * GET /api/user/portfolio/:address
 * Returns aggregated portfolio data including balances and prices
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const connection = getConnection();
    const pubkey = new PublicKey(address);

    // 1. Fetch SOL Balance
    const solBalanceLamports = await connection.getBalance(pubkey);
    const solBalance = solBalanceLamports / 1e9;

    // 2. Fetch Token Accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    const tokens = tokenAccounts.value.map((account) => {
      const info = account.account.data.parsed.info;
      return {
        mint: info.mint,
        amount: info.tokenAmount.uiAmount,
        decimals: info.tokenAmount.decimals,
      };
    }).filter(t => t.amount > 0);

    // 3. Add SOL to the list
    const allTokens = [
      { mint: 'So11111111111111111111111111111111111111112', amount: solBalance, symbol: 'SOL', name: 'Solana', decimals: 9 },
      ...tokens
    ];

    // 4. Fetch Prices (Using Jupiter)
    const prices: Record<string, number> = {};
    const JUP_API_KEY = process.env.JUPITER_API_KEY;
    
    try {
      const mints = allTokens.map(t => t.mint).join(',');
      const priceResponse = await axios.get(`https://api.jup.ag/price/v2?ids=${mints}`, {
        headers: JUP_API_KEY ? {
          'x-api-key': JUP_API_KEY
        } : {}
      });
      const jupData = priceResponse.data.data;
      
      allTokens.forEach(t => {
        if (jupData && jupData[t.mint]) {
          prices[t.mint] = parseFloat(jupData[t.mint].price);
        }
      });
    } catch (e: any) {
      console.warn(`[Portfolio] Jupiter Price Fetch Failed: ${e.message}`);
    }

    // 5. Aggregate Data
    let totalUsdValue = new Decimal(0);
    const formattedTokens = allTokens.map(t => {
      const price = prices[t.mint] || 0;
      const usdValue = new Decimal(t.amount).mul(price).toNumber();
      totalUsdValue = totalUsdValue.add(usdValue);
      
      return {
        ...t,
        price,
        usdValue,
        logoURI: `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${t.mint}/logo.png` // Fallback
      };
    }).sort((a, b) => b.usdValue - a.usdValue);

    res.json({
      success: true,
      totalBalance: totalUsdValue.toNumber(),
      tokens: formattedTokens
    });

  } catch (error: any) {
    console.error('[Portfolio] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch portfolio data' });
  }
});

export default router;
