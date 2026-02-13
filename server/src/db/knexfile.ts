import * as path from 'path';
import type { Knex } from 'knex';
import dotenv from 'dotenv';
dotenv.config();

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
