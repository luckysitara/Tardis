import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('posts', (table) => {
    table.uuid('community_id').nullable();
    table.foreign('community_id').references('id').inTable('chat_rooms').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('posts', (table) => {
    table.dropForeign('community_id');
    table.dropColumn('community_id');
  });
}
