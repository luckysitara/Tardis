import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import axios from 'axios';
import { TokenInfo } from '../../data-module/types/tokenTypes';
import { ENDPOINTS } from '@/shared/config/constants';
import { TradeResponse, SwapCallback } from './tradeService';
import { Buffer } from 'buffer';

export interface JupiterUltraOrderResponse {
  transaction: string;
  requestId: string;
  slippageBps: number;
  swapType: string;
  outAmount?: number;
  inAmount?: number;
  priceImpactPct?: number;
  routePlan?: any[];
}

export interface JupiterUltraExecuteResponse {
  status: 'Success' | 'Failed' | 'Pending';
  signature?: string;
  error?: string;
  executedOutAmount?: number;
  executedInAmount?: number;
}

export class JupiterUltraService {
  /**
   * 0. PRICE — Get token prices
   */
  static async getPrice(ids: string): Promise<any> {
    try {
      console.log(`[JupiterUltraService] 🏷️ Calling proxied price for: ${ids}`);
      const response = await axios.get(`${ENDPOINTS.serverBase}/api/jupiter/ultra/price`, {
        params: { ids },
      });
      return response.data;
    } catch (error: any) {
      console.error('[JupiterUltraService] ❌ Price error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 1. SEARCH — Find tokens by symbol/name/mint
   */
  static async searchTokens(query: string): Promise<any> {
    try {
      console.log(`[JupiterUltraService] 🔍 Calling search for: "${query}"`);
      const response = await axios.get(`${ENDPOINTS.serverBase}/api/jupiter/ultra/search`, {
        params: { query },
      });
      console.log(`[JupiterUltraService] ✅ Search success: found ${response.data?.length || 0} tokens`);
      return response.data;
    } catch (error: any) {
      console.error('[JupiterUltraService] ❌ Search error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 2. SHIELD — Get security warnings for mints
   */
  static async getShield(mints: string[]): Promise<any> {
    try {
      console.log(`[JupiterUltraService] 🛡️ Calling shield for: ${mints}`);
      const response = await axios.get(`${ENDPOINTS.serverBase}/api/jupiter/ultra/shield`, {
        params: { mints: mints.join(',') },
      });
      console.log(`[JupiterUltraService] ✅ Shield success`);
      return response.data;
    } catch (error: any) {
      console.error('[JupiterUltraService] ❌ Shield error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 3. HOLDINGS — Get wallet token balances
   */
  static async getHoldings(address: string): Promise<any> {
    try {
      console.log(`[JupiterUltraService] 💰 Calling holdings for: ${address}`);
      const response = await axios.get(`${ENDPOINTS.serverBase}/api/jupiter/ultra/holdings/${address}`);
      console.log(`[JupiterUltraService] ✅ Holdings success: found ${response.data?.length || 0} tokens`);
      return response.data;
    } catch (error: any) {
      console.error('[JupiterUltraService] ❌ Holdings error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 4. ROUTERS — Get available routing engines
   */
  static async getRouters(): Promise<any> {
    try {
      console.log(`[JupiterUltraService] 🛣️ Calling routers`);
      const response = await axios.get(`${ENDPOINTS.serverBase}/api/jupiter/ultra/routers`);
      console.log(`[JupiterUltraService] ✅ Routers success`);
      return response.data;
    } catch (error: any) {
      console.error('[JupiterUltraService] ❌ Routers error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 5. ORDER — Get quote + unsigned transaction
   */
  static async getUltraOrder(
    inputMint: string,
    outputMint: string,
    amount: string,
    taker: string,
    slippageBps?: number
  ): Promise<JupiterUltraOrderResponse> {
    try {
      console.log(`[JupiterUltraService] 📝 Calling order: ${inputMint} -> ${outputMint}, Amount: ${amount}`);
      
      const response = await axios.get(`${ENDPOINTS.serverBase}/api/jupiter/ultra/order`, {
        params: {
          inputMint,
          outputMint,
          amount,
          taker,
          slippageBps,
        },
      });

      console.log(`[JupiterUltraService] ✅ Order success`);
      return response.data;
    } catch (error: any) {
      console.error('[JupiterUltraService] ❌ Order error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message || 'Failed to get Jupiter Ultra order');
    }
  }

  /**
   * 6. EXECUTE — Sign and submit the swap
   */
  static async executeUltraSwap(
    inputToken: TokenInfo,
    outputToken: TokenInfo,
    inputAmount: string,
    walletPublicKey: PublicKey,
    signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>,
    connection: Connection,
    callbacks?: SwapCallback
  ): Promise<TradeResponse> {
    try {
      if (callbacks?.statusCallback) {
        callbacks.statusCallback('Getting quote...');
      }

      // 1. Convert input amount to native units
      const amountInNativeUnits = Math.floor(
        parseFloat(inputAmount) * Math.pow(10, inputToken.decimals)
      );

      // 2. Get the order (unsigned transaction and requestId)
      const order = await this.getUltraOrder(
        inputToken.address,
        outputToken.address,
        amountInNativeUnits.toString(),
        walletPublicKey.toBase58()
      );

      if (!order.transaction) {
        throw new Error('No transaction returned from Jupiter Ultra');
      }

      if (callbacks?.statusCallback) {
        callbacks.statusCallback('Please sign the transaction...');
      }

      // 3. Deserialize and Sign the transaction
      console.log('[JupiterUltraService] ✍️ Deserializing transaction for signing');
      const transactionBuffer = Buffer.from(order.transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      
      console.log('[JupiterUltraService] ✍️ Requesting signature from wallet');
      const signedTransaction = await signTransaction(transaction);
      
      console.log('[JupiterUltraService] ✍️ Transaction signed successfully');
      const signedTransactionBase64 = Buffer.from(signedTransaction.serialize()).toString('base64');

      if (callbacks?.statusCallback) {
        callbacks.statusCallback('Executing swap...');
      }

      // 4. Execute the signed transaction via our server proxy to Jupiter Ultra
      console.log('[JupiterUltraService] 🔄 Executing signed transaction via Jupiter Ultra');
      
      const response = await axios.post(`${ENDPOINTS.serverBase}/api/jupiter/ultra/execute`, {
        signedTransaction: signedTransactionBase64,
        requestId: order.requestId,
      });

      const result = response.data;
      console.log('[JupiterUltraService] ✅ Jupiter Ultra Execute Response:', result);

      if (result.status === 'Failed' || result.error) {
        throw new Error(result.error || 'Transaction failed');
      }

      if (!result.signature) {
        throw new Error('Transaction response missing signature');
      }

      console.log('[JupiterUltraService] ✅ Swap successful with signature:', result.signature);

      if (callbacks?.statusCallback) {
        callbacks.statusCallback('Transaction complete! ✓');
      }

      return {
        success: true,
        signature: result.signature,
        inputAmount: parseFloat(inputAmount),
        outputAmount: result.executedOutAmount 
          ? result.executedOutAmount / Math.pow(10, outputToken.decimals) 
          : (order.outAmount ? order.outAmount / Math.pow(10, outputToken.decimals) : 0),
      };
    } catch (error: any) {
      console.error('[JupiterUltraService] ❌ Swap error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Swap failed';
      
      if (callbacks?.statusCallback) {
        callbacks.statusCallback(`Error: ${errorMessage}`);
      }

      return {
        success: false,
        error: errorMessage,
        inputAmount: parseFloat(inputAmount),
        outputAmount: 0,
      };
    }
  }
}
