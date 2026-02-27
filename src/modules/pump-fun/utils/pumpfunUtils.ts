// FILE: src/utils/pumpfun/pumpfunUtils.ts

import {
  PublicKey,
  Connection,
  Transaction,
} from '@solana/web3.js';
import {AnchorProvider} from '@coral-xyz/anchor';
import { ENDPOINTS } from '@/shared/config/constants';
import { 
  PumpFunBondingBuyParams, 
  PumpFunBondingSellParams 
} from '@/modules/pump-fun/types';

/**
 * Setup: a standard AnchorProvider.
 */
export function getProvider(): AnchorProvider {
  const RPC_URL = ENDPOINTS.helius;
  const connection = new Connection(RPC_URL, 'confirmed');
  // Dummy wallet (no signing needed here).
  const dummyWallet = {
    publicKey: new PublicKey('11111111111111111111111111111111'),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  return new AnchorProvider(connection, dummyWallet, {
    commitment: 'confirmed',
    skipPreflight: true,
  });
}

/* ------------------------------------------------------------------
   PUMPFUN BONDING UTILS
--------------------------------------------------------------------- */

/**
 * Build a PumpFun "BUY" transaction using their bonding curve
 */
export async function buildPumpFunBuyTransaction({
  payerPubkey,
  tokenMint,
  lamportsToBuy,
  slippageBasis = 2000n,
  sdk,
  connection,
}: PumpFunBondingBuyParams): Promise<Transaction> {
  console.log(
    '[PumpFunBonding] buildPumpFunBuyTransaction() =>',
    lamportsToBuy.toString(),
  );

  const transaction = await sdk.getBuyInstructionsBySolAmount(
    payerPubkey,
    tokenMint,
    lamportsToBuy,
    slippageBasis,
  );
  const {blockhash} = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payerPubkey;
  return transaction;
}

/**
 * Build a PumpFun "SELL" transaction using their bonding curve
 */
export async function buildPumpFunSellTransaction({
  sellerPubkey,
  tokenMint,
  lamportsToSell,
  slippageBasis = 2000n,
  sdk,
  connection,
}: PumpFunBondingSellParams): Promise<Transaction> {
  console.log(
    '[PumpFunBonding] buildPumpFunSellTransaction() =>',
    lamportsToSell.toString(),
  );
  const transaction = await sdk.getSellInstructionsByTokenAmount(
    sellerPubkey,
    tokenMint,
    lamportsToSell,
    slippageBasis,
  );
  const {blockhash} = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sellerPubkey;
  return transaction;
}
