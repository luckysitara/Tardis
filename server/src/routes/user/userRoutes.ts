/**
 * File: server/src/routes/profileImageRoutes.ts
 *
 * A router that handles:
 * - Basic profile fetch/update (username, description, profilePicUrl)
 * - Deleting user accounts
 */

import {Router, Request, Response, NextFunction} from 'express';
import multer from 'multer'; // Keep if multer is still used for avatar upload (if not, remove)
import sharp from 'sharp'; // Keep if sharp is still used for avatar processing (if not, remove)
import fs from 'fs';
import path from 'path';
import os from 'os';
import knex from '../../db/knex';
// Removed: import {uploadToIpfs, uploadToPinata} from '../../utils/ipfs';
// Removed: import fetch from 'node-fetch'; // No longer needed after removing IPFS upload

// Import the new user service function
import { deleteUserAccount as deleteUserAccountService } from '../../service/userService'; 

const profileImageRouter = Router();
// Removed: upload middleware as /upload endpoint is removed
const upload = multer({storage: multer.memoryStorage()}); // Only keep if updateProfilePic will use it.

/**
 * Removed: ------------------------------------------
 * Removed:  EXISTING: Upload profile image logic
 * Removed: ------------------------------------------
 */
// Removed: profileImageRouter.post('/upload', ...);

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

    const user = await knex('users').where({id: userId}).first();
    if (!user) {
      return res.status(404).json({success: false, error: 'User not found'});
    }

    // Return the user's data, including the attachment_data field.
    // attachmentData might still be used for SGT display (e.g. if SGT is stored as attachment_data)

    console.log(user , "user.attachment_data");
    return res.json({
      success: true,
      url: user.profile_picture_url,
      username: user.username,
      description: user.description || '',
      attachmentData: user.attachment_data || {}, 
    });
  } catch (error: any) {
    console.error('[Profile fetch error]', error);
    return res.status(500).json({success: false, error: error.message});
  }
});

/**
 * ------------------------------------------
 *  EXISTING: Update user's username
 * ------------------------------------------
 */
