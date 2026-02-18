// File: server/src/routes/postsRoutes.ts
import { Router, Request, Response } from 'express';
import knex from '../db/knex';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { verifySignature } from '../utils/solana'; // Actual import for Solana signature verification utility
import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs for posts

const postsRouter = Router();

// POST /api/posts - Create a new post
postsRouter.post('/', async (req: Request, res: Response) => {
    try {
        const {
            author_wallet_address,
            author_skr_username,
            content,
            media_urls,
            signature,
            timestamp
        } = req.body;

        // Basic validation
        if (!author_wallet_address || !author_skr_username || !content || !signature || !timestamp) {
            return res.status(400).json({ success: false, error: 'Missing required post fields.' });
        }

        // Reconstruct the message that was signed
        // The message structure must match what the client signed
        const signedMessage = JSON.stringify({ content, timestamp });

        const isSignatureValid = verifySignature(signedMessage, signature, author_wallet_address);
        if (!isSignatureValid) {
            return res.status(401).json({ success: false, error: 'Invalid signature.' });
        }
        console.log(`[PostsRouter] Signature verification result: ${isSignatureValid}`);


        // Generate a UUID for the new post
        const postId = uuidv4();

        // Store post in database
        const [newPost] = await knex('posts').insert({
            id: postId,
            author_wallet_address,
            author_skr_username,
            content,
            media_urls: JSON.stringify(media_urls || []), // Store as JSON string
            signature,
            timestamp: new Date(timestamp), // Ensure timestamp is a Date object
            like_count: 0,
            repost_count: 0,
            created_at: new Date(),
            updated_at: new Date()
        }).returning('*');

        return res.status(201).json({ success: true, post: newPost });

    } catch (error: any) {
        console.error('[POST /api/posts] Error creating post:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/posts - Retrieve a list of posts
postsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const posts = await knex('posts')
            .orderBy('timestamp', 'desc')
            .limit(Number(limit))
            .offset(Number(offset));

        return res.json({ success: true, posts });
    } catch (error: any) {
        console.error('[GET /api/posts] Error retrieving posts:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/posts/:id - Delete a post
postsRouter.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { author_wallet_address, signature, timestamp } = req.body; // Expect wallet address, signature and timestamp for verification

        if (!id || !author_wallet_address || !signature || !timestamp) {
            return res.status(400).json({ success: false, error: 'Missing post ID, author wallet address, signature, or timestamp.' });
        }
        
        // Reconstruct the message that was signed for deletion
        const signedMessage = JSON.stringify({ id, author_wallet_address, timestamp });

        const isSignatureValid = verifySignature(signedMessage, signature, author_wallet_address);
        if (!isSignatureValid) {
            return res.status(401).json({ success: false, error: 'Invalid signature for deletion.' });
        }

        // Verify the author
        const post = await knex('posts').where({ id }).first();
        if (!post || post.author_wallet_address !== author_wallet_address) {
            return res.status(403).json({ success: false, error: 'Unauthorized to delete this post.' });
        }


        const deletedCount = await knex('posts')
            .where({ id, author_wallet_address })
            .del();

        if (deletedCount === 0) {
            return res.status(404).json({ success: false, error: 'Post not found.' });
        }

        return res.json({ success: true, message: 'Post deleted successfully.' });

    } catch (error: any) {
        console.error('[DELETE /api/posts/:id] Error deleting post:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/posts/:id/like - Like a post
postsRouter.post('/:id/like', async (req: Request, res: Response) => {
    try {
        const { id: post_id } = req.params;
        const { user_wallet_address, signature, timestamp } = req.body;

        if (!post_id || !user_wallet_address || !signature || !timestamp) {
            return res.status(400).json({ success: false, error: 'Missing required fields for like.' });
        }

        // REAL PRODUCTION: Verify off-chain engagement signature
        const signedMessage = JSON.stringify({ post_id, user_wallet_address, timestamp });
        const isSignatureValid = verifySignature(signedMessage, signature, user_wallet_address);
        
        if (!isSignatureValid) {
            return res.status(401).json({ success: false, error: 'Invalid engagement signature.' });
        }

        // Check if already liked
        const existingLike = await knex('likes').where({ post_id, user_wallet_address }).first();
        if (existingLike) {
            // Unlike if already liked (toggle behavior)
            await knex('likes').where({ post_id, user_wallet_address }).del();
            await knex('posts').where({ id: post_id }).decrement('like_count', 1);
            return res.json({ success: true, liked: false });
        }

        // Insert like
        await knex('likes').insert({
            id: uuidv4(),
            post_id,
            user_wallet_address,
            timestamp: new Date(timestamp)
        });

        // Increment post like count
        await knex('posts').where({ id: post_id }).increment('like_count', 1);

        return res.json({ success: true, liked: true });
    } catch (error: any) {
        console.error('[POST /api/posts/:id/like] Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/posts/:id/repost - Repost a post
postsRouter.post('/:id/repost', async (req: Request, res: Response) => {
    try {
        const { id: original_post_id } = req.params;
        const { reposter_wallet_address, signature, timestamp } = req.body;

        if (!original_post_id || !reposter_wallet_address || !signature || !timestamp) {
            return res.status(400).json({ success: false, error: 'Missing required fields for repost.' });
        }

        // REAL PRODUCTION: Verify off-chain engagement signature
        const signedMessage = JSON.stringify({ original_post_id, reposter_wallet_address, timestamp });
        const isSignatureValid = verifySignature(signedMessage, signature, reposter_wallet_address);
        
        if (!isSignatureValid) {
            return res.status(401).json({ success: false, error: 'Invalid engagement signature.' });
        }

        // Check if already reposted
        const existingRepost = await knex('reposts').where({ original_post_id, reposter_wallet_address }).first();
        if (existingRepost) {
            return res.status(400).json({ success: false, error: 'Already reposted.' });
        }

        // Insert repost
        await knex('reposts').insert({
            id: uuidv4(),
            original_post_id,
            reposter_wallet_address,
            timestamp: new Date(timestamp),
            created_at: new Date()
        });

        // Increment post repost count
        await knex('posts').where({ id: original_post_id }).increment('repost_count', 1);

        return res.json({ success: true });
    } catch (error: any) {
        console.error('[POST /api/posts/:id/repost] Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default postsRouter;
