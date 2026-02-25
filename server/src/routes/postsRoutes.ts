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
    const isRepost = post.feed_type === 'repost';
    
    return {
        id: post.id,
        parentId: post.parent_id || null,
        user: {
            id: post.author_wallet_address,
            username: post.username || post.author_skr_username, // Prefer live username from users table
            handle: post.display_name || post.username || post.author_skr_username, // Prefer live display_name
            avatar: post.profile_picture_url || 'https://api.dicebear.com/7.x/initials/png?seed=' + (post.username || post.author_skr_username),
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
        media_urls: typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : (post.media_urls || []),
        createdAt: post.timestamp || post.created_at,
        replies: [],
        reactionCount: post.like_count || 0,
        retweetCount: post.repost_count || 0,
        quoteCount: 0,
        reactions: {},
        communityId: post.community_id,
        isPublic: !!post.is_public,
        replyCount: post.reply_count || 0,
        // New fields for perfect feed behavior
        feedType: post.feed_type || 'post',
        originalPostId: post.original_post_id || post.id,
        repostedBy: isRepost ? {
            id: post.reposter_id,
            username: post.reposter_username,
            displayName: post.reposter_display_name
        } : null,
        replyToUsername: post.reply_to_username || null
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
            display_name: author_skr_username,
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
            .select(
                'posts.*', 
                'users.profile_picture_url', 
                'users.display_name', 
                'users.username', 
                'users.public_encryption_key',
                knex.raw('(SELECT COUNT(*) FROM posts as p2 WHERE p2.parent_id = posts.id) as reply_count')
            )
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
        const { limit = 20, offset = 0, communityId, userId, followingOnly } = req.query;

        /**
         * We use a UNION to combine:
         * 1. Regular posts
         * 2. Reposts (where the content comes from the original post)
         */
        
        // Base select for a post
        const postSelect = `
            posts.id as id,
            posts.id as original_post_id,
            posts.author_wallet_address,
            posts.author_skr_username,
            posts.content,
            posts.media_urls,
            posts.signature,
            posts.timestamp,
            posts.like_count,
            posts.repost_count,
            posts.community_id,
            posts.parent_id,
            posts.is_public,
            posts.created_at,
            posts.updated_at,
            users.profile_picture_url, 
            users.display_name, 
            users.username, 
            users.public_encryption_key,
            parent_users.username as reply_to_username,
            (SELECT COUNT(*) FROM posts as p2 WHERE p2.parent_id = posts.id) as reply_count,
            'post' as feed_type,
            NULL as reposter_id,
            NULL as reposter_username,
            NULL as reposter_display_name,
            posts.timestamp as sort_timestamp
        `;

        const repostSelect = `
            reposts.id as id,
            posts.id as original_post_id,
            posts.author_wallet_address,
            posts.author_skr_username,
            posts.content,
            posts.media_urls,
            posts.signature,
            posts.timestamp,
            posts.like_count,
            posts.repost_count,
            posts.community_id,
            posts.parent_id,
            posts.is_public,
            posts.created_at,
            posts.updated_at,
            users.profile_picture_url, 
            users.display_name, 
            users.username, 
            users.public_encryption_key,
            parent_users.username as reply_to_username,
            (SELECT COUNT(*) FROM posts as p2 WHERE p2.parent_id = posts.id) as reply_count,
            'repost' as feed_type,
            reposts.reposter_wallet_address as reposter_id,
            repost_users.username as reposter_username,
            repost_users.display_name as reposter_display_name,
            reposts.timestamp as sort_timestamp
        `;

        // 1. Original posts query
        let postsQuery = knex('posts')
            .join('users', 'posts.author_wallet_address', 'users.id')
            .leftJoin('posts as parent_posts', 'posts.parent_id', 'parent_posts.id')
            .leftJoin('users as parent_users', 'parent_posts.author_wallet_address', 'parent_users.id')
            .select(knex.raw(postSelect));

        // 2. Reposts query
        let repostsQuery = knex('reposts')
            .join('posts', 'reposts.original_post_id', 'posts.id')
            .join('users', 'posts.author_wallet_address', 'users.id')
            .join('users as repost_users', 'reposts.reposter_wallet_address', 'repost_users.id')
            .leftJoin('posts as parent_posts', 'posts.parent_id', 'parent_posts.id')
            .leftJoin('users as parent_users', 'parent_posts.author_wallet_address', 'parent_users.id')
            .select(knex.raw(repostSelect));

        // Apply filters
        if (followingOnly === 'true' && userId) {
            const followedUserIds = await knex('follows')
                .where('follower_id', userId as string)
                .pluck('following_id');
            followedUserIds.push(userId as string);
            
            postsQuery = postsQuery.whereIn('posts.author_wallet_address', followedUserIds);
            repostsQuery = repostsQuery.whereIn('reposts.reposter_wallet_address', followedUserIds);
        }

        // IMPORTANT: By default, hide replies (posts with a parent_id) from the main feed
        if (includeReplies !== 'true') {
            postsQuery = postsQuery.whereNull('posts.parent_id');
        }

        if (communityId) {
            postsQuery = postsQuery.where('posts.community_id', communityId as string);
            repostsQuery = repostsQuery.where('posts.community_id', communityId as string);
        } else {
            postsQuery = postsQuery.where(function() {
                this.whereNull('posts.community_id').orWhere('posts.is_public', true);
            });
            repostsQuery = repostsQuery.where(function() {
                this.whereNull('posts.community_id').orWhere('posts.is_public', true);
            });
        }

        // Combine using UNION
        const combinedQuery = knex.union([postsQuery, repostsQuery], true)
            .as('unified_feed');

        const feedItems = await knex.select('*')
            .from(combinedQuery)
            .orderBy('sort_timestamp', 'desc')
            .limit(Number(limit))
            .offset(Number(offset));

        // Augment with bookmark status if userId is provided
        const mappedPosts = await Promise.all(feedItems.map(async (post) => {
            const mapped = mapPost(post);
            if (userId) {
                const bookmark = await knex('bookmarks')
                    .where({ user_id: userId as string, post_id: post.id })
                    .first();
                mapped.isBookmarked = !!bookmark;
                
                const liked = await knex('likes')
                    .where({ user_wallet_address: userId as string, post_id: post.id })
                    .first();
                mapped.isLiked = !!liked;
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
            .leftJoin('posts as parent_posts', 'posts.parent_id', 'parent_posts.id')
            .leftJoin('users as parent_users', 'parent_posts.author_wallet_address', 'parent_users.id')
            .where('bookmarks.user_id', userId)
            .select(
                'posts.*', 
                'users.profile_picture_url', 
                'users.display_name', 
                'users.username', 
                'users.public_encryption_key',
                'parent_users.username as reply_to_username',
                knex.raw('(SELECT COUNT(*) FROM posts as p2 WHERE p2.parent_id = posts.id) as reply_count')
            )
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

// GET /api/posts/:id - Get a single post
postsRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        const post = await knex('posts')
            .join('users', 'posts.author_wallet_address', 'users.id')
            .leftJoin('posts as parent_posts', 'posts.parent_id', 'parent_posts.id')
            .leftJoin('users as parent_users', 'parent_posts.author_wallet_address', 'parent_users.id')
            .select(
                'posts.*', 
                'users.profile_picture_url', 
                'users.display_name', 
                'users.username', 
                'users.public_encryption_key',
                'parent_users.username as reply_to_username',
                knex.raw('(SELECT COUNT(*) FROM posts as p2 WHERE p2.parent_id = posts.id) as reply_count')
            )
            .where('posts.id', id)
            .first();

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found.' });
        }

        const mapped = mapPost(post);
        if (userId) {
            const bookmark = await knex('bookmarks')
                .where({ user_id: userId as string, post_id: post.id })
                .first();
            mapped.isBookmarked = !!bookmark;
            
            const liked = await knex('likes')
                .where({ user_wallet_address: userId as string, post_id: post.id })
                .first();
            mapped.isLiked = !!liked;
        }

        return res.json({ success: true, post: mapped });
    } catch (error: any) {
        console.error('[GET /api/posts/:id] Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/posts/:id/thread - Get a post and its direct replies
postsRouter.get('/:id/thread', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        // Fetch parent chain (optional, for now just the direct parent)
        const currentPost = await knex('posts')
            .join('users', 'posts.author_wallet_address', 'users.id')
            .leftJoin('posts as parent_posts', 'posts.parent_id', 'parent_posts.id')
            .leftJoin('users as parent_users', 'parent_posts.author_wallet_address', 'parent_users.id')
            .select(
                'posts.*', 
                'users.profile_picture_url', 
                'users.display_name', 
                'users.username', 
                'users.public_encryption_key',
                'parent_users.username as reply_to_username',
                knex.raw('(SELECT COUNT(*) FROM posts as p2 WHERE p2.parent_id = posts.id) as reply_count')
            )
            .where('posts.id', id)
            .first();

        if (!currentPost) {
            return res.status(404).json({ success: false, error: 'Post not found.' });
        }

        // Fetch replies
        const replies = await knex('posts')
            .join('users', 'posts.author_wallet_address', 'users.id')
            .leftJoin('posts as parent_posts', 'posts.parent_id', 'parent_posts.id')
            .leftJoin('users as parent_users', 'parent_posts.author_wallet_address', 'parent_users.id')
            .select(
                'posts.*', 
                'users.profile_picture_url', 
                'users.display_name', 
                'users.username', 
                'users.public_encryption_key',
                'parent_users.username as reply_to_username',
                knex.raw('(SELECT COUNT(*) FROM posts as p2 WHERE p2.parent_id = posts.id) as reply_count')
            )
            .where('posts.parent_id', id)
            .orderBy('posts.timestamp', 'asc');

        const mappedCurrent = mapPost(currentPost);
        const mappedReplies = await Promise.all(replies.map(async (reply) => {
            const mapped = mapPost(reply);
            if (userId) {
                const bookmark = await knex('bookmarks').where({ user_id: userId as string, post_id: reply.id }).first();
                mapped.isBookmarked = !!bookmark;
                const liked = await knex('likes').where({ user_wallet_address: userId as string, post_id: reply.id }).first();
                mapped.isLiked = !!liked;
            }
            return mapped;
        }));

        if (userId) {
            const bookmark = await knex('bookmarks').where({ user_id: userId as string, post_id: currentPost.id }).first();
            mappedCurrent.isBookmarked = !!bookmark;
            const liked = await knex('likes').where({ user_wallet_address: userId as string, post_id: currentPost.id }).first();
            mappedCurrent.isLiked = !!liked;
        }

        return res.json({ 
            success: true, 
            post: mappedCurrent,
            replies: mappedReplies
        });
    } catch (error: any) {
        console.error('[GET /api/posts/:id/thread] Error:', error);
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
