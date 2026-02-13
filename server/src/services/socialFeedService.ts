// server/src/services/socialFeedService.ts

import knex from '../db/knex';
import { Post, Like, Repost, CreatePostRequest } from '../types/socialFeed.d';
import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs if not using defaultTo(knex.raw('gen_random_uuid()'))

// Mock signature verification for now
// In a real scenario, this would involve reconstructing the message and using a Solana library to verify
function verifySolanaSignature(message: string, signature: string, publicKey: string): boolean {
    console.warn(`[SocialFeedService] Mock signature verification: message='${message}', signature='${signature}', publicKey='${publicKey}'`);
    // For now, we'll just check if a signature string is provided.
    // Replace with actual Solana signature verification in production.
    return !!signature;
}

export class SocialFeedService {
    async getPosts(currentUserId?: string): Promise<Post[]> {
        const posts = await knex('posts')
            .leftJoin('users', 'posts.user_id', 'users.id')
            .select(
                'posts.id',
                'posts.user_id as userId',
                'posts.content',
                'posts.media_urls as mediaUrls', // Assuming media_urls is stored as a JSONB array
                'posts.signature',
                'posts.likes_count as likesCount', // Use likes_count from the posts table
                'posts.reposts_count as repostsCount', // Use reposts_count from the posts table
                'posts.created_at as createdAt',
                'posts.updated_at as updatedAt',
                'users.username as authorName',
                'users.profile_picture_url as authorAvatar'
            )
            .orderBy('posts.created_at', 'desc');

        // Augment posts with author info and current user's like/repost status
        return Promise.all(posts.map(async (post: any) => {
            const isLikedByMe = currentUserId ? !!(await knex('likes').where({ post_id: post.id, user_id: currentUserId }).first()) : false;
            const isRepostedByMe = currentUserId ? !!(await knex('reposts').where({ post_id: post.id, user_id: currentUserId }).first()) : false;
            
            return {
                ...post,
                author: {
                    id: post.userId,
                    name: post.authorName,
                    avatar: post.authorAvatar,
                },
                isLikedByMe,
                isRepostedByMe,
                // Ensure mediaUrls is an array if stored as JSONB
                mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls : [], 
            } as Post;
        }));
    }

    async createPost(postData: CreatePostRequest): Promise<Post> {
        const { userId, content, mediaUrls, signature } = postData;

        // In a real app, verify user and signature here
        // if (!verifySolanaSignature(content, signature, userId)) {
        //     throw new Error('Invalid signature for post content');
        // }

        const [newPostId] = await knex('posts').insert({
            user_id: userId,
            content: content,
            media_urls: JSON.stringify(mediaUrls || []), // Store as JSONB
            signature: signature,
            likes_count: 0,
            reposts_count: 0,
        }).returning('id');

        // Fetch the created post with author details for consistency
        const [createdPost] = await knex('posts')
            .where('posts.id', newPostId.id || newPostId) // Adjust based on how returning('id') works
            .leftJoin('users', 'posts.user_id', 'users.id')
            .select(
                'posts.id',
                'posts.user_id as userId',
                'posts.content',
                'posts.media_urls as mediaUrls',
                'posts.signature',
                'posts.likes_count as likesCount',
                'posts.reposts_count as repostsCount',
                'posts.created_at as createdAt',
                'posts.updated_at as updatedAt',
                'users.username as authorName',
                'users.profile_picture_url as authorAvatar'
            );

        if (!createdPost) {
            throw new Error('Failed to retrieve created post.');
        }

        return {
            ...createdPost,
            author: {
                id: createdPost.userId,
                name: createdPost.authorName,
                avatar: createdPost.authorAvatar,
            },
            isLikedByMe: false, // Newly created post by definition hasn't been liked by current user
            isRepostedByMe: false,
            mediaUrls: Array.isArray(createdPost.mediaUrls) ? createdPost.mediaUrls : [],
        } as Post;
    }

    async toggleLike(postId: string, userId: string, signature: string): Promise<{ likesCount: number; isLikedByMe: boolean }> {
        // In a real app, verify user and signature here
        // if (!verifySolanaSignature(`like:${postId}:${userId}`, signature, userId)) {
        //     throw new Error('Invalid signature for like action');
        // }

        const existingLike = await knex('likes').where({ post_id: postId, user_id: userId }).first();
        let likesCountChange = 0;
        let isLikedByMe = false;

        if (existingLike) {
            // Unlike post
            await knex('likes').where({ post_id: postId, user_id: userId }).del();
            await knex('posts').where({ id: postId }).decrement('likes_count', 1);
            likesCountChange = -1;
            isLikedByMe = false;
        } else {
            // Like post
            await knex('likes').insert({ post_id: postId, user_id: userId, signature });
            await knex('posts').where({ id: postId }).increment('likes_count', 1);
            likesCountChange = 1;
            isLikedByMe = true;
        }

        const post = await knex('posts').where({ id: postId }).first();
        if (!post) throw new Error('Post not found');

        return { likesCount: post.likes_count, isLikedByMe };
    }

    async toggleRepost(postId: string, userId: string, signature: string, originalPostId?: string): Promise<{ repostsCount: number; isRepostedByMe: boolean }> {
        // In a real app, verify user and signature here
        // if (!verifySolanaSignature(`repost:${postId}:${userId}`, signature, userId)) {
        //     throw new Error('Invalid signature for repost action');
        // }

        const existingRepost = await knex('reposts').where({ post_id: postId, user_id: userId }).first();
        let repostsCountChange = 0;
        let isRepostedByMe = false;

        if (existingRepost) {
            // Unrepost post
            await knex('reposts').where({ post_id: postId, user_id: userId }).del();
            await knex('posts').where({ id: postId }).decrement('reposts_count', 1);
            repostsCountChange = -1;
            isRepostedByMe = false;
        } else {
            // Repost post
            await knex('reposts').insert({ post_id: postId, user_id: userId, original_post_id: originalPostId, signature });
            await knex('posts').where({ id: postId }).increment('reposts_count', 1);
            repostsCountChange = 1;
            isRepostedByMe = true;
        }

        const post = await knex('posts').where({ id: postId }).first();
        if (!post) throw new Error('Post not found');

        return { repostsCount: post.reposts_count, isRepostedByMe };
    }
}
