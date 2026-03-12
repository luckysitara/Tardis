import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from '@solana/web3.js';
import {PumpFunSDK} from 'pumpdotfun-sdk';
import {getAssociatedTokenAddress} from '@solana/spl-token';
import {
  PumpSdk,
  BondingCurve,
  getBuyTokenAmountFromSolAmount,
} from '@pump-fun/pump-sdk';
import {
  CreateAndBuyTokenParams,
  BuyTokenParams,
  SellTokenParams,
} from './types';
import BN from 'bn.js';
import {
  getProvider,
  buildPumpFunBuyTransaction,
  buildPumpFunSellTransaction,
} from '../utils/pumpfunUtils';
import {COMMISSION_WALLET} from '@env';
import { SERVER_BASE_URL } from '@/shared/config/server';
import {TransactionService} from '@/modules/wallet-providers';

/**
 * Create and immediately buy tokens
 */
export async function createAndBuyTokenViaPumpfun({
  userPublicKey,
  tokenName,
  tokenSymbol,
  description,
  twitter,
  telegram,
  website,
  imageUri,
  solAmount,
  solanaWallet,
  onStatusUpdate,
}: CreateAndBuyTokenParams) {
  if (!solanaWallet) {
    throw new Error(
      'No Solana wallet found. Please connect your wallet first.',
    );
  }

  const provider = getProvider();
  const connection = provider.connection;
  const pumpSdk = new PumpSdk(connection);
  const creatorPubkey = new PublicKey(userPublicKey);
  // This is the recipient for Pump.fun's own platform fees
  const pumpFunPlatformFeeRecipient = new PublicKey(COMMISSION_WALLET);
  // This is the recipient for our additional 0.5% platform commission.
  const ourPlatformCommissionWallet = new PublicKey(COMMISSION_WALLET);

  try {
    const OUR_COMMISSION_RATE = 0.005; // 0.5%
    const totalSolLamportsUserPays = Math.floor(solAmount * LAMPORTS_PER_SOL);

    const ourCommissionLamports = Math.floor(
      totalSolLamportsUserPays * OUR_COMMISSION_RATE,
    );
    const solAmountForPumpFunBuyLamports =
      totalSolLamportsUserPays - ourCommissionLamports;

    if (solAmountForPumpFunBuyLamports < 0) {
      throw new Error('SOL amount is too small to cover the 0.5% platform commission fee.');
    }

    onStatusUpdate?.('Uploading token metadata...');
    const uploadEndpoint = `${SERVER_BASE_URL}/api/pumpfun/uploadMetadata`;

    const mint = Keypair.generate();

    // Create FormData object
    const formData = new FormData();
    formData.append('tokenName', tokenName);
    formData.append('tokenSymbol', tokenSymbol);
    formData.append('description', description);
    formData.append('twitter', twitter || '');
    formData.append('telegram', telegram || '');
    formData.append('website', website || '');
    formData.append('createdOn', 'https://www.solanaappkit.com');
    
    // For React Native FormData, the object needs 'uri', 'name', and 'type'
    const imageFile = {
      uri: imageUri,
      name: 'image.png',
      type: 'image/png',
    };
    formData.append('image', imageFile as any);

    const uploadResponse = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
    });
    if (!uploadResponse.ok) {
      const errMsg = await uploadResponse.text();
      throw new Error(`Metadata upload failed: ${errMsg}`);
    }
    const uploadJson = await uploadResponse.json();
    if (!uploadJson?.success || !uploadJson.metadataUri) {
      throw new Error(uploadJson?.error || 'No metadataUri returned');
    }

    const {metadataUri} = uploadJson;

    onStatusUpdate?.('Preparing token creation...');
    const createIx = await pumpSdk.createInstruction(
      mint.publicKey,
      tokenName,
      tokenSymbol,
      metadataUri,
      pumpFunPlatformFeeRecipient,
      creatorPubkey,
    );

    const instructions: TransactionInstruction[] = [createIx];

    if (ourCommissionLamports > 0) {
      instructions.push(SystemProgram.transfer({
        fromPubkey: creatorPubkey,
        toPubkey: ourPlatformCommissionWallet,
        lamports: ourCommissionLamports,
      }));
    }

    if (solAmountForPumpFunBuyLamports > 0 && solAmount > 0) {
      onStatusUpdate?.('Preparing initial buy instructions...');
      const global = await pumpSdk.fetchGlobal();
      if (!global) {
        throw new Error('Failed to fetch Pump.fun global state.');
      }

      console.log('[PumpFun] Global state fetched:', JSON.stringify(global, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));

      // Map properties safely, handling potential BigInt or BN objects
      const getVal = (v: any) => (v !== undefined && v !== null) ? v.toString() : '0';

      const bondingCurve: BondingCurve = {
        virtualTokenReserves: new BN(getVal(global.initialVirtualTokenReserves || (global as any).virtualTokenReserves)),
        virtualSolReserves: new BN(getVal(global.initialVirtualSolReserves || (global as any).virtualSolReserves)),
        realTokenReserves: new BN(getVal(global.initialRealTokenReserves || (global as any).realTokenReserves)),
        realSolReserves: new BN('0'),
        tokenTotalSupply: new BN(getVal(global.tokenTotalSupply)),
        complete: !!global.complete,
        creator: creatorPubkey,
      };

      console.log('[PumpFun] Bonding curve initialized');

      const solAmountForBuyBN = new BN(solAmountForPumpFunBuyLamports.toString());
      
      let buyTokenAmount: BN;
      try {
        buyTokenAmount = getBuyTokenAmountFromSolAmount(
          global,
          bondingCurve,
          solAmountForBuyBN,
          true,
        );
        console.log('[PumpFun] Calculated buy token amount:', buyTokenAmount.toString());
      } catch (calcErr) {
        console.error('[PumpFun] Error calculating buy amount:', calcErr);
        // Fallback calculation if the SDK function fails
        buyTokenAmount = solAmountForBuyBN.mul(bondingCurve.virtualTokenReserves).div(bondingCurve.virtualSolReserves);
        console.log('[PumpFun] Fallback calculation result:', buyTokenAmount.toString());
      }

      const buyIx = await pumpSdk.buyInstructions(
        global,
        null,
        bondingCurve,
        mint.publicKey,
        creatorPubkey,
        buyTokenAmount,
        solAmountForBuyBN,
        1,
        pumpFunPlatformFeeRecipient,
      );
      instructions.push(...buyIx);
    }

    const {blockhash} = await provider.connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: creatorPubkey,
      recentBlockhash: blockhash,
      instructions: instructions,
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([mint]);

    onStatusUpdate?.('Sending transaction for approval...');
    const txSignature = await TransactionService.signAndSendTransaction(
      {type: 'transaction', transaction: tx},
      solanaWallet,
      {
        connection,
        statusCallback: onStatusUpdate,
      },
    );

    if (!txSignature) {
      throw new Error('Transaction failed.');
    }

    onStatusUpdate?.('Token launched successfully!');
    return {
      mint: mint.publicKey.toString(),
      txSignature,
      metadataUri,
    };
  } catch (err: any) {
    console.error('createAndBuyTokenViaPumpfun error:', err);
    throw err;
  }
}

