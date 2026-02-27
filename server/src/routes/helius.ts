import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getConnection } from '../utils/connection';

const heliusRouter = Router();

/**
 * POST /api/helius/rpc
 * Proxies standard Solana RPC and Helius DAS API requests.
 */
heliusRouter.post('/rpc', async (req: Request, res: Response) => {
  try {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      return res.status(500).json({ 
        jsonrpc: '2.0', 
        error: { code: -32000, message: 'Server RPC_URL not configured' }, 
        id: req.body.id 
      });
    }

    const response = await axios.post(rpcUrl, req.body, {
      headers: { 'Content-Type': 'application/json' },
    });

    return res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('[Helius Proxy Error]:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { 
      jsonrpc: '2.0', 
      error: { code: -32603, message: error.message }, 
      id: req.body.id 
    };
    return res.status(status).json(errorData);
  }
});

/**
 * GET /api/helius/transactions/:address
 * Proxies Helius Enhanced Transactions API requests.
 */
heliusRouter.get('/transactions/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit = 20 } = req.query;
    const apiKey = process.env.HELIUS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Helius API key not configured on server' });
    }

    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=${limit}`;
    const response = await axios.get(url);

    return res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('[Helius Transactions Proxy Error]:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: error.message });
  }
});

export default heliusRouter;
