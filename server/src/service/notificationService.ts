import knex from '../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { extractMentions } from '../utils/mentions';
import expoNotificationService from '../services/expoNotificationService';

export async function createNotification(
  userId: string,
  type: 'mention' | 'like' | 'repost' | 'reply' | 'follow' | 'message' | 'post',
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

    // Trigger push notification
    try {
      // Get the actor's info (for the notification title/body)
      const actor = await knex('users').where({ id: actorId }).first();
      const actorName = actor ? (actor.display_name || actor.username || 'Someone') : 'Someone';

      // Get user's push tokens
      const pushTokens = await knex('push_tokens')
        .where({ user_id: userId, is_active: true })
        .select('expo_push_token');

      if (pushTokens.length > 0) {
        const tokenList = pushTokens.map(t => t.expo_push_token);
        
        let title = 'New Notification';
        let body = '';
        let screen = 'MainTabs';
        let params = {};

        switch (type) {
          case 'message':
            title = `New message from ${actorName}`;
            body = content || 'Sent you a message';
            screen = 'ChatScreen';
            params = { chatId: resourceId };
            break;
          case 'mention':
            title = 'You were mentioned';
            body = `${actorName} mentioned you in a post: "${content}"`;
            screen = 'ThreadDetail';
            params = { postId: resourceId };
            break;
          case 'reply':
            title = 'New reply';
            body = `${actorName} replied to your post: "${content}"`;
            screen = 'ThreadDetail';
            params = { postId: resourceId };
            break;
          case 'like':
            title = 'New like';
            body = `${actorName} liked your post`;
            screen = 'ThreadDetail';
            params = { postId: resourceId };
            break;
          case 'repost':
            title = 'New repost';
            body = `${actorName} reposted your post`;
            screen = 'ThreadDetail';
            params = { postId: resourceId };
            break;
          case 'follow':
            title = 'New follower';
            body = `${actorName} started following you`;
            screen = 'Profile';
            params = { userId: actorId };
            break;
          case 'post':
            title = `New post from ${actorName}`;
            body = content ? (content.substring(0, 50) + (content.length > 50 ? '...' : '')) : 'Shared a new post';
            screen = 'ThreadDetail';
            params = { postId: resourceId };
            break;
        }

        await expoNotificationService.sendNotifications(tokenList, {
          title,
          body,
          data: {
            screen,
            params: JSON.stringify(params),
            type,
            resourceId
          }
        });
        console.log(`[Notification] Push notification sent to ${tokenList.length} tokens for ${userId}`);
      }
    } catch (pushError) {
      console.error('[Notification] Error sending push notification:', pushError);
    }

    return id;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
  }
}

/**
 * Notify all followers of a user when they create a new post
 */
export async function notifyFollowers(
  authorId: string,
  postId: string,
  content: string
) {
  try {
    console.log(`[Notification] Notifying followers of ${authorId} about post ${postId}`);
    
    // Get all followers
    const followers = await knex('follows')
      .where({ following_id: authorId })
      .select('follower_id');

    if (followers.length === 0) return;

    // Create notifications for each follower
    for (const f of followers) {
      await createNotification(
        f.follower_id,
        'post',
        authorId,
        postId,
        content.substring(0, 100) // Preview
      );
    }
  } catch (error) {
    console.error('[Notification] Error notifying followers:', error);
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
