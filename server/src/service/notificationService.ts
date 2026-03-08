import knex from '../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { extractMentions } from '../utils/mentions';

export async function createNotification(
  userId: string,
  type: 'mention' | 'like' | 'repost' | 'reply' | 'follow',
  actorId: string,
  resourceId?: string,
  content?: string
) {
  try {
    // Don't notify if actor is the same as recipient
    if (userId.toLowerCase() === actorId.toLowerCase()) return;

    const id = uuidv4();
    await knex('notifications').insert({
      id,
      user_id: userId,
      type,
      actor_id: actorId,
      resource_id: resourceId,
      content,
      is_read: false,
      created_at: new Date()
    });
    
    console.log(`[Notification] Created ${type} notification for ${userId}`);
    return id;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
  }
}

export async function processMentions(
  text: string,
  actorId: string,
  resourceId: string,
  resourceType: 'post' | 'message'
) {
  const usernames = extractMentions(text);
  if (usernames.length === 0) return;

  console.log(`[Notification] Processing mentions for ${resourceType}: ${usernames.join(', ')}`);

  try {
    // Find users by username
    const mentionedUsers = await knex('users')
      .whereIn('username', usernames)
      .orWhereIn('display_name', usernames);

    for (const user of mentionedUsers) {
      await createNotification(
        user.id,
        'mention',
        actorId,
        resourceId,
        text.substring(0, 100) // Preview
      );
    }
  } catch (error) {
    console.error('[Notification] Error processing mentions:', error);
  }
}
