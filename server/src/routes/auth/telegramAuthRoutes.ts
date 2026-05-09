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

    if (!walletAddress || !telegramId) {
      return res.status(400).json({ error: 'Missing walletAddress or telegramId' });
    }

    // Update user with Telegram info
    await knex('users')
      .where({ id: walletAddress })
      .update({
        telegram_id: telegramId.toString(),
        telegram_username: telegramUsername || null,
        updated_at: new Date()
      });

    // Check for pending tips
    const pendingTips = await knex('pending_tips')
      .where({ recipient_tg_id: telegramUsername, status: 'pending' });

    res.json({ 
      success: true, 
      message: 'Account linked successfully',
      pendingTipsCount: pendingTips.length 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/telegram/create
 * Creates a new user record from Telegram onboarding
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { walletAddress, telegramId, telegramUsername, displayName } = req.body;

    if (!walletAddress || !telegramId) {
      return res.status(400).json({ error: 'Missing walletAddress or telegramId' });
    }

    // Create new user
    // Note: No .skr suffix as this is not a Seeker-verified account
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

    // In a real flow, we might trigger the transfers here or notify the user to claim
    // For now, we just flag them
    if (pendingTips.length > 0) {
      await knex('pending_tips')
        .where({ recipient_tg_id: telegramUsername, status: 'pending' })
        .update({ status: 'claimed' });
    }

    res.json({ 
      success: true, 
      message: 'Account created and linked successfully',
      claimedTips: pendingTips.length
    });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'This wallet or Telegram ID is already registered' });
    }
    res.status(500).json({ error: error.message });
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
