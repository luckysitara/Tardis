import { Request, Response } from 'express';
import knex from '../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from '../service/notificationService';
import { getConnection } from '../utils/connection';
import { PublicKey } from '@solana/web3.js';
import * as tldParserPkg from '@onsol/tldparser';
const TldParser = (tldParserPkg as any).TldParser || (tldParserPkg as any).default?.TldParser;

/**
 * Helper to resolve a user's .skr domain from their wallet address
 */
async function resolveSkrUsername(userId: string): Promise<string> {
  try {
    const connection = getConnection();
    if (!connection) return userId;
    
    const parser = new TldParser(connection);
    const publicKey = new PublicKey(userId);
    const domains = await parser.getParsedAllUserDomainsFromTld(publicKey, 'skr');
    if (domains && domains.length > 0) {
      const rawDomain = domains[0].domain;
      return rawDomain.toLowerCase().endsWith('.skr') ? rawDomain : `${rawDomain}.skr`;
    }
  } catch (e) {
    console.log(`[IdentityResolution] .skr resolution failed for ${userId}:`, e);
  }
  return userId;
}

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

    // Trigger notification
    createNotification(followingId, 'follow', followerId);

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

export async function getSuggestedUsers(req: Request, res: Response) {
  try {
    const { userId } = req.query;

    // Fetch users who are hardware verified or have a profile picture
    // Exclude the current user
    let query = knex('users')
      .select('id', 'username', 'display_name', 'profile_picture_url', 'description', 'is_hardware_verified')
      .whereNotNull('username')
      .orderBy('is_hardware_verified', 'desc')
      .limit(10);

    if (userId) {
      query = query.whereNot('id', userId as string);
    }

    const suggestedUsers = await query;

    // Resolve .skr handles for users who only have wallet addresses as usernames
    const resolvedUsers = await Promise.all(
      suggestedUsers.map(async (user: any) => {
        if (user.username && user.username.length > 30) {
          const resolved = await resolveSkrUsername(user.id);
          if (resolved !== user.id) {
            // Update the database cache
            await knex('users').where({ id: user.id }).update({
              username: resolved,
              display_name: user.display_name === user.id ? resolved : user.display_name,
              updated_at: new Date()
            });
            return { 
              ...user, 
              username: resolved, 
              display_name: user.display_name === user.id ? resolved : user.display_name 
            };
          }
        }
        return user;
      })
    );

    return res.json({
      success: true,
      users: resolvedUsers
    });
  } catch (error: any) {
    console.error('[Get Suggested Users Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