/**
 * buyTokenViaPumpfun
 */
export async function buyTokenViaPumpfun({
  buyerPublicKey,
  tokenAddress,
  solAmount,
  solanaWallet,
  onStatusUpdate,
}: BuyTokenParams) {
  if (!solanaWallet) {
    throw new Error('No Solana wallet found. Please connect your wallet first.');
  }

  const provider = getProvider();
  const connection = provider.connection;
  const sdk = new PumpFunSDK(provider);

  try {
    onStatusUpdate?.('Preparing PumpFun token purchase...');
    const mintPubkey = new PublicKey(tokenAddress);
    const buyerPubkey = new PublicKey(buyerPublicKey);

    onStatusUpdate?.('Building transaction...');
    const tx = await buildPumpFunBuyTransaction({
      payerPubkey: buyerPubkey,
      tokenMint: mintPubkey,
      lamportsToBuy: BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL)),
      sdk,
      connection,
    });

    onStatusUpdate?.('Sending transaction for approval...');
    const txSignature = await TransactionService.signAndSendTransaction(
      {type: 'transaction', transaction: tx},
      solanaWallet,
      {
        connection,
        statusCallback: onStatusUpdate,
      },
    );

    onStatusUpdate?.('Token purchased successfully!');
    return txSignature;
  } catch (err: any) {
    console.error('[buyTokenViaPumpfun] Error:', err);
    throw err;
  }
}

/**
 * sellTokenViaPumpfun
 */
export async function sellTokenViaPumpfun({
  sellerPublicKey,
  tokenAddress,
  tokenAmount,
  solanaWallet,
  onStatusUpdate,
}: SellTokenParams) {
  if (!solanaWallet) {
    throw new Error('No Solana wallet found. Please connect your wallet first.');
  }

  const provider = getProvider();
  const connection = provider.connection;
  const sdk = new PumpFunSDK(provider);

  try {
    onStatusUpdate?.('Preparing PumpFun token sale...');
    const mintPubkey = new PublicKey(tokenAddress);
    const sellerPubkey = new PublicKey(sellerPublicKey);

    onStatusUpdate?.('Checking token account...');
    const ata = await getAssociatedTokenAddress(mintPubkey, sellerPubkey);
    const tokenAccountInfo = await connection.getAccountInfo(ata);
    if (!tokenAccountInfo) {
      throw new Error(`You don't own any ${tokenAddress} tokens.`);
    }

    const tokenBalance = await connection.getTokenAccountBalance(ata);
    if (!tokenBalance.value) {
      throw new Error('Could not retrieve token balance');
    }

    const requestedAmount = BigInt(
      Math.floor(tokenAmount * 10 ** tokenBalance.value.decimals),
    );

    onStatusUpdate?.('Building transaction...');
    const tx = await buildPumpFunSellTransaction({
      sellerPubkey,
      tokenMint: mintPubkey,
      lamportsToSell: requestedAmount,
      sdk,
      connection,
    });

    onStatusUpdate?.('Sending transaction for approval...');
    const txSignature = await TransactionService.signAndSendTransaction(
      {type: 'transaction', transaction: tx},
      solanaWallet,
      {
        connection,
        statusCallback: onStatusUpdate,
      },
    );

    onStatusUpdate?.('Tokens sold successfully!');
    return txSignature;
  } catch (err: any) {
    console.error('[sellTokenViaPumpfun] Error:', err);
    throw err;
  }
}
