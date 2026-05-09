import { Telegraf, Context } from 'telegraf';
import { v4 as uuidv4 } from 'uuid';
import knex from '../db/knex';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://tardis-app.com/telegram-auth';

if (!BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram Bot will not start.');
}

export class TelegramBotService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(BOT_TOKEN!);
    this.setupCommands();
    this.setupListeners();
  }

  private setupCommands() {
    this.bot.command('start', async (ctx) => {
      const payload = (ctx as any).startPayload;
      
      let message = "Welcome to Tardis - The Social-Financial OS for Solana!\n\n";
      message += "Connect your wallet or create a new one to start tipping, trading, and lending directly in Telegram.";
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: "🚀 Launch Tardis", web_app: { url: `${MINI_APP_URL}?tg_id=${ctx.from.id}&username=${ctx.from.username || ''}` } }
          ],
          [
            { text: "🔗 Link Existing Wallet", web_app: { url: `${MINI_APP_URL}?action=link&tg_id=${ctx.from.id}` } },
            { text: "🆕 Create New Wallet", web_app: { url: `${MINI_APP_URL}?action=create&tg_id=${ctx.from.id}` } }
          ]
        ]
      };

      await ctx.reply(message, { reply_markup: keyboard });
    });

    this.bot.command('help', (ctx) => {
      ctx.reply(
        "Tardis Bot Commands:\n" +
        "/start - Connect your wallet\n" +
        "/tip @username <amount> <token> - Tip a user\n" +
        "/balance - Check your linked wallet balance\n" +
        "/help - Show this message"
      );
    });
  }

  private setupListeners() {
    // Listen for "tip" pattern in messages
    this.bot.on('text', async (ctx, next) => {
      const text = ctx.message.text;
      const tipRegex = /@(\w+)\s+tip\s+@(\w+)\s+([\d.]+)\s+(\w+)/i;
      // Also support simpler: tip @user 5 USDC
      const simpleTipRegex = /tip\s+@(\w+)\s+([\d.]+)\s+(\w+)/i;

      let match = text.match(tipRegex) || text.match(simpleTipRegex);

      if (match) {
        // Handle as tip
        await this.handleTip(ctx, match);
      } else {
        return next();
      }
    });
  }

  private async handleTip(ctx: Context, match: RegExpMatchArray) {
    try {
      // Logic depends on which regex matched
      const isMentionBot = match.length === 5;
      const recipientUsername = isMentionBot ? match[2] : match[1];
      const amount = match[isMentionBot ? 3 : 2];
      const token = match[isMentionBot ? 4 : 3].toUpperCase();

      const senderId = ctx.from?.id.toString();
      if (!senderId) return;

      // 1. Find sender in DB
      const sender = await knex('users').where({ telegram_id: senderId }).first();
      if (!sender) {
        return ctx.reply(
          `Hey ${ctx.from?.first_name}, you haven't linked your wallet yet! ` +
          `Click /start to get set up and start tipping.`
        );
      }

      // 2. Find recipient in DB (by telegram_username)
      const recipient = await knex('users').where({ telegram_username: recipientUsername }).first();

      if (recipient) {
        // Both are linked! Generate a Blink/Action link
        // In a real implementation, we'd provide a button to sign the tx
        const actionUrl = `https://tardis.link/tip?to=${recipient.id}&amount=${amount}&token=${token}`;
        
        await ctx.reply(
          `Ready to tip ${amount} ${token} to @${recipientUsername}!\n\n` +
          `Click below to sign the transaction:`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "✅ Confirm Tip", url: actionUrl }]]
            }
          }
        );
      } else {
        // VIRAL ONBOARDING: Recipient not found, create a pending tip
        const pendingId = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        await knex('pending_tips').insert({
          id: pendingId,
          sender_id: sender.id, // Wallet address
          recipient_tg_id: recipientUsername, // We store username since we don't have ID yet
          amount: amount,
          mint_address: token, // Simplified for now
          status: 'pending',
          expires_at: expiresAt
        });

        await ctx.reply(
          `💰 @${recipientUsername}, you have an incoming tip of ${amount} ${token} from @${ctx.from?.username || ctx.from?.first_name}!\n\n` +
          `You have 48 hours to claim it. Click below to create your wallet and claim your funds.`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "🎁 Claim My Tip", web_app: { url: `${MINI_APP_URL}?claim=${pendingId}&username=${recipientUsername}` } }]]
            }
          }
        );
      }
    } catch (error) {
      console.error('Error handling tip:', error);
      ctx.reply('Sorry, I ran into an error processing that tip.');
    }
  }

  public launch() {
    if (BOT_TOKEN) {
      this.bot.launch();
      console.log('Telegram Bot launched successfully');
    }
  }

  public stop(reason: string) {
    this.bot.stop(reason);
  }
}

export const telegramBotService = new TelegramBotService();
