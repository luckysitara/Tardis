import { Request, Response } from 'express';
import knex from '../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { Connection, PublicKey } from '@solana/web3.js';
import { unpackMint, getTokenGroupMemberState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_GROUP_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

/**
 * Get all public communities
 */
export async function getCommunities(req: Request, res: Response) {
  try {
    const { userId } = req.query; // Accept userId to check membership

    const communities = await knex('chat_rooms')
      .where({ type: 'group', is_public: true, is_active: true })
      .select('*');

    const communitiesWithGates = await Promise.all(
      communities.map(async (community) => {
        const gates = await knex('chat_room_gates')
          .where({ chat_room_id: community.id })
          .select('*');
        
        const memberCount = await knex('chat_participants')
          .where({ chat_room_id: community.id })
          .count('id as count')
          .first();

        let isMember = false;
        if (userId) {
          const membership = await knex('chat_participants')
            .where({ chat_room_id: community.id, user_id: userId as string })
            .first();
          isMember = !!membership;
        }

        return {
          ...community,
          gates,
          memberCount: memberCount?.count || 0,
          is_member: isMember
        };
      })
    );

    return res.json({ success: true, communities: communitiesWithGates });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create a new gated community
 */
export async function createCommunity(req: Request, res: Response) {
  try {
    const { name, description, avatarUrl, bannerUrl, isPublic, creatorId, gates } = req.body;

    if (!name || !creatorId) {
      return res.status(400).json({ success: false, error: 'Name and creatorId are required' });
    }

    const communityId = uuidv4();

    await knex.transaction(async (trx) => {
      // 1. Create the room
      await trx('chat_rooms').insert({
        id: communityId,
        type: 'group',
        name,
        description,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        is_public: isPublic ?? true,
        creator_id: creatorId,
        created_at: new Date(),
        updated_at: new Date()
      });

      // 2. Add creator as admin
      await trx('chat_participants').insert({
        id: uuidv4(),
        chat_room_id: communityId,
        user_id: creatorId,
        is_admin: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      // 3. Add gates if any
      if (gates && Array.isArray(gates)) {
        for (const gate of gates) {
          await trx('chat_room_gates').insert({
            id: uuidv4(),
            chat_room_id: communityId,
            gate_type: gate.type, // TOKEN, NFT, GENESIS
            mint_address: gate.mintAddress,
            min_balance: gate.minBalance || '1',
            symbol: gate.symbol,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    });

    return res.json({ success: true, communityId });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Verify gating and join a community
 */
export async function joinCommunity(req: Request, res: Response) {
  try {
    const { communityId, userId } = req.body;

    if (!communityId || !userId) {
      return res.status(400).json({ success: false, error: 'communityId and userId are required' });
    }

    // 1. Check if already a member
    const existing = await knex('chat_participants')
      .where({ chat_room_id: communityId, user_id: userId })
      .first();
    
    if (existing) {
      return res.json({ success: true, message: 'Already a member' });
    }

    // 2. Fetch Gates
    const gates = await knex('chat_room_gates').where({ chat_room_id: communityId });

    if (gates.length > 0) {
      console.log(`[GatingEngine] Verifying ${gates.length} gates for user ${userId}`);
      const connection = new Connection(RPC_URL);
      const userPubkey = new PublicKey(userId);

      for (const gate of gates) {
        let passed = false;

        if (gate.gate_type === 'GENESIS') {
          passed = await verifySGTInternal(connection, userPubkey);
        } else if (gate.gate_type === 'TOKEN' || gate.gate_type === 'NFT') {
          passed = await verifyTokenGate(connection, userPubkey, gate);
        }

        if (!passed) {
          return res.status(403).json({ 
            success: false, 
            error: `Access Denied: You do not meet the ${gate.gate_type} requirement.` 
          });
        }
      }
    }

    // 3. Add member
    await knex('chat_participants').insert({
      id: uuidv4(),
      chat_room_id: communityId,
      user_id: userId,
      is_admin: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    return res.json({ success: true, message: 'Joined successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get communities related to a user (joined or created)
 */
export async function getUserCommunities(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    // Communities joined
    const joined = await knex('chat_participants')
      .join('chat_rooms', 'chat_participants.chat_room_id', 'chat_rooms.id')
      .where('chat_participants.user_id', userId)
      .where('chat_rooms.type', 'group')
      .select('chat_rooms.*', 'chat_participants.is_admin');

    // Communities created (should be a subset of joined, but just in case)
    const created = await knex('chat_rooms')
      .where({ type: 'group', creator_id: userId })
      .select('*');

    return res.json({ success: true, joined, created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// --- Internal Gating Helpers ---

async function verifySGTInternal(connection: Connection, pubkey: PublicKey): Promise<boolean> {
  const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  for (const account of accounts.value) {
    const mintPubkey = new PublicKey(account.account.data.parsed.info.mint);
    const info = await connection.getAccountInfo(mintPubkey);
    if (info) {
      try {
        const mint = unpackMint(mintPubkey, info, TOKEN_2022_PROGRAM_ID);
        const isAuthValid = mint.mintAuthority?.toBase58() === SGT_MINT_AUTHORITY;
        const groupMember = getTokenGroupMemberState(mint);
        const isGroupValid = groupMember?.group?.toBase58() === SGT_GROUP_ADDRESS;
        if (isAuthValid && isGroupValid) return true;
      } catch (e) { continue; }
    }
  }
  return false;
}

async function verifyTokenGate(connection: Connection, pubkey: PublicKey, gate: any): Promise<boolean> {
  if (!gate.mint_address) return false;
  
  try {
    const mintPubkey = new PublicKey(gate.mint_address);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      mint: mintPubkey
    });

    let totalBalance = 0;
    for (const acc of tokenAccounts.value) {
      totalBalance += acc.account.data.parsed.info.tokenAmount.uiAmount;
    }

    return totalBalance >= parseFloat(gate.min_balance);
  } catch (e) {
    return false;
  }
}
