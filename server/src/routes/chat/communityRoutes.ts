import { Router } from 'express';
import { getCommunities, createCommunity, joinCommunity } from '../../controllers/communityController';

const communityRouter = Router();

// Get all public communities
communityRouter.get('/', getCommunities);

// Create a new group/community
communityRouter.post('/', createCommunity);

// Join a community (Gated)
communityRouter.post('/join', joinCommunity);

export { communityRouter };
