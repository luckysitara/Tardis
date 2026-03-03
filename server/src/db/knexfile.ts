import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Knex } from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use Knex.Config type (might need adjustment if default import changes things)
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './db.sqlite', // SQLite database file
    },
    useNullAsDefault: true, // Recommended for SQLite with Knex
    migrations: {
      directory: './src/db/migrations', 
    },
  },
  supabase: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false } // Required for Supabase
    },
    migrations: {
      directory: './src/db/migrations',
    },
    pool: {
      min: 2,
      max: 10
    }
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: path.resolve(__dirname, '../../db.sqlite'), // Relative to compiled output
    },
    useNullAsDefault: true, // Recommended for SQLite with Knex
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    pool: { min: 1, max: 1 }, // SQLite generally doesn't need a connection pool, or a small one.
  },
};

export default config;
