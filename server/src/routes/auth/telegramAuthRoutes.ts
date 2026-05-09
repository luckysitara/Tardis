import { Router, Request, Response } from 'express';
import knex from '../../db/knex';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/auth/telegram/link
 * Links an existing wallet to a Telegram ID
 */
router.post('/link', async (req: Request, res: Response) => {
  try {
    const { walletAddress, telegramId, telegramUsername } = req.body;
    console.log(`[Auth:Link] Attempting to link ${walletAddress} to TG:${telegramId}`);

    if (!walletAddress || !telegramId) {
      return res.status(400).json({ error: 'Missing walletAddress or telegramId' });
    }

    const tid = telegramId.toString();

    // 1. Clear this Telegram ID from any other wallet it might be linked to (Re-linking logic)
    await knex('users')
      .where({ telegram_id: tid })
      .whereNot({ id: walletAddress })
      .update({
        telegram_id: null,
        telegram_username: null
      });

    // 2. Update the target user with Telegram info
    await knex('users')
      .where({ id: walletAddress })
      .update({
        telegram_id: tid,
        telegram_username: telegramUsername || null,
        updated_at: new Date()
      });

    // Check for pending tips
    const pendingTips = await knex('pending_tips')
      .where({ recipient_tg_id: telegramUsername, status: 'pending' });

    console.log(`[Auth:Link] Success. Found ${pendingTips.length} pending tips.`);
    res.json({ 
      success: true, 
      message: 'Account linked successfully',
      pendingTipsCount: pendingTips.length 
    });
  } catch (error: any) {
    console.error('[Auth:Link] Error:', error.message);
    res.status(500).json({ error: 'Failed to link account. Database sync in progress.' });
  }
});

/**
 * POST /api/auth/telegram/create
 * Creates a new user record from Telegram onboarding
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { walletAddress, telegramId, telegramUsername, displayName } = req.body;
    console.log(`[Auth:Create] Attempting to create user ${walletAddress} for TG:${telegramId}`);

    if (!walletAddress || !telegramId) {
      return res.status(400).json({ error: 'Missing walletAddress or telegramId' });
    }

    // Create new user
    await knex('users').insert({
      id: walletAddress,
      username: telegramUsername || walletAddress.substring(0, 8),
      display_name: displayName || telegramUsername || 'Tardis User',
      telegram_id: telegramId.toString(),
      telegram_username: telegramUsername || null,
      is_hardware_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Check and process pending tips
    const pendingTips = await knex('pending_tips')
      .where({ recipient_tg_id: telegramUsername, status: 'pending' });

    if (pendingTips.length > 0) {
      await knex('pending_tips')
        .where({ recipient_tg_id: telegramUsername, status: 'pending' })
        .update({ status: 'claimed' });
    }

    console.log(`[Auth:Create] Success. Claimed ${pendingTips.length} tips.`);
    res.json({ 
      success: true, 
      message: 'Account created and linked successfully',
      claimedTips: pendingTips.length
    });
  } catch (error: any) {
    console.error('[Auth:Create] Error:', error.message);
    if (error.message.includes('unique') || error.message.includes('already exists')) {
      return res.status(400).json({ error: 'This wallet or Telegram ID is already registered.' });
    }
    res.status(500).json({ error: 'Identity initialization failed. Database sync in progress.' });
  }
});

/**
 * GET /api/auth/telegram/status/:telegramId
 * Checks if a Telegram user is already linked
 */
router.get('/status/:telegramId', async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    const user = await knex('users').where({ telegram_id: telegramId }).first();
    
    res.json({ 
      isLinked: !!user,
      user: user ? {
        id: user.id,
        username: user.username,
        displayName: user.display_name
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
