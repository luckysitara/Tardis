/**
 * File: server/src/routes/user/userRoutes.ts
 *
 * A router that handles:
 * - Basic profile fetch/update (username, description, profilePicUrl)
 * - Deleting user accounts
 */

import {Router, Request, Response, NextFunction} from 'express';
import multer from 'multer';
import knex from '../../db/knex';
import { deleteUserAccount as deleteUserAccountService } from '../../service/userService'; 
import * as tldParserPkg from '@onsol/tldparser';
const TldParser = (tldParserPkg as any).TldParser || (tldParserPkg as any).default?.TldParser;
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '../../utils/connection';
import { verifySignature } from '../../utils/solana';

const profileImageRouter = Router();

/**
 * Helper to resolve a user's .skr domain from their wallet address
 */
async function resolveSkrUsername(userId: string): Promise<string> {
  try {
    const connection = getConnection();
    const parser = new TldParser(connection);
    const publicKey = new PublicKey(userId);
    const domains = await parser.getParsedAllUserDomainsFromTld(publicKey, 'skr');
    if (domains && domains.length > 0) {
      const rawDomain = domains[0].domain;
      return rawDomain.toLowerCase().endsWith('.skr') ? rawDomain : `${rawDomain}.skr`;
    }
  } catch (e) {
    console.log(`[ProfileFetch] .skr resolution failed for ${userId}:`, e);
  }
  return userId;
}

/**
 * ------------------------------------------
 *  EXISTING: Fetch user's profile data
 * ------------------------------------------
 */
profileImageRouter.get('/', async (req: any, res: any) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({success: false, error: 'Missing userId'});
    }

    let user = await knex('users').where({id: userId}).first();
    
    // If user doesn't exist, try to resolve their .skr domain first
    let resolvedUsername = await resolveSkrUsername(userId);

    if (!user) {
      // Return a virtual user profile
      return res.json({
        success: true,
        url: `https://api.dicebear.com/7.x/initials/png?seed=${resolvedUsername}`,
        username: resolvedUsername,
        display_name: resolvedUsername,
        description: '',
        isHardwareVerified: false,
        attachmentData: {},
      });
    }

    // Update if needed (only if username is still the wallet address)
    if (user.username === user.id && resolvedUsername !== user.id) {
       const updateData: any = {
         username: resolvedUsername,
         updated_at: new Date()
       };
       
       // Only overwrite display_name if it's also the wallet address (never updated)
       if (user.display_name === user.id || !user.display_name) {
         updateData.display_name = resolvedUsername;
         user.display_name = resolvedUsername;
       }
       
       await knex('users').where({id: userId}).update(updateData);
       user.username = resolvedUsername;
    }

    return res.json({
      success: true,
      url: user.profile_picture_url,
      username: user.username,
      display_name: user.display_name,
      description: user.description || '',
      isHardwareVerified: !!user.is_hardware_verified,
      attachmentData: user.attachment_data || {}, 
    });
  } catch (error: any) {
    console.error('[Profile fetch error]', error);
    return res.status(500).json({success: false, error: error.message});
  }
});

/**
 * ------------------------------------------
 *  NEW: SECURE Profile Update
 *  Requires signature verification
 * ------------------------------------------
 */
