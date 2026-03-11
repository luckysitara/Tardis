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
import { getConnection } from '../utils/connection';

const actionsRouter = Router();

/**
 * GET /api/actions/buy
 * Returns the Action metadata (Solana Actions Standard)
 */
actionsRouter.get('/buy', (req: Request, res: Response) => {
  const { price, title, seller } = req.query;
  
  const payload = {
    icon: 'https://teal-additional-lemming-515.mypinata.cloud/ipfs/QmZ8Uq8VfT5X5B1T9y9p7m7y8z9w9v8u7t6r5q4p3o2n1m', // Placeholder icon
    title: `Buy ${title || 'Product'}`,
    description: `Purchase this item for ${price} SOL. All transactions are hardware-signed on Tardis.`,
    label: `Buy for ${price} SOL`,
    links: {
      actions: [
        {
          label: `Buy for ${price} SOL`,
          href: `/api/actions/buy?price=${price}&title=${title}&seller=${seller}`,
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
    const { price, seller } = req.query;

    if (!account) {
      return res.status(400).json({ error: 'Missing account (buyer wallet address)' });
    }

    if (!price || !seller) {
      return res.status(400).json({ error: 'Missing price or seller information' });
    }

    const connection = getConnection();
    const buyerPubkey = new PublicKey(account);
    const sellerPubkey = new PublicKey(seller as string);
    const lamports = Math.floor(parseFloat(price as string) * LAMPORTS_PER_SOL);

    // Create a simple transfer transaction
    const { blockhash } = await connection.getLatestBlockhash();
    
    // Create instructions
    const instructions = [
      SystemProgram.transfer({
        fromPubkey: buyerPubkey,
        toPubkey: sellerPubkey,
        lamports,
      })
    ];

    // Create a VersionedTransaction (modern Solana standard)
    const messageV0 = new TransactionMessage({
      payerKey: buyerPubkey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    
    // Serialize the transaction to base64
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');

    const payload = {
      transaction: serializedTransaction,
      message: `Purchasing ${req.query.title || 'Product'} for ${price} SOL`,
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.sendStatus(204);
});

export default actionsRouter;
