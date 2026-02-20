/**
 * File: migrations/20250307000010_add_e2ee_to_chat_messages.ts
 * 
 * Migration to add E2EE columns to chat_messages table
 */
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('chat_messages', (table) => {
    table.text('nonce').nullable(); // Nonce for NACL encryption
    table.boolean('is_encrypted').defaultTo(false); // Flag for E2EE
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('chat_messages', (table) => {
    table.dropColumn('nonce');
    table.dropColumn('is_encrypted');
  });
}
