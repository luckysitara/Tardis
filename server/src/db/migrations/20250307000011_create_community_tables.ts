import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Update chat_rooms with community metadata
  await knex.schema.table('chat_rooms', (table) => {
    table.text('description').nullable();
    table.string('avatar_url').nullable();
    table.string('banner_url').nullable();
    table.boolean('is_public').defaultTo(false);
    table.string('creator_id').nullable().references('id').inTable('users');
  });

  // 2. Create chat_room_gates table
  await knex.schema.createTable('chat_room_gates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('chat_room_id').notNullable().references('id').inTable('chat_rooms').onDelete('CASCADE');
    table.enum('gate_type', ['TOKEN', 'NFT', 'GENESIS']).notNullable();
    table.string('mint_address').nullable(); // For TOKEN/NFT
    table.string('min_balance').defaultTo('1'); // For TOKEN (as string to avoid precision loss)
    table.string('symbol').nullable(); // Optional display symbol
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chat_room_gates');
  await knex.schema.table('chat_rooms', (table) => {
    table.dropColumn('description');
    table.dropColumn('avatar_url');
    table.dropColumn('banner_url');
    table.dropColumn('is_public');
    table.dropColumn('creator_id');
  });
}
