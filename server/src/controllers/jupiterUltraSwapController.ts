import { Request, Response } from 'express';
import axios from 'axios';

const JUPITER_API_KEY = process.env.JUPITER_API_KEY || '';
const ULTRA_BASE_URL = 'https://api.jup.ag/ultra/v1';
const PRICE_V2_URL = 'https://api.jup.ag/price/v2';
const PRICE_V1_URL = 'https://price.jup.ag/v4/price';

const headers = {
  'x-api-key': JUPITER_API_KEY,
  'Content-Type': 'application/json',
};

export const searchTokens = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    console.log(`[JupiterUltraController] 🔍 Search request for: "${query}"`);
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter is required' });
    }

    const response = await axios.get(`${ULTRA_BASE_URL}/search`, {
      params: { query },
      headers,
    });

    console.log(`[JupiterUltraController] ✅ Search success: found ${response.data?.length || 0} tokens`);
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[JupiterUltraController] ❌ Search error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to search tokens',
    });
  }
};

export const getShield = async (req: Request, res: Response) => {
  try {
    const { mints } = req.query;
    console.log(`[JupiterUltraController] 🛡️ Shield request for mints: ${mints}`);
    
    if (!mints) {
      return res.status(400).json({ success: false, error: 'Mints parameter is required' });
    }

    const response = await axios.get(`${ULTRA_BASE_URL}/shield`, {
      params: { mints },
      headers,
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[JupiterUltraController] ❌ Shield error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to get shield data',
    });
  }
};

export const getHoldings = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    console.log(`[JupiterUltraController] 💰 Holdings request for address: ${address}`);
    
    if (!address) {
      return res.status(400).json({ success: false, error: 'Address parameter is required' });
    }

    const response = await axios.get(`${ULTRA_BASE_URL}/holdings/${address}`, { headers });
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[JupiterUltraController] ❌ Holdings error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to get holdings',
    });
  }
};

export const getRouters = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${ULTRA_BASE_URL}/routers`, { headers });
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[JupiterUltraController] ❌ Routers error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to get routers',
    });
  }
};

export const getPrice = async (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    console.log(`[JupiterUltraController] 🏷️ Price request for: ${ids}`);
    
    if (!ids) {
      return res.status(400).json({ success: false, error: 'Ids parameter is required' });
    }

    // 1. Try Price V2 API (Best data, needs API key)
    try {
      const response = await axios.get(PRICE_V2_URL, {
        params: { ids },
        headers: { 'x-api-key': JUPITER_API_KEY }
      });
      if (response.data && response.data.data && Object.keys(response.data.data).length > 0) {
        console.log('[JupiterUltraController] ✅ Price V2 success');
        return res.status(200).json(response.data);
      }
    } catch (e) {
      console.warn('[JupiterUltraController] Price V2 failed or empty, trying V1');
    }

    // 2. Try Price V1 API (Stable fallback)
    try {
      const response = await axios.get(PRICE_V1_URL, {
        params: { ids }
      });
      if (response.data && response.data.data && Object.keys(response.data.data).length > 0) {
        console.log('[JupiterUltraController] ✅ Price V1 success');
        return res.status(200).json(response.data);
      }
    } catch (e) {
      console.warn('[JupiterUltraController] Price V1 failed, trying Search API');
    }

    // 3. Try Search API fallback
    const searchResponse = await axios.get(`${ULTRA_BASE_URL}/search`, {
      params: { query: ids },
      headers,
    });
    
    if (searchResponse.data && searchResponse.data.length > 0) {
      console.log('[JupiterUltraController] ✅ Search fallback success');
      const data: any = {};
      searchResponse.data.forEach((token: any) => {
        const address = token.address || token.mint;
        if (address) {
          data[address] = { price: token.price || 0 };
        }
      });
      
      return res.status(200).json({ data, time: Date.now() });
    }

    console.warn('[JupiterUltraController] ⚠️ All price methods failed for:', ids);
    return res.status(200).json({ data: {}, time: Date.now() });
  } catch (error: any) {
    console.error('[JupiterUltraController] ❌ Final Price error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getUltraOrder = async (req: Request, res: Response) => {
  try {
    const { inputMint, outputMint, amount, taker, slippageBps } = req.query;
    console.log(`[JupiterUltraController] 📝 Order request: ${inputMint} -> ${outputMint}, amount: ${amount}, taker: ${taker}`);

    if (!inputMint || !outputMint || !amount || !taker) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: inputMint, outputMint, amount, taker',
      });
    }

    const response = await axios.get(`${ULTRA_BASE_URL}/order`, {
      params: { inputMint, outputMint, amount, taker, slippageBps },
      headers,
    });

    console.log(`[JupiterUltraController] ✅ Order success`);
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[JupiterUltraController] ❌ Order error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to get Jupiter Ultra order',
    });
  }
};

export const executeUltraSwap = async (req: Request, res: Response) => {
  try {
    const { signedTransaction, requestId } = req.body;
    console.log(`[JupiterUltraController] 🚀 Execute request for requestId: ${requestId}`);

    if (!signedTransaction || !requestId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: signedTransaction, requestId',
      });
    }

    const response = await axios.post(
      `${ULTRA_BASE_URL}/execute`,
      { signedTransaction, requestId },
      { headers }
    );

    console.log(`[JupiterUltraController] ✅ Execute success: status=${response.data?.status}`);
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[JupiterUltraController] ❌ Execute error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to execute Jupiter Ultra swap',
    });
  }
};