profileImageRouter.post('/update', async (req: any, res: any) => {
  try {
    const { 
      userId, 
      displayName, 
      description, 
      profilePicUrl, 
      signature, 
      timestamp 
    } = req.body;

    if (!userId || !signature || !timestamp) {
      return res.status(400).json({ success: false, error: 'Missing required fields (userId, signature, timestamp)' });
    }

    // Reconstruct the message that was signed
    // The mobile app will sign: {"action":"update_profile","userId":"...","timestamp":"..."}
    const signedMessage = `{"action":"update_profile","userId":"${userId}","timestamp":"${timestamp}"}`;

    const isSignatureValid = verifySignature(signedMessage, signature, userId);
    if (!isSignatureValid) {
      return res.status(401).json({ success: false, error: 'Invalid hardware signature.' });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date(),
      is_hardware_verified: true
    };
    
    if (displayName !== undefined) updateData.display_name = displayName;
    if (description !== undefined) updateData.description = description;
    if (profilePicUrl !== undefined) updateData.profile_picture_url = profilePicUrl;

    const existingUser = await knex('users').where({ id: userId }).first();
    if (!existingUser) {
      // For new users, try to resolve their .skr domain for the username field
      const resolvedUsername = await resolveSkrUsername(userId);
      
      await knex('users').insert({
        id: userId,
        username: resolvedUsername,
        ...updateData,
        created_at: new Date(),
      });
    } else {
      await knex('users').where({ id: userId }).update(updateData);
    }


    return res.json({ 
      success: true, 
      message: 'Profile updated with hardware verification',
      profile: {
        display_name: updateData.display_name,
        description: updateData.description,
        profile_picture_url: updateData.profile_picture_url,
        isHardwareVerified: true
      }
    });
  } catch (error: any) {
    console.error('[Profile update error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Legacy single-field updates (uncommented if still needed, but discouraged)
profileImageRouter.post('/updateUsername', async (req: any, res: any) => {
    return res.status(410).json({ success: false, error: 'Endpoint deprecated. Use /api/profile/update with signature.' });
});

profileImageRouter.post('/updateDescription', async (req: any, res: any) => {
    return res.status(410).json({ success: false, error: 'Endpoint deprecated. Use /api/profile/update with signature.' });
});

profileImageRouter.post('/updateProfilePic', async (req: any, res: any) => {
    return res.status(410).json({ success: false, error: 'Endpoint deprecated. Use /api/profile/update with signature.' });
});

/**
 * ------------------------------------------
 *  NEW: Create a new user
 * ------------------------------------------
 */
profileImageRouter.post('/createUser', async (req: any, res: any) => {
  try {
    const { userId, username, handle, description } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    const existingUser = await knex('users').where({ id: userId }).first();
    
    if (existingUser) {
      const isPlaceholder = existingUser.username === existingUser.id || 
                            /^[a-zA-Z0-9]{3,6}\.\.\.[a-zA-Z0-9]{3,6}$/.test(existingUser.username) ||
                            (!existingUser.username.includes('.') && username && username.includes('.'));
      
      const hasProperName = username && username.includes('.') && username !== existingUser.username;

      if (isPlaceholder && hasProperName) {
        await knex('users').where({ id: userId }).update({
          username: username,
          display_name: username,
          updated_at: new Date()
        });
        const updatedUser = await knex('users').where({ id: userId }).first();
        return res.json({ success: true, user: updatedUser, migrated: true });
      }

      return res.json({ success: true, user: existingUser });
    }

    const newUser = {
      id: userId,
      username: username || userId,
      display_name: username || userId,
      description: description || '',
      profile_picture_url: null,
      attachment_data: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await knex('users').insert(newUser);
    return res.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('[Create user error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ------------------------------------------
 *  NEW: Register user's public encryption key
 * ------------------------------------------
 */
profileImageRouter.post('/register-key', async (req: any, res: any) => {
  try {
    const { userId, publicKey } = req.body;
    if (!userId || !publicKey) {
      return res.status(400).json({ success: false, error: 'Missing userId or publicKey' });
    }

    const existingUser = await knex('users').where({ id: userId }).first();
    if (!existingUser) {
      await knex('users').insert({
        id: userId,
        username: userId,
        display_name: userId,
        public_encryption_key: publicKey,
        is_hardware_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      await knex('users').where({ id: userId }).update({
        public_encryption_key: publicKey,
        is_hardware_verified: true,
        updated_at: new Date(),
      });
    }

    return res.json({ success: true, message: 'Encryption key registered successfully' });
  } catch (error: any) {
    console.error('[register-key error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ------------------------------------------
 *  NEW: Delete user account
 * ------------------------------------------
 */
profileImageRouter.delete(
  '/delete-account',
  async (req: any, res: any) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId is required.' });
      }
      await deleteUserAccountService(userId);
      return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to delete account.' });
    }
  },
);

export default profileImageRouter;
