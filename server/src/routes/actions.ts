import { Router, Request, Response } from 'express';
import { 
  Transaction, 
  SystemProgram, 
  PublicKey, 
  Connection, 
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  createTransferInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError
} from '@solana/spl-token';
import { getConnection } from '../utils/connection';

const actionsRouter = Router();

// Common token mints for convenience
const MINTS: Record<string, string> = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixeb6V3Vp7nxHCVk2rjR',
};

/**
 * GET /api/actions/buy
 * Returns the Action metadata (Solana Actions Standard)
 */
actionsRouter.get('/buy', async (req: Request, res: Response) => {
  const { price, title, seller, image, token } = req.query;
  
  const tokenSymbol = (token as string) || 'SOL';
  const displayToken = MINTS[tokenSymbol.toUpperCase()] ? tokenSymbol.toUpperCase() : 'Token';

  const payload = {
    icon: (image as string) || 'https://teal-additional-lemming-515.mypinata.cloud/ipfs/QmZ8Uq8VfT5X5B1T9y9p7m7y8z9w9v8u7t6r5q4p3o2n1m',
    title: `Buy ${title || 'Product'}`,
    description: `Purchase this item for ${price} ${displayToken}. All transactions are hardware-signed on Tardis.`,
    label: `Buy for ${price} ${displayToken}`,
    links: {
      actions: [
        {
          label: `Buy for ${price} ${displayToken}`,
          href: `/api/actions/buy?price=${price}&title=${encodeURIComponent(title as string || 'Product')}&seller=${seller}&image=${encodeURIComponent(image as string || '')}&token=${tokenSymbol}`,
        }
      ]
    }
  };

  res.json(payload);
});

/**
 * POST /api/actions/buy
 * Returns the transaction for the user to sign
 */
actionsRouter.post('/buy', async (req: Request, res: Response) => {
  try {
    const { account } = req.body; // The user's wallet address
    const { price, seller, token } = req.query;

    if (!account) {
      return res.status(400).json({ error: 'Missing account (buyer wallet address)' });
    }

    if (!price || !seller) {
      return res.status(400).json({ error: 'Missing price or seller information' });
    }

    const connection = getConnection();
    const buyerPubkey = new PublicKey(account);
    const sellerPubkey = new PublicKey(seller as string);
    const tokenSymbol = (token as string) || 'SOL';
    
    let instructions = [];
    
    if (tokenSymbol.toUpperCase() === 'SOL') {
      const lamports = Math.floor(parseFloat(price as string) * LAMPORTS_PER_SOL);
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: buyerPubkey,
          toPubkey: sellerPubkey,
          lamports,
        })
      );
    } else {
      // SPL Token Transfer
      const mintAddress = MINTS[tokenSymbol.toUpperCase()] || tokenSymbol;
      let mintPubkey: PublicKey;
      try {
        mintPubkey = new PublicKey(mintAddress);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid token mint address' });
      }
      
      // Get token decimals
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
      if (!mintInfo.value) {
        return res.status(400).json({ error: 'Token mint not found on network' });
      }
      const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 9;
      const amount = Math.floor(parseFloat(price as string) * Math.pow(10, decimals));

      const buyerATA = await getAssociatedTokenAddress(mintPubkey, buyerPubkey);
      const sellerATA = await getAssociatedTokenAddress(mintPubkey, sellerPubkey);

      // Check if seller ATA exists, if not, create it
      try {
        await getAccount(connection, sellerATA);
      } catch (error: any) {
        if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              buyerPubkey, // payer
              sellerATA,
              sellerPubkey,
              mintPubkey
            )
          );
        } else {
          throw error;
        }
      }

      instructions.push(
        createTransferInstruction(
          buyerATA,
          sellerATA,
          buyerPubkey,
          amount
        )
      );
    }

    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    // Create a VersionedTransaction (modern Solana standard)
    const messageV0 = new TransactionMessage({
      payerKey: buyerPubkey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    
    // SERVER-SIDE SIMULATION
    // This catches issues like "insufficient funds" before sending to user
    const simulation = await connection.simulateTransaction(transaction);
    if (simulation.value.err) {
      console.error('[Actions/Buy] Simulation failed:', simulation.value.err);
      console.error('[Actions/Buy] Simulation logs:', simulation.value.logs);
      
      let errorMessage = 'Transaction simulation failed.';
      if (JSON.stringify(simulation.value.err).includes('InsufficientFundsForRent')) {
        errorMessage = 'Insufficient SOL for transaction fees or rent.';
      } else if (JSON.stringify(simulation.value.err).includes('0x1')) {
        errorMessage = 'Insufficient token balance for this purchase.';
      }
      
      return res.status(400).json({ 
        error: errorMessage,
        logs: simulation.value.logs 
      });
    }

    // Serialize the transaction to base64
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');

    const payload = {
      transaction: serializedTransaction,
      message: `Purchasing ${req.query.title || 'Product'} for ${price} ${tokenSymbol.toUpperCase()}`,
    };

    res.json(payload);
  } catch (error: any) {
    console.error('[Actions/Buy] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * OPTIONS /api/actions/buy
 * CORS Preflight
 */
actionsRouter.options('/buy', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding, x-blockchain-ids, x-action-version');
  res.sendStatus(204);
});

export default actionsRouter;
