// server/src/routes/socialFeedRoutes.ts

import { Router } from 'express';
import { getPosts, createPost, toggleLike, toggleRepost } from '../controllers/socialFeedController';

const router = Router();

router.get('/posts', getPosts);
router.post('/posts', createPost);
router.post('/posts/like', toggleLike);
router.post('/posts/repost', toggleRepost);

export default router;
