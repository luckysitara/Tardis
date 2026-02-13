import { Connection, Transaction, VersionedTransaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { TokenInfo } from '../../data-module/types/tokenTypes';
import { JupiterUltraService } from './jupiterUltraService';

import { TransactionService } from '../../wallet-providers/services/transaction/transactionService';

import { Alert } from 'react-native';

export type SwapProvider = 'JupiterUltra'; // Only JupiterUltra remains

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

// Fee configuration
const FEE_PERCENTAGE = 0.5; // 0.5% default fee

// FEE_RECIPIENT is removed, it was tied to COMMISSION_WALLET which is also removed.
// If fees are still desired, FEE_RECIPIENT needs to be configured (e.g. from environment variable)

/**
 * TradeService - Provider-agnostic service for executing token swaps
 * 
 * This service delegates to provider-specific services based on the requested provider:
 * - JupiterUltra: JupiterUltraService in this module
 */
export class TradeService {
  /**
   * Calculate fee amount from an output amount
   */
  static calculateFeeAmount(outputAmount: number, provider: SwapProvider = 'JupiterUltra'): number {
    // Only FEE_PERCENTAGE remains, as other providers are removed.
    const feePercentage = FEE_PERCENTAGE;
    
    const feeAmount = Math.floor(outputAmount * (feePercentage / 100));
    console.log(`[TradeService] 🧮 Calculated ${provider} fee: ${feeAmount} lamports (${feePercentage}% of ${outputAmount})`);
    return feeAmount;
  }

  /**
   * Creates a fee transaction to collect fees on behalf of the project
   */
  static async collectFee(
    outputAmount: number,
    walletPublicKey: PublicKey,
    sendTransaction: (
      transaction: Transaction | VersionedTransaction,
      connection: Connection, 
      options?: { statusCallback?: (status: string) => void, confirmTransaction?: boolean }
    ) => Promise<string>,
    statusCallback?: (status: string) => void,
    provider: SwapProvider = 'JupiterUltra'
  ): Promise<string | null> {
    console.log(`[TradeService] 🔍 STARTING FEE COLLECTION FOR ${provider}`);
    console.log(`[TradeService] 🔍 Output amount: ${outputAmount}`);
    console.log(`[TradeService] 🔍 Wallet: ${walletPublicKey.toString()}`);
    
    try {
      // Calculate fee amount based on provider
      const feeAmount = this.calculateFeeAmount(outputAmount, provider);
      const feePercentage = FEE_PERCENTAGE; // Only FEE_PERCENTAGE remains.
      
      if (feeAmount <= 0) {
        console.log('[TradeService] ⚠️ Fee amount too small, skipping fee collection');
        return null;
      }
      
      // Create direct RPC connection
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      
      // Get a fresh blockhash
      console.log('[TradeService] 🔗 Getting latest blockhash');
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      console.log(`[TradeService] 🔗 Blockhash received: ${blockhash}`);
      
      // Create fee transfer instruction
      // FEE_RECIPIENT needs to be defined here. For now, we hardcode it to a dummy or re-add from .env
      // Assuming a default FEE_RECIPIENT for now for compilation, but ideally from config.
      const feeRecipientPubkey = new PublicKey(process.env.EXPO_PUBLIC_FEE_RECIPIENT || 'Gj5wY2t2583F8D34Lw898D34Lw898D34Lw898D34Lw89'); // DUMMY PUBLIC KEY
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: feeRecipientPubkey,
        lamports: feeAmount
      });
      
      // Create a new transaction for the fee
      const feeTx = new Transaction();
      feeTx.add(transferInstruction);
      feeTx.recentBlockhash = blockhash;
      feeTx.feePayer = walletPublicKey;
      
      // Automatically send the fee transaction without user confirmation
      console.log(`[TradeService] 💰 Automatically collecting ${feePercentage}% fee (${feeAmount} lamports)`);
      
      if (statusCallback) {
        console.log('[TradeService] 📱 Calling status callback for fee transaction');
        statusCallback(`Collecting ${feePercentage}% fee...`);
      }
      
      console.log('[TradeService] 📤 Sending fee transaction...');
      
      try {
        const signature = await sendTransaction(
          feeTx,
          connection,
          {
            statusCallback: (status) => {
              console.log(`[TradeService Fee] 📡 Status: ${status}`);
              if (statusCallback) {
                statusCallback(`Fee: ${status}`);
              }
            },
            confirmTransaction: true
          }
        );
        
        console.log('[TradeService] ✅ Fee transaction successfully sent with signature:', signature);
        
        // Show notification for the fee transaction
        console.log('[TradeService] 🔔 Showing success notification');
        TransactionService.showSuccess(signature, 'transfer');
        
        return signature;
      } catch (sendError) {
        console.error('[TradeService] ❌ Error sending fee:', sendError);
        if (sendError instanceof Error) {
          console.error('[TradeService] ❌ Error message:', sendError.message);
        }
        // Log the error but don't show alert to user
        console.log('[TradeService] Fee transaction failed but swap was successful');
        return null;
      }
    } catch (error) {
      console.error('[TradeService] ❌ Error collecting fee:', error);
      if (error instanceof Error) {
        console.error('[TradeService] ❌ Error message:', error.message);
        console.error('[TradeService] ❌ Error stack:', error.stack);
      }
      return null;
    }
  }

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
      sendBase64Transaction: (base64Tx: string, connection: any, options?: any) => Promise<string> 
    },
    callbacks?: SwapCallback,
    provider: SwapProvider = 'JupiterUltra',
    options?: {
      poolAddress?: string; // poolAddress is not used for JupiterUltra directly
      slippage?: number;
    }
  ): Promise<TradeResponse> {
    console.log(`[TradeService] 🚀 executeSwap called with provider: ${provider}`);
    try {
      // Create a connection object that might be reused for fee collection
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      let swapResponse: TradeResponse;

      // Select provider implementation
      switch (provider) {
        case 'JupiterUltra':
          console.log('[TradeService] 🪐 Using JupiterUltraService for swap');
          swapResponse = await JupiterUltraService.executeUltraSwap(
            inputToken,
            outputToken,
            inputAmount,
            walletPublicKey,
            transactionSender.sendBase64Transaction,
            connection,
            callbacks
          );
          console.log('[TradeService] 🪐 Jupiter Ultra swap response:', JSON.stringify(swapResponse));
          break;
          
        default:
          console.error('[TradeService] Unsupported swap provider:', provider);
          throw new Error(`Unsupported swap provider: ${provider}`);
      }

      // If the swap was successful, collect the fee
      if (swapResponse.success) {
        console.log('[TradeService] 🎉 Swap successful, preparing to collect fee');
        console.log(`[TradeService] 📊 Swap output amount: ${swapResponse.outputAmount}`);
        
        if (swapResponse.outputAmount > 0) {
          try {
            console.log('[TradeService] 💸 Proceeding with fee collection');
            
            // Get status update function
            const statusCallback = callbacks?.statusCallback || (() => {});
            
            // Collect fee - will create and send a separate transaction
            // This doesn't affect the success of the main swap
            const feeSignature = await this.collectFee(
              swapResponse.outputAmount,
              walletPublicKey,
              transactionSender.sendTransaction,
              statusCallback,
              provider
            );
            
            if (feeSignature) {
              console.log('[TradeService] ✅ Fee collection successful with signature:', feeSignature);
            } else {
              console.log('[TradeService] ℹ️ Fee collection completed without signature');
            }
            
            // Send a final status update to signal the entire process is complete
            if (statusCallback) {
              statusCallback('Transaction complete! ✓');
            }
          } catch (feeError) {
            console.error('[TradeService] ❌ Error collecting fee, but swap was successful:', feeError);
            if (feeError instanceof Error) {
              console.error('[TradeService] ❌ Fee error message:', feeError.message);
              console.error('[TradeService] ❌ Fee error stack:', feeError.stack);
            }
            
            // Even if fee collection failed, the swap was successful, so mark as complete
            if (callbacks?.statusCallback) {
              callbacks.statusCallback('Swap completed successfully!');
            }
          }
        } else {
          console.log('[TradeService] ⚠️ Output amount is zero or invalid, cannot collect fee');
          console.log('[TradeService] ℹ️ outputAmount value:', swapResponse.outputAmount);
          console.log('[TradeService] ℹ️ outputAmount type:', typeof swapResponse.outputAmount);
          
          // Mark as complete even if we couldn't collect a fee
          if (callbacks?.statusCallback) {
            callbacks.statusCallback('Swap completed successfully!');
          }
        }
      } else {
        console.log('[TradeService] ❌ Swap was not successful, skipping fee collection');
        console.log('[TradeService] ℹ️ Swap error:', swapResponse.error);
      }
      
      return swapResponse;
    } catch (err: any) {
      console.error(`[TradeService] ❌ Trade error with provider ${provider}:`, err);
      
      // All special handling for PumpSwap and Raydium errors are removed
      
      return {
        success: false,
        error: err,
        inputAmount: 0,
        outputAmount: 0
      };
    }
  }
  
  /**
   * Converts a decimal amount to base units (e.g., SOL -> lamports)
   */
  static toBaseUnits(amount: string, decimals: number): number {
    const val = parseFloat(amount);
    if (isNaN(val)) return 0;
    return val * Math.pow(10, decimals);
  } 
}