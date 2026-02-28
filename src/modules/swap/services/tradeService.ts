import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { TokenInfo } from '../../data-module/types/tokenTypes';
import { getRpcUrl } from '@/modules/data-module';
import { JupiterUltraService } from './jupiterUltraService';

export type SwapProvider = 'Jupiter'; 

export interface TradeResponse {
  success: boolean;
  signature?: string;
  error?: Error | string;
  inputAmount: number;
  outputAmount: number;
}

export interface SwapCallback {
  statusCallback: (status: string) => void;
  isComponentMounted?: () => boolean;
}

/**
 * TradeService - Provider-agnostic service for executing token swaps
 */
export class TradeService {
  /**
   * Executes a token swap using the specified provider
   */
  static async executeSwap(
    inputToken: TokenInfo,
    outputToken: TokenInfo,
    inputAmount: string,
    walletPublicKey: PublicKey,
    transactionSender: { 
      sendTransaction: (transaction: any, connection: any, options?: any) => Promise<string>,
      sendBase64Transaction: (base64Tx: string, connection: any, options?: any) => Promise<string>,
      signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>
    },
    callbacks?: SwapCallback,
    provider: SwapProvider = 'Jupiter',
    options?: {
      poolAddress?: string;
      slippage?: number;
    }
  ): Promise<TradeResponse> {
    console.log(`[TradeService] 🚀 executeSwap called with provider: ${provider}`);
    
    try {
      const connection = new Connection(getRpcUrl(), 'confirmed');
      
      if (provider === 'Jupiter') {
        console.log('[TradeService] 🪐 Using JupiterUltraService for swap');
        return await JupiterUltraService.executeUltraSwap(
          inputToken,
          outputToken,
          inputAmount,
          walletPublicKey,
          transactionSender.signTransaction,
          connection,
          callbacks
        );
      }
      
      throw new Error(`Unsupported swap provider: ${provider}`);
    } catch (err: any) {
      console.error(`[TradeService] ❌ Trade error with provider ${provider}:`, err);
      return {
        success: false,
        error: err.message || err,
        inputAmount: parseFloat(inputAmount) || 0,
        outputAmount: 0
      };
    }
  }
}
