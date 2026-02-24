import { Request, Response } from 'express';
import knex from '../db/knex';
import { v4 as uuidv4 } from 'uuid';

export async function followUser(req: Request, res: Response) {
  try {
    const { followerId, followingId } = req.body;

    if (!followerId || !followingId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (followerId === followingId) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }

    const id = uuidv4();
    await knex('follows').insert({
      id,
      follower_id: followerId,
      following_id: followingId
    }).onConflict(['follower_id', 'following_id']).ignore();

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Follow User Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function unfollowUser(req: Request, res: Response) {
  try {
    const { followerId, followingId } = req.body;

    if (!followerId || !followingId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    await knex('follows')
      .where({ follower_id: followerId, following_id: followingId })
      .delete();

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Unfollow User Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFollowStats(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const followersCount = await knex('follows')
      .where({ following_id: userId })
      .count('id as count')
      .first();

    const followingCount = await knex('follows')
      .where({ follower_id: userId })
      .count('id as count')
      .first();

    return res.json({
      success: true,
      followersCount: Number(followersCount?.count || 0),
      followingCount: Number(followingCount?.count || 0)
    });
  } catch (error: any) {
    console.error('[Get Follow Stats Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function checkIfFollowing(req: Request, res: Response) {
  try {
    const { followerId, followingId } = req.query;

    if (!followerId || !followingId) {
      return res.status(400).json({ success: false, error: 'Missing required query params' });
    }

    const follow = await knex('follows')
      .where({ follower_id: followerId as string, following_id: followingId as string })
      .first();

    return res.json({
      success: true,
      isFollowing: !!follow
    });
  } catch (error: any) {
    console.error('[Check If Following Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFollowing(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const following = await knex('follows')
      .where({ follower_id: userId })
      .select('following_id');

    return res.json({
      success: true,
      following: following.map(f => f.following_id)
    });
  } catch (error: any) {
    console.error('[Get Following Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
