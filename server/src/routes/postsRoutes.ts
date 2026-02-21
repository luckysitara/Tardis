// File: server/src/routes/postsRoutes.ts
import { Router, Request, Response } from 'express';
import knex from '../db/knex';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { verifySignature } from '../utils/solana'; // Actual import for Solana signature verification utility
import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs for posts

const postsRouter = Router();

/**
 * Helper to map database post rows to the ThreadPost structure expected by the frontend.
 */
function mapPost(post: any): any {
    return {
        id: post.id,
        parentId: post.parent_id || null,
        user: {
            id: post.author_wallet_address,
            username: post.author_skr_username,
            handle: post.author_handle || post.author_skr_username,
            avatar: post.profile_picture_url || 'https://api.dicebear.com/7.x/initials/png?seed=' + post.author_skr_username,
            publicEncryptionKey: post.public_encryption_key,
            verified: true
        },
        sections: [
            {
                id: uuidv4(),
                type: 'TEXT_ONLY',
                text: post.content
            }
        ],
        createdAt: post.timestamp || post.created_at,
        replies: [],
        reactionCount: post.like_count || 0,
        retweetCount: post.repost_count || 0,
        quoteCount: 0,
        reactions: {}
    };
}

// POST /api/posts - Create a new post
postsRouter.post('/', async (req: Request, res: Response) => {
    console.log('[POST /api/posts] Incoming request body:', JSON.stringify(req.body, null, 2));
    try {
        const {
            author_wallet_address,
            author_skr_username,
            content,
            media_urls,
            signature,
            timestamp,
            community_id, // Add community_id here
            parent_id, // Add parent_id for threaded replies
            is_public // Add is_public flag
        } = req.body;

        // Basic validation
        if (!author_wallet_address || !author_skr_username || !content || !signature || !timestamp) {
            return res.status(400).json({ success: false, error: 'Missing required post fields.' });
        }

        // DETERMINISTIC: Reconstruct the message that was signed
        const signedMessage = `{"content":"${content}","timestamp":"${timestamp}"}`;

        const isSignatureValid = verifySignature(signedMessage, signature, author_wallet_address);
        if (!isSignatureValid) {
            return res.status(401).json({ success: false, error: 'Invalid signature.' });
        }
        console.log(`[PostsRouter] Signature verification result: ${isSignatureValid}`);

        // Ensure user exists (JIT creation) to satisfy Foreign Key constraint
        await knex('users').insert({
            id: author_wallet_address,
            username: author_skr_username,
            handle: author_skr_username,
            created_at: new Date(),
            updated_at: new Date()
        }).onConflict('id').ignore();

        // Generate a UUID for the new post
        const postId = uuidv4();

        // Store post in database
        await knex('posts').insert({
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
            updated_at: new Date(),
            community_id, // Include community_id here
            parent_id, // Include parent_id here
            is_public: !!is_public // Include is_public flag
        });

        // Fetch the inserted post with user details
        const savedPost = await knex('posts')
            .join('users', 'posts.author_wallet_address', 'users.id')
            .select('posts.*', 'users.profile_picture_url', 'users.handle as author_handle', 'users.public_encryption_key')
            .where('posts.id', postId)
            .first();

        return res.status(201).json({ success: true, post: mapPost(savedPost) });

    } catch (error: any) {
        console.error('[POST /api/posts] Error creating post:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/posts - Retrieve a list of posts
postsRouter.get('/', async (req: Request, res: Response) => {
    console.log('[GET /api/posts] Fetching posts with query:', req.query);
    try {
        const { limit = 20, offset = 0, communityId, userId } = req.query; // Added userId for bookmark status

        let query = knex('posts')
            .join('users', 'posts.author_wallet_address', 'users.id')
            .select('posts.*', 'users.profile_picture_url', 'users.handle as author_handle', 'users.public_encryption_key');

        if (communityId) {
            query = query.where('posts.community_id', communityId as string);
        } else {
            // Show global posts (null community_id) OR community posts marked as is_public (Announcement)
            query = query.where(function() {
                this.whereNull('posts.community_id').orWhere('posts.is_public', true);
            });
        }

        const posts = await query
            .orderBy('timestamp', 'desc')
            .limit(Number(limit))
            .offset(Number(offset));

        // Augment with bookmark status if userId is provided
        const mappedPosts = await Promise.all(posts.map(async (post) => {
            const mapped = mapPost(post);
            if (userId) {
                const bookmark = await knex('bookmarks')
                    .where({ user_id: userId as string, post_id: post.id })
                    .first();
                mapped.isBookmarked = !!bookmark;
            }
            return mapped;
        }));

        return res.json({ success: true, posts: mappedPosts });
    } catch (error: any) {
        console.error('[GET /api/posts] Error retrieving posts:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/posts/:id/bookmark - Toggle bookmark for a post
postsRouter.post('/:id/bookmark', async (req: Request, res: Response) => {
    try {
        const { id: post_id } = req.params;
        const { user_id } = req.body;

        if (!post_id || !user_id) {
            return res.status(400).json({ success: false, error: 'Missing post ID or user ID.' });
        }

        const existing = await knex('bookmarks').where({ user_id, post_id }).first();
        if (existing) {
            await knex('bookmarks').where({ user_id, post_id }).del();
            return res.json({ success: true, bookmarked: false });
        } else {
            await knex('bookmarks').insert({
                id: uuidv4(),
                user_id,
                post_id,
                created_at: new Date()
            });
            return res.json({ success: true, bookmarked: true });
        }
    } catch (error: any) {
        console.error('[POST /api/posts/:id/bookmark] Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/posts/bookmarks/:userId - Get all bookmarked posts for a user
postsRouter.get('/bookmarks/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const posts = await knex('bookmarks')
            .join('posts', 'bookmarks.post_id', 'posts.id')
            .join('users', 'posts.author_wallet_address', 'users.id')
            .where('bookmarks.user_id', userId)
            .select('posts.*', 'users.profile_picture_url', 'users.handle as author_handle', 'users.public_encryption_key')
            .orderBy('bookmarks.created_at', 'desc')
            .limit(Number(limit))
            .offset(Number(offset));

        const mappedPosts = posts.map(post => ({
            ...mapPost(post),
            isBookmarked: true
        }));

        return res.json({ success: true, posts: mappedPosts });
    } catch (error: any) {
        console.error('[GET /api/posts/bookmarks] Error:', error);
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

        // DETERMINISTIC: Reconstruct the message that was signed
        const signedMessage = `{"post_id":"${post_id}","user_wallet_address":"${user_wallet_address}","timestamp":"${timestamp}"}`;
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

        // DETERMINISTIC: Reconstruct the message that was signed
        const signedMessage = `{"original_post_id":"${original_post_id}","reposter_wallet_address":"${reposter_wallet_address}","timestamp":"${timestamp}"}`;
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
