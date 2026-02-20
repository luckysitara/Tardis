// File: src/index.ts
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { PublicKey } from '@solana/web3.js';
import knex from './db/knex'; // Keep knex for direct schema creation/interaction

import profileImageRouter from './routes/user/userRoutes'; // Keep profile router for user management
import postsRouter from './routes/postsRoutes'; // Add this import
import { chatRouter } from './routes/chat/chatRoutes'; // Add this import

// Removed: turnkeyAuthRouter and adminAuthRouter imports
import cors from 'cors';
import { setupConnection } from './utils/connection';
import { createTablesSQL } from './db/schema'; // Add this import


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

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(`chat:${chatId}`).emit('user_typing', {
      chatId,
      userId: socket.data.userId,
      isTyping,
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
// Removed: app.use('/api/auth', turnkeyAuthRouter);
// Removed: app.use('/api/auth', adminAuthRouter);


// Start the Express server.
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0'; // Critical for App Runner health checks

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
    const statements = createTablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await knex.raw(statement);
      } catch (stmtError: any) {
        console.error(`Error executing statement: ${statement.substring(0, 50)}...`, stmtError.message);
      }
    }

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
    
    console.log('✅ Database schema initialization completed.');
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('⚠️ Database setup failed, but server is running:', error);
    // Server continues running even if DB fails - important for App Runner
  }
})();
