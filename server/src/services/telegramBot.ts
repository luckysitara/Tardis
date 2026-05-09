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

    this.bot.command('balance', async (ctx) => {
      try {
        const user = await knex('users').where({ telegram_id: ctx.from.id.toString() }).first();
        if (!user) {
          return ctx.reply("❌ Your wallet is not linked. Use /start to connect.");
        }

        // Generate a Blink for balance (or just link to a tracker)
        const balanceUrl = `https://solscan.io/account/${user.id}`;
        ctx.reply(
          `👤 *Account:* \`${user.display_name}\`\n` +
          `💳 *Wallet:* \`${user.id.substring(0, 4)}...${user.id.substring(user.id.length - 4)}\`\n\n` +
          `Click below to view your full portfolio on-chain:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: "🔍 View on Solscan", url: balanceUrl }]]
            }
          }
        );
      } catch (e) {
        ctx.reply("Error fetching balance.");
      }
    });

    this.bot.command('tip', async (ctx) => {
      const text = ctx.message.text;
      const parts = text.split(' ');
      // Format: /tip @user 5 USDC
      if (parts.length < 4) {
        return ctx.reply("Usage: /tip @username <amount> <token>");
      }
      const recipient = parts[1].replace('@', '');
      const amount = parts[2];
      const token = parts[3].toUpperCase();
      
      await this.processTip(ctx, recipient, amount, token);
    });

    this.bot.command('swap', async (ctx) => {
      const user = await knex('users').where({ telegram_id: ctx.from.id.toString() }).first();
      if (!user) return ctx.reply("❌ Link your wallet first using /start");

      const tmaSwapUrl = `${MINI_APP_URL}?action=swap&tg_id=${ctx.from.id}`;
      ctx.reply(
        "🔄 *Tardis Swap*\n\nSwap any Solana token instantly with the best rates via Jupiter.",
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: "💸 Open Swap", web_app: { url: tmaSwapUrl } }]]
          }
        }
      );
    });

    this.bot.command('wallet', async (ctx) => {
      try {
        const user = await knex('users').where({ telegram_id: ctx.from.id.toString() }).first();
        if (user) {
          ctx.reply(
            `✅ *Wallet Connected*\n\n` +
            `*Address:* \`${user.id}\`\n` +
            `*Identity:* ${user.display_name}\n\n` +
            `Your Telegram ID is successfully synced with Tardis.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          ctx.reply(
            `❌ *No Wallet Linked*\n\n` +
            `Your Telegram account is not yet connected to a Solana wallet. Click /start to get set up.`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (e) {
        ctx.reply("Error checking wallet status.");
      }
    });

    this.bot.command('help', (ctx) => {
      ctx.reply(
        "🛡 *Tardis Social-Finance Commands:*\n\n" +
        "/start - Connect/Create Solana wallet\n" +
        "/wallet - Check connection status\n" +
        "/balance - View your portfolio\n" +
        "/tip @user <amount> <token> - Send tokens\n" +
        "/swap - Trade tokens instantly\n" +
        "/help - Show this menu",
        { parse_mode: 'Markdown' }
      );
    });
  }

  private setupListeners() {
    this.bot.on('text', async (ctx, next) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) return next();

      // Simple natural language tip detection: "tip @user 5 usdc"
      const tipRegex = /^tip\s+@(\w+)\s+([\d.]+)\s+(\w+)$/i;
      const match = text.match(tipRegex);

      if (match) {
        const recipient = match[1];
        const amount = match[2];
        const token = match[3].toUpperCase();
        await this.processTip(ctx, recipient, amount, token);
      } else {
        return next();
      }
    });
  }

  private async processTip(ctx: Context, recipientUsername: string, amount: string, token: string) {
    try {
      const senderId = ctx.from?.id.toString();
      if (!senderId) return;

      const sender = await knex('users').where({ telegram_id: senderId }).first();
      if (!sender) {
        return ctx.reply("❌ You need to link your wallet to send tips. Click /start to begin.");
      }

      const recipient = await knex('users').where({ telegram_username: recipientUsername }).first();

      if (recipient) {
        const tmaTipUrl = `${MINI_APP_URL}?action=tip&to=${recipient.id}&amount=${amount}&token=${token}&tg_id=${ctx.from?.id}`;
        
        // 1. Reply to Sender with the signing button
        await ctx.reply(
          `✅ *Ready to tip ${amount} ${token} to @${recipientUsername}!*\n\n` +
          `Click below to confirm and sign in your secure Tardis wallet:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: "🚀 Confirm On-Chain Tip", web_app: { url: tmaTipUrl } }]]
            }
          }
        );

        // 2. Notify Recipient if we have their Telegram ID
        if (recipient.telegram_id) {
          try {
            await ctx.telegram.sendMessage(
              recipient.telegram_id,
              `💰 *@${ctx.from?.username || 'A user'}* is sending you a tip of *${amount} ${token}* on Tardis!\n\n` +
              `The transaction will arrive in your wallet as soon as they confirm it.`,
              { parse_mode: 'Markdown' }
            );
          } catch (e) {
            console.log(`Could not notify recipient ${recipientUsername} (likely hasn't started the bot)`);
          }
        }
      } else {
        // Pending tip logic...
        const pendingId = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        await knex('pending_tips').insert({
          id: pendingId,
          sender_id: sender.id,
          recipient_tg_id: recipientUsername,
          amount: amount,
          mint_address: token,
          status: 'pending',
          expires_at: expiresAt
        });

        await ctx.reply(
          `💰 *@${recipientUsername}, you have an incoming tip!*\n\n` +
          `*Amount:* ${amount} ${token}\n` +
          `*From:* @${ctx.from?.username || ctx.from?.first_name}\n\n` +
          `You have 48 hours to claim. Click below to create your wallet:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: "🎁 Claim My Tip", web_app: { url: `${MINI_APP_URL}?claim=${pendingId}&username=${recipientUsername}` } }]]
            }
          }
        );
      }
    } catch (error) {
      console.error('Tip Processing Error:', error);
      ctx.reply("⚠️ Sorry, I couldn't process that tip request.");
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
