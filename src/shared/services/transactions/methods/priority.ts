import { Platform } from 'react-native';
import {
  PublicKey,
  Connection,
  VersionedTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TransactionService } from '@/modules/wallet-providers/services/transaction/transactionService';
import { Buffer } from 'buffer';
import {
  createPriorityFeeInstructions,
  getLatestBlockhash,
  createVersionedTransaction,
  waitForConfirmation,
  createFilteredStatusCallback,
  extractSignatureFromError,
  isConfirmationError,
  DEFAULT_FEE_MAPPING,
  COMMISSION_WALLET_ADDRESS,
  calculateCommissionLamports,
  getCurrentFeeTier,
  createCommissionInstruction,
  calculateTransferAmountAfterCommission,
  SendTransactionParams,
  TransactionType,
} from '../core';

/**
 * Handle transaction completion (success, failure, or inconclusive)
 * Moved here to break circular dependency with helpers.ts
 */
export function handleTransactionCompletion(
  signature: string,
  isSuccess: boolean | null,
  txType?: TransactionType
): void {
  if (isSuccess === true) {
    TransactionService.showSuccess(signature, txType);
  } else if (isSuccess === false) {
    console.error(`[handleTransactionCompletion] Explicit failure for ${signature}`);
  } else {
    // Inconclusive (null) - Treat as likely success for better UX
    console.log(`[handleTransactionCompletion] Verification inconclusive for ${signature}, assuming success for UX.`);
    // Show success toast optimistically
    TransactionService.showSuccess(signature, txType);
  }
}

/**
 * Send a transaction directly using MWA (Mobile Wallet Adapter) with priority fees
 */
export async function sendPriorityTransactionMWA(
  connection: Connection,
  recipient: string,
  lamports: number,
  feeMapping: Record<string, number> = DEFAULT_FEE_MAPPING,
  onStatusUpdate?: (status: string) => void,
): Promise<string> {
  onStatusUpdate?.('[sendPriorityTransactionMWA] Starting MWA priority tx');
  console.log(
    '[sendPriorityTransactionMWA] Starting MWA priority tx, recipient=',
    recipient,
    'lamports=',
    lamports
  );

  if (Platform.OS !== 'android') {
    throw new Error('MWA is only supported on Android');
  }

  const mwaModule = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  const {transact} = mwaModule;
  const feeTier = getCurrentFeeTier();
  const microLamports = feeMapping[feeTier] || DEFAULT_FEE_MAPPING.low;

  console.log('[sendPriorityTransactionMWA] microLamports from feeMapping:', microLamports);
  onStatusUpdate?.(`Using ${feeTier} priority fee (${microLamports} microLamports)`);

  return await transact(async (wallet: any) => {
    try {
      console.log('[sendPriorityTransactionMWA] Inside transact callback...');
      onStatusUpdate?.('Authorizing with wallet...');
      
      const authResult = await wallet.authorize({
        cluster: 'devnet',
        identity: {
          name: 'React Native dApp',
          uri: 'https://yourdapp.com',
          icon: 'favicon.ico',
        },
      });
      console.log('[sendPriorityTransactionMWA] Authorization result:', authResult);

      const {Buffer} = require('buffer');
      const userEncodedPubkey = authResult.accounts[0].address;
      const userPubkeyBytes = Buffer.from(userEncodedPubkey, 'base64');
      const userPubkey = new PublicKey(userPubkeyBytes);
      console.log('[sendPriorityTransactionMWA] userPubkey:', userPubkey.toBase58());
      onStatusUpdate?.(`User public key: ${userPubkey.toBase58().slice(0, 6)}...${userPubkey.toBase58().slice(-4)}`);

      // 2) Build instructions
      console.log('[sendPriorityTransactionMWA] Building instructions...');
      onStatusUpdate?.('Building transaction...');
      const toPublicKey = new PublicKey(recipient);
      
      const { transferLamports, commissionLamports } = calculateTransferAmountAfterCommission(lamports);
      
      const transferIx = SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: toPublicKey,
        lamports: transferLamports,
      });
      
      const commissionIx = SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: new PublicKey(COMMISSION_WALLET_ADDRESS),
        lamports: commissionLamports,
      });

      const priorityInstructions = createPriorityFeeInstructions(feeMapping);
      
      const instructions = [
        ...priorityInstructions,
        transferIx,
        commissionIx,
      ];
      console.log('[sendPriorityTransactionMWA] Instructions created:', instructions.length);

      // 3) Build transaction
      const { blockhash, lastValidBlockHeight } = await getLatestBlockhash(connection);
      const transaction = await createVersionedTransaction(userPubkey, instructions, connection);

      onStatusUpdate?.('Requesting signature from wallet...');
      const signedTransactions = await wallet.signTransactions({
        transactions: [transaction],
      });

      if (!signedTransactions?.length) {
        throw new Error('No signed transactions returned from signTransactions');
      }
      
      const signedTx = signedTransactions[0];
      onStatusUpdate?.('Submitting transaction to network...');
      
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      
      console.log('[sendPriorityTransactionMWA] Got signature:', signature);

      waitForConfirmation(
        signature, 
        connection, 
        onStatusUpdate,
        undefined,
        undefined,
        blockhash,
        lastValidBlockHeight
      )
        .then(isSuccess => {
          handleTransactionCompletion(signature, isSuccess, 'transfer');
        })
        .catch(error => {
          console.error('[sendPriorityTransactionMWA] Error in confirmation:', error);
        });

      return signature;
    } catch (error: any) {
      console.log('[sendPriorityTransactionMWA] Caught error inside transact callback:', error);
      onStatusUpdate?.('Transaction failed');
      TransactionService.showError(error);
      throw error;
    }
  });
}

