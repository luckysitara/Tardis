import { Router } from 'express';
import { followUser, unfollowUser, getFollowStats, checkIfFollowing, getFollowing } from '../controllers/followController';

const followRouter = Router();

followRouter.post('/follow', followUser);
followRouter.post('/unfollow', unfollowUser);
followRouter.get('/stats/:userId', getFollowStats);
followRouter.get('/is-following', checkIfFollowing);
followRouter.get('/following/:userId', getFollowing);

export { followRouter };
