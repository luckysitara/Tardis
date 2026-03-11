// File: src/index.ts
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { PublicKey } from '@solana/web3.js';
import knex from './db/knex'; // Keep knex for direct schema creation/interaction

import profileImageRouter from './routes/user/userRoutes'; // Keep profile router for user management
import postsRouter from './routes/postsRoutes'; // Add this import
import { chatRouter } from './routes/chat/chatRoutes'; // Add this import
import { communityRouter } from './routes/chat/communityRoutes'; // Add this import
import { followRouter } from './routes/followRoutes'; // Add this import
import heliusRouter from './routes/helius'; // Add this import
import jupiterUltraSwapRouter from './routes/swap/jupiterUltraSwapRoutes'; // Add this import
import domainRouter from './routes/domainRoutes';

// Removed: turnkeyAuthRouter and adminAuthRouter imports
import cors from 'cors';
import { setupConnection } from './utils/connection';
import { createTablesSQL, createTablesPostgresSQL } from './db/schema'; // Add this import


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/socket.io/',
});

app.use(express.json({ limit: '10mb' }));

// Set trust proxy for App Engine environment
// This is critical to make WebSockets work behind App Engine's proxy
app.set('trust proxy', true);

// Add CORS middleware
const corsOptions = {
  origin: '*', // This should work for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Forwarded-Proto', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));


// Test the database connection.
// Instead of exiting on error, we log the error and continue.
async function testDbConnection() {
  try {
    const result = await knex.raw('select 1+1 as result');
    console.log(
      'Database connection successful:',
      result.rows ? result.rows[0] : result
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    console.warn('Proceeding without a successful DB connection.');
  }
}

// Removed: runMigrationsAndStartServer function

// Setup connection to Solana
setupConnection();

// Add App Runner specific health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Solana App Kit API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Add health check endpoint that App Runner expects
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Use the routes
app.use('/api/profile', profileImageRouter);
app.use('/api/posts', postsRouter); // Add this line
app.use('/api/chat', chatRouter); // Add this line
app.use('/api/communities', communityRouter); // Add this line
app.use('/api/follows', followRouter); // Add this line
app.use('/api/helius', heliusRouter); // Add this line
app.use('/api/jupiter/ultra', jupiterUltraSwapRouter); // Add this line
app.use('/api/domain', domainRouter);

// Socket.io handlers
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('authenticate', ({ userId }) => {
    console.log(`Socket ${socket.id} authenticated for user ${userId}`);
    socket.join(`user:${userId}`);
    socket.data.userId = userId;
    socket.emit('authenticated', { success: true });
  });

  socket.on('join_chat', ({ chatId }) => {
    console.log(`Socket ${socket.id} joining chat ${chatId}`);
    socket.join(`chat:${chatId}`);
  });

  socket.on('leave_chat', ({ chatId }) => {
    console.log(`Socket ${socket.id} leaving chat ${chatId}`);
    socket.leave(`chat:${chatId}`);
  });

  socket.on('send_message', (message) => {
    console.log(`Message received from ${socket.id} for chat ${message.chatId}`);
    // Broadcast to all participants in the chat room EXCEPT the sender
    // The sender already has the message in their UI from the API response
    socket.to(`chat:${message.chatId}`).emit('new_message', message);
  });

  socket.on('edit_message', (data) => {
    console.log(`Message edit received from ${socket.id} for chat ${data.chatId}`);
    socket.to(`chat:${data.chatId}`).emit('message_edited', data);
  });

  socket.on('delete_message', (data) => {
    console.log(`Message delete received from ${socket.id} for chat ${data.chatId}`);
    socket.to(`chat:${data.chatId}`).emit('message_deleted', data);
  });

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(`chat:${chatId}`).emit('user_typing', {
      chatId,
      userId: socket.data.userId,
      isTyping,
    });
  });

  socket.on('add_reaction', ({ chatId, messageId, emoji, userId }) => {
    console.log(`Reaction ${emoji} added to message ${messageId} in chat ${chatId}`);
    socket.to(`chat:${chatId}`).emit('new_reaction', { chatId, messageId, emoji, userId });
  });

  socket.on('remove_reaction', ({ chatId, messageId, emoji, userId }) => {
    console.log(`Reaction ${emoji} removed from message ${messageId} in chat ${chatId}`);
    socket.to(`chat:${chatId}`).emit('reaction_removed', { chatId, messageId, emoji, userId });
  });

  socket.on('mark_messages_read', async ({ chatId, userId }) => {
    console.log(`User ${userId} marked messages in chat ${chatId} as read`);
    try {
      // Update all messages in this chat NOT sent by the user to 'read'
      await knex('chat_messages')
        .where({ chat_room_id: chatId })
        .whereNot({ sender_id: userId })
        .whereNot({ status: 'read' })
        .update({ status: 'read' });
      
      // Notify others in the room that this user has read the messages
      socket.to(`chat:${chatId}`).emit('messages_read', { chatId, readerId: userId });
    } catch (error) {
      console.error(`Error marking messages read in chat ${chatId}:`, error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
// Removed: app.use('/api/auth', turnkeyAuthRouter);
// Removed: app.use('/api/auth', adminAuthRouter);


// Start the Express server.
const PORT = parseInt(process.env.PORT || '8085', 10);
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

(async function startServer() {
  // Start server immediately for health checks - critical for App Runner
  httpServer.listen(PORT, HOST, () => {
    console.log(`Server listening on ${HOST}:${PORT}`);
    console.log(`Server started at: ${new Date().toISOString()}`);
    console.log(`Health checks available at: http://${HOST}:${PORT}/health`);
  });

  // Run async operations after server starts
  try {
    await testDbConnection();
    console.log('Initializing database schema...');
    
    // Split the multi-statement SQL into individual statements
    const isPostgres = (knex.client as any).config.client === 'pg';
    const rawSQL = isPostgres ? createTablesPostgresSQL : createTablesSQL;
    
    const statements = rawSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await knex.raw(statement);
      } catch (stmtError: any) {
        if (!stmtError.message.includes('already exists') && !stmtError.message.includes('already a column')) {
          console.error(`Error executing statement: ${statement.substring(0, 50)}...`, stmtError.message);
        }
      }
    }

    if (!isPostgres) {
      // Migration: Add public_encryption_key to users if it doesn't exist
      try {
        await knex.raw('ALTER TABLE users ADD COLUMN public_encryption_key TEXT NULL;');
        console.log('✅ Added public_encryption_key column to users table.');
      } catch (e) {}

      // Migration: Add community columns to chat_rooms if they don't exist
      try {
        await knex.raw('ALTER TABLE chat_rooms ADD COLUMN description TEXT NULL;');
        await knex.raw('ALTER TABLE chat_rooms ADD COLUMN avatar_url TEXT NULL;');
        await knex.raw('ALTER TABLE chat_rooms ADD COLUMN banner_url TEXT NULL;');
        await knex.raw('ALTER TABLE chat_rooms ADD COLUMN is_public BOOLEAN DEFAULT FALSE;');
        await knex.raw('ALTER TABLE chat_rooms ADD COLUMN creator_id TEXT NULL;');
        console.log('✅ Added community columns to chat_rooms table.');
      } catch (e) {}
      // Migration: Add community_id to posts if it doesn't exist
      try {
        await knex.raw('ALTER TABLE posts ADD COLUMN community_id VARCHAR(255) NULL;');
        console.log('✅ Added community_id column to posts table.');
      } catch (e) {}

      // Migration: Add parent_id to posts if it doesn't exist
      try {
        await knex.raw('ALTER TABLE posts ADD COLUMN parent_id CHAR(36) NULL REFERENCES posts(id) ON DELETE CASCADE;');
        console.log('✅ Added parent_id column to posts table.');
      } catch (e) {}

      // Migration: Add is_public to posts if it doesn't exist
      try {
        await knex.raw('ALTER TABLE posts ADD COLUMN is_public BOOLEAN DEFAULT FALSE;');
        console.log('✅ Added is_public column to posts table.');
      } catch (e) {}

      // Migration: Create bookmarks table if it doesn't exist (using raw SQL from schema if possible, or direct)
      try {
        await knex.raw(`
          CREATE TABLE IF NOT EXISTS bookmarks (
              id CHAR(36) PRIMARY KEY NOT NULL,
              user_id VARCHAR(255) NOT NULL,
              post_id CHAR(36) NOT NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
              UNIQUE (user_id, post_id)
          );
        `);
        console.log('✅ Ensured bookmarks table exists.');
      } catch (e) {}

    }
    
    // Global Migrations (Apply to both SQLite and Postgres)
    
    // 1. Add is_hardware_verified to users
    try {
      await knex.raw('ALTER TABLE users ADD COLUMN is_hardware_verified BOOLEAN DEFAULT FALSE;');
      console.log('✅ Added is_hardware_verified column to users table.');
    } catch (e) {}

    // 2. Add status to chat_messages
    try {
      await knex.raw("ALTER TABLE chat_messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent';");
      console.log('✅ Added status column to chat_messages table.');
    } catch (e) {}

    // 3. Create notifications table
    try {
      const idType = isPostgres ? 'UUID' : 'CHAR(36)';
      const timestampType = isPostgres ? 'TIMESTAMPTZ' : 'DATETIME';
      
      await knex.raw(`
        CREATE TABLE IF NOT EXISTS notifications (
            id ${idType} PRIMARY KEY NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            actor_id VARCHAR(255) NOT NULL,
            resource_id VARCHAR(255) NULL,
            content TEXT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at ${timestampType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      console.log('✅ Ensured notifications table exists.');
    } catch (e) {}

    // 4. Migration: Clean up double .skr extensions in users table
    try {
      await knex.raw("UPDATE users SET username = REPLACE(username, '.skr.skr', '.skr') WHERE username LIKE '%.skr.skr';");
      await knex.raw("UPDATE users SET display_name = REPLACE(display_name, '.skr.skr', '.skr') WHERE display_name LIKE '%.skr.skr';");
      console.log('✅ Cleaned up double .skr extensions in users table.');
    } catch (e) {
      console.warn('⚠️ Double .skr cleanup migration failed (likely harmless):', e.message);
    }

    console.log('✅ Database schema initialization completed.');
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('⚠️ Database setup failed, but server is running:', error);
    // Server continues running even if DB fails - important for App Runner
  }
})();