/**
 * Sends a transaction with priority fee settings
 */
export async function sendTransactionWithPriorityFee({
  wallet,
  instructions,
  connection,
  shouldUsePriorityFee = true,
  includeCommission = true,
  commissionData,
  onStatusUpdate,
}: SendTransactionParams): Promise<string> {
  try {
    let allInstructions = [...instructions];
    
    if (shouldUsePriorityFee) {
      const priorityInstructions = createPriorityFeeInstructions();
      allInstructions = [...priorityInstructions, ...allInstructions];
      onStatusUpdate?.(`Using ${getCurrentFeeTier()} priority fee`);
    }
    
    if (includeCommission && commissionData) {
      const commissionIx = createCommissionInstruction(
        commissionData.fromPubkey,
        commissionData.transactionLamports
      );
      allInstructions.push(commissionIx);
      onStatusUpdate?.(`Adding 0.5% commission (${calculateCommissionLamports(commissionData.transactionLamports) / LAMPORTS_PER_SOL} SOL)`);
    }
    
    let walletPublicKey: PublicKey;
    if (wallet.publicKey) {
      walletPublicKey = new PublicKey(wallet.publicKey);
    } else if (wallet.address) {
      walletPublicKey = new PublicKey(wallet.address);
    } else {
      throw new Error('No wallet public key or address found');
    }
    
    onStatusUpdate?.('Creating transaction...');
    const { blockhash, lastValidBlockHeight } = await getLatestBlockhash(connection);
    const transaction = await createVersionedTransaction(walletPublicKey, allInstructions, connection);
    
    onStatusUpdate?.('Signing transaction...');
    const statusCallback = createFilteredStatusCallback(onStatusUpdate);
    
    const signature = await TransactionService.signAndSendTransaction(
      { type: 'transaction', transaction },
      wallet,
      { 
        connection,
        statusCallback
      }
    );
    
    waitForConfirmation(
      signature, 
      connection, 
      onStatusUpdate,
      undefined,
      undefined,
      blockhash,
      lastValidBlockHeight
    )
      .then(isSuccess => {
        handleTransactionCompletion(signature, isSuccess, 'transfer');
      })
      .catch(error => {
        console.error('[sendTransactionWithPriorityFee] Error in confirmation promise:', error);
      });

    return signature;
  } catch (error: any) {
    const signature = extractSignatureFromError(error);
    if (signature) {
      onStatusUpdate?.(`Transaction sent. Check explorer for status: ${signature.slice(0, 8)}...`);
      handleTransactionCompletion(signature, null, 'transfer');
      return signature;
    }
    
    if (isConfirmationError(error)) {
      if (error.signature) {
        onStatusUpdate?.(`Transaction sent. Check explorer for status: ${error.signature.slice(0, 8)}...`);
        handleTransactionCompletion(error.signature, null, 'transfer');
        return error.signature;
      }
    }
    
    onStatusUpdate?.('Transaction failed');
    TransactionService.showError(error);
    throw error;
  }
}
