// File: src/index.ts
import express, { Request, Response } from 'express';

import { PublicKey } from '@solana/web3.js';
import knex from './db/knex'; // Keep knex for direct schema creation/interaction

import profileImageRouter from './routes/user/userRoutes'; // Keep profile router for user management
import postsRouter from './routes/postsRoutes'; // Add this import

// Removed: turnkeyAuthRouter and adminAuthRouter imports
import cors from 'cors';
import { setupConnection } from './utils/connection';
import { createTablesSQL } from './db/schema'; // Add this import


const app = express();
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
// Removed: app.use('/api/auth', turnkeyAuthRouter);
// Removed: app.use('/api/auth', adminAuthRouter);


// Start the Express server.
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0'; // Critical for App Runner health checks

(async function startServer() {
  // Start server immediately for health checks - critical for App Runner
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on ${HOST}:${PORT}`);
    console.log(`Server started at: ${new Date().toISOString()}`);
    console.log(`Health checks available at: http://${HOST}:${PORT}/health`);
  });

  // Run async operations after server starts
  try {
    await testDbConnection();
    console.log('Initializing database schema...');
    await knex.raw(createTablesSQL);
    console.log('✅ Database schema initialized successfully (or already existed).');

    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('⚠️ Database setup failed, but server is running:', error);
    // Server continues running even if DB fails - important for App Runner
  }
})();