profileImageRouter.post('/updateUsername', async (req: any, res: any) => {
  try {
    const {userId, username} = req.body;
    if (!userId || !username) {
      return res
        .status(400)
        .json({success: false, error: 'Missing userId or username'});
    }

    const existingUser = await knex('users').where({id: userId}).first();
    if (!existingUser) {
      await knex('users').insert({
        id: userId,
        username,
        handle: '@' + userId.slice(0, 6),
        profile_picture_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      await knex('users').where({id: userId}).update({
        username,
        updated_at: new Date(),
      });
    }

    return res.json({success: true, username});
  } catch (error: any) {
    console.error('[updateUsername error]', error);
    return res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Removed: ------------------------------------------
 * Removed:  NEW: Follow a user
 * Removed: ------------------------------------------
 */
// Removed: profileImageRouter.post('/follow', ...);

/**
 * Removed: ------------------------------------------
 * Removed:  NEW: Unfollow a user
 * Removed: ------------------------------------------
 */
// Removed: profileImageRouter.post('/unfollow', ...);

/**
 * Removed: ------------------------------------------
 * Removed:  NEW: GET list of a user's followers
 * Removed: ------------------------------------------
 */
// Removed: profileImageRouter.get('/followers', ...);

/**
 * Removed: ------------------------------------------
 * Removed:  NEW: GET list of a user's following
 * Removed: ------------------------------------------
 */
// Removed: profileImageRouter.get('/following', ...);

/**
 * Removed: ------------------------------------------
 * Removed:  NEW: Attach or update a coin on the user's profile
 * Removed: ------------------------------------------
 */
// Removed: profileImageRouter.post('/attachCoin', ...);

/**
 * Removed: ------------------------------------------
 * Removed:  Remove an attached coin from the user's profile
 * Removed: ------------------------------------------
 */
// Removed: profileImageRouter.post('/removeAttachedCoin', ...);

// Removed: profileImageRouter.get('/search', ...);

/**
 * ------------------------------------------
 *  NEW: Create a new user
 *  Body: { userId, username, handle }
 * ------------------------------------------
 */
profileImageRouter.post('/createUser', async (req: any, res: any) => {
  try {
    const { userId, username, handle, description } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    // Check if user already exists
    const existingUser = await knex('users').where({ id: userId }).first();
    if (existingUser) {
      // User already exists, just return success
      return res.json({ success: true, user: existingUser });
    }

    // Create new user with minimal data
    const newUser = {
      id: userId,
      username: username || userId, // Default to userId if username not provided
      handle: handle || '@' + userId.slice(0, 6), // Default handle if not provided
      description: description || '', // Default empty description if not provided
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
 *  NEW: Update user's description
 * ------------------------------------------
 */
profileImageRouter.post('/updateDescription', async (req: any, res: any) => {
  try {
    const {userId, description} = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({success: false, error: 'Missing userId'});
    }

    const existingUser = await knex('users').where({id: userId}).first();
    if (!existingUser) {
      await knex('users').insert({
        id: userId,
        username: userId,
        handle: '@' + userId.slice(0, 6),
        description: description || '',
        profile_picture_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      await knex('users').where({id: userId}).update({
        description: description || '',
        updated_at: new Date(),
      });
    }

    return res.json({success: true, description: description || ''});
  } catch (error: any) {
    console.error('[updateDescription error]', error);
    return res.status(500).json({success: false, error: error.message});
  }
});

/**
 * ------------------------------------------
 *  NEW: Update user's profile picture URL directly
 *  Body: { userId, profilePicUrl }
 * ------------------------------------------
 */
profileImageRouter.post('/updateProfilePic', async (req: any, res: any) => {
  try {
    const { userId, profilePicUrl } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId' 
      });
    }
    
    if (!profilePicUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing profilePicUrl' 
      });
    }

    console.log(`[updateProfilePic] Updating profile picture for userId: ${userId}`);
    console.log(`[updateProfilePic] New profile picture URL: ${profilePicUrl}`);

    // Check if user exists
    const existingUser = await knex('users').where({ id: userId }).first();
    
    if (!existingUser) {
      // Create new user if doesn't exist
      console.log(`[updateProfilePic] User ${userId} not found, creating new record`);
      await knex('users').insert({
        id: userId,
        username: userId.slice(0, 6), // Default username
        handle: '@' + userId.slice(0, 6), // Default handle
        profile_picture_url: profilePicUrl,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`[updateProfilePic] New user created with profile picture`);
    } else {
      // Update existing user
      console.log(`[updateProfilePic] Updating existing user ${userId}`);
      await knex('users').where({ id: userId }).update({
        profile_picture_url: profilePicUrl,
        updated_at: new Date(),
      });
      console.log(`[updateProfilePic] Profile picture updated successfully`);
    }

    return res.json({ 
      success: true, 
      profilePicUrl: profilePicUrl,
      message: 'Profile picture updated successfully'
    });
  } catch (error: any) {
    console.error('[updateProfilePic error]', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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

    console.log(`[register-key] Registering public key for userId: ${userId}`);

    const existingUser = await knex('users').where({ id: userId }).first();
    if (!existingUser) {
      await knex('users').insert({
        id: userId,
        username: userId.slice(0, 6),
        handle: '@' + userId.slice(0, 6),
        public_encryption_key: publicKey,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      await knex('users').where({ id: userId }).update({
        public_encryption_key: publicKey,
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
 *  DEV ONLY: Create test users
 * ------------------------------------------
 */
profileImageRouter.post('/seed-test-users', async (req: any, res: any) => {
  try {
    const testUsers = [
      {
        id: 'SeekeR1111111111111111111111111111111111111',
        username: 'Rose Tyler',
        handle: 'rose.skr',
        description: 'The Bad Wolf.',
        public_encryption_key: 'rose_test_key_base64_placeholder',
      },
      {
        id: 'SeekeR2222222222222222222222222222222222222',
        username: 'Captain Jack',
        handle: 'jack.skr',
        description: 'Face of Boe.',
        public_encryption_key: 'jack_test_key_base64_placeholder',
      }
    ];

    for (const user of testUsers) {
      const existing = await knex('users').where({ id: user.id }).first();
      if (!existing) {
        await knex('users').insert({
          ...user,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return res.json({ success: true, message: 'Test users seeded successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Simple authentication middleware for delete-account route
const requireAuthForDelete = async (req: any, res: any, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please log in.' 
       });
    }

    // Get the token from the Authorization header
    const token = authHeader.split(' ')[1];
    
    // Verify the token and get the user's address
    // This assumes the token contains the user's wallet address
    const userAddress = token; // In a real implementation, you would verify the JWT token

    // Ensure the authenticated user can only delete their own account
    if (userAddress.toLowerCase() !== userId.toLowerCase()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only delete your own account.' 
      });
    }

    // Add the verified user address to the request for use in the route handler
    req.userAddress = userAddress;
    next();
  } catch (error: any) {
    console.error('[Auth Middleware Error]', error);
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication failed.' 
    });
  }
};

/**
 * ------------------------------------------
 *  NEW: Delete user account
 *  Protected by requireAuthForDelete middleware
 * ------------------------------------------
 */
profileImageRouter.delete(
  '/delete-account',
  requireAuthForDelete,
  async (req: any, res: any, next: NextFunction) => {
    console.log(`[Route /delete-account] Received request. Body:`, req.body);
    try {
      const { userId } = req.body;
      
      console.log(`[Route /delete-account] Extracted userId: ${userId}`);

      if (!userId) {
        console.error('[Route /delete-account] Error: userId is missing from request body.');
        return res.status(400).json({ success: false, error: 'userId is required in the request body.' });
      }

      console.log(`[Route /delete-account] Calling deleteUserAccountService for userId: ${userId}`);
      await deleteUserAccountService(userId);
      
      console.log(`[Route /delete-account] Successfully deleted account for userId: ${userId}`);
      return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
    } catch (error: any) {
      console.error('[Delete Account Route Error]', error);
      if (error.message.includes('User not found')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: error.message || 'Failed to delete account.' });
    }
  },
);

export default profileImageRouter;
