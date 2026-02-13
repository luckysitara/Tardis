// server/src/controllers/socialFeedController.ts

import { Request, Response } from 'express';
import { SocialFeedService } from '../services/socialFeedService';
import { CreatePostRequest, LikeRepostRequest } from '../types/socialFeed.d';

const socialFeedService = new SocialFeedService();

export const getPosts = async (req: Request, res: Response) => {
    try {
        // In a real app, currentUserId would come from an authentication middleware
        const currentUserId = req.query.userId as string | undefined; 
        const posts = await socialFeedService.getPosts(currentUserId);
        res.status(200).json(posts);
    } catch (error: any) {
        console.error('[socialFeedController] Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
    }
};

export const createPost = async (req: Request, res: Response) => {
    try {
        const { userId, content, mediaUrls, signature } = req.body as CreatePostRequest;

        if (!userId || !content || !signature) {
            return res.status(400).json({ message: 'Missing required fields: userId, content, signature' });
        }

        const newPost = await socialFeedService.createPost({ userId, content, mediaUrls, signature });
        res.status(201).json(newPost);
    } catch (error: any) {
        console.error('[socialFeedController] Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post', error: error.message });
    }
};

export const toggleLike = async (req: Request, res: Response) => {
    try {
        const { postId, userId, signature } = req.body as LikeRepostRequest;

        if (!postId || !userId || !signature) {
            return res.status(400).json({ message: 'Missing required fields: postId, userId, signature' });
        }

        const result = await socialFeedService.toggleLike(postId, userId, signature);
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[socialFeedController] Error toggling like:', error);
        res.status(500).json({ message: 'Failed to toggle like', error: error.message });
    }
};

export const toggleRepost = async (req: Request, res: Response) => {
    try {
        const { postId, userId, signature, originalPostId } = req.body as LikeRepostRequest & { originalPostId?: string };

        if (!postId || !userId || !signature) {
            return res.status(400).json({ message: 'Missing required fields: postId, userId, signature' });
        }

        const result = await socialFeedService.toggleRepost(postId, userId, signature, originalPostId);
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[socialFeedController] Error toggling repost:', error);
        res.status(500).json({ message: 'Failed to toggle repost', error: error.message });
    }
};
