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
  createTransferCheckedInstruction, 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction, 
  getMint,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getConnection } from '../utils/connection';
import knex from '../db/knex';
import { v4 as uuidv4 } from 'uuid';

const actionsRouter = Router();

// Token Configuration
const TOKENS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixeb6SRwcyV2MqyGvWJp',
  SKR: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3',
};

// Helper to get token symbol from mint
const getTokenSymbol = (mint: string) => {
  for (const [symbol, address] of Object.entries(TOKENS)) {
    if (address === mint) return symbol;
  }
  return 'Tokens';
};

/**
 * GET /api/actions/buy
 * Returns the Action metadata (Solana Actions Standard)
 */
actionsRouter.get('/buy', async (req: Request, res: Response) => {
  const { price, title, seller, image, mint } = req.query;
  const tokenSymbol = mint ? getTokenSymbol(mint as string) : 'SOL';
  
  // Fetch seller verification status
  let sellerVerified = false;
  if (seller) {
    const user = await knex('users').where({ id: seller as string }).first();
    sellerVerified = !!user?.is_hardware_verified;
  }

  const payload = {
    icon: (image as string) || 'https://teal-additional-lemming-515.mypinata.cloud/ipfs/QmZ8Uq8VfT5X5B1T9y9p7m7y8z9w9v8u7t6r5q4p3o2n1m', // Use provided image or fallback placeholder
    title: `Buy ${title || 'Product'}`,
    description: `Purchase this item for ${price} ${tokenSymbol}.${sellerVerified ? ' ✅ Hardware Verified Seller.' : ''} All transactions are hardware-signed on Tardis.`,
    label: `Buy for ${price} ${tokenSymbol}`,
    links: {
      actions: [
        {
          label: `Buy for ${price} ${tokenSymbol}`,
          href: `/api/actions/buy?price=${price}&title=${title}&seller=${seller}&image=${image || ''}${mint ? `&mint=${mint}` : ''}`,
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
    const { price, seller, mint } = req.query;

    if (!account) {
      return res.status(400).json({ error: 'Missing account (buyer wallet address)' });
    }

    if (!price || !seller) {
      return res.status(400).json({ error: 'Missing price or seller information' });
    }

    const connection = getConnection();
    const buyerPubkey = new PublicKey(account);
    const sellerPubkey = new PublicKey(seller as string);
    const { blockhash } = await connection.getLatestBlockhash();
    const instructions = [];

    if (!mint) {
      // SOL Transfer
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
      const mintPubkey = new PublicKey(mint as string);
      const mintInfo = await getMint(connection, mintPubkey);
      const amount = BigInt(Math.floor(parseFloat(price as string) * Math.pow(10, mintInfo.decimals)));

      const buyerATA = getAssociatedTokenAddressSync(mintPubkey, buyerPubkey);
      const sellerATA = getAssociatedTokenAddressSync(mintPubkey, sellerPubkey);

      // Check if seller ATA exists, if not add instruction to create it
      const sellerATAAccount = await connection.getAccountInfo(sellerATA);
      if (!sellerATAAccount) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            buyerPubkey, // payer
            sellerATA,
            sellerPubkey,
            mintPubkey
          )
        );
      }

      instructions.push(
        createTransferCheckedInstruction(
          buyerATA,
          mintPubkey,
          sellerATA,
          buyerPubkey,
          amount,
          mintInfo.decimals
        )
      );
    }

    // Create a VersionedTransaction (modern Solana standard)
    const messageV0 = new TransactionMessage({
      payerKey: buyerPubkey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    
    // Serialize the transaction to base64
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');

    const tokenSymbol = mint ? getTokenSymbol(mint as string) : 'SOL';
    const payload = {
      transaction: serializedTransaction,
      message: `Purchasing ${req.query.title || 'Product'} for ${price} ${tokenSymbol}`,
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

/**
 * POST /api/actions/record-purchase
 * Records a successful purchase in the database
 */
actionsRouter.post('/record-purchase', async (req: Request, res: Response) => {
  try {
    const { 
      buyer, 
      seller, 
      productTitle, 
      price, 
      tokenMint, 
      signature,
      postId
    } = req.body;

    if (!buyer || !seller || !productTitle || !price || !signature) {
      return res.status(400).json({ error: 'Missing required purchase data' });
    }

    const purchaseId = uuidv4();
    await knex('purchases').insert({
      id: purchaseId,
      buyer_wallet_address: buyer,
      seller_wallet_address: seller,
      product_title: productTitle,
      price: price.toString(),
      token_mint: tokenMint || null,
      signature,
      post_id: postId || null,
      status: 'completed',
      timestamp: new Date()
    });

    res.json({ success: true, purchaseId });
  } catch (error: any) {
    console.error('[Actions/RecordPurchase] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/actions/commerce/:userId
 * Returns both listings and purchases for a user
 */
actionsRouter.get('/commerce/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // 1. Fetch products being sold by this user (listings)
    // We parse their posts to find solana-action URLs
    const listings = await knex('posts')
      .where('author_wallet_address', userId)
      .andWhere('content', 'like', '%solana-action%')
      .select('id', 'content', 'media_urls', 'timestamp');

    const formattedListings = listings.map(post => {
      const content = post.content || '';
      // Extract title and price from the Blink URL in the content
      const blinkMatch = content.match(/solana-action:.*[?&]title=([^&]+)/);
      const priceMatch = content.match(/[?&]price=([^&]+)/);
      const title = blinkMatch ? decodeURIComponent(blinkMatch[1]) : 'Product';
      const price = priceMatch ? priceMatch[1] : '0';
      
      let mediaUrls = [];
      try {
        mediaUrls = JSON.parse(post.media_urls || '[]');
      } catch (e) {}

      return {
        id: post.id,
        title,
        price,
        timestamp: post.timestamp,
        image: mediaUrls[0] || null,
        type: 'listing'
      };
    });

    // 2. Fetch products bought by this user
    const purchases = await knex('purchases')
      .where('buyer_wallet_address', userId)
      .orderBy('timestamp', 'desc');

    const formattedPurchases = purchases.map(p => ({
      id: p.id,
      title: p.product_title,
      price: p.price,
      timestamp: p.timestamp,
      seller: p.seller_wallet_address,
      signature: p.signature,
      type: 'purchase'
    }));

    res.json({
      success: true,
      listings: formattedListings,
      purchases: formattedPurchases
    });
  } catch (error: any) {
    console.error('[Actions/Commerce] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default actionsRouter;
