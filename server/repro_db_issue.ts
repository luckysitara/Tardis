
import Knex from 'knex';
import * as path from 'path';

const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: './db.sqlite',
  },
  useNullAsDefault: true,
});

async function test() {
  try {
    console.log('Testing insert into users...');
    await knex('users').insert({
      id: 'repro_id_' + Date.now(),
      username: 'repro_user',
      display_name: 'Repro User',
      created_at: new Date(),
      updated_at: new Date()
    }).onConflict('id').ignore();
    console.log('Insert succeeded!');
  } catch (error) {
    console.error('Insert failed:', error);
  } finally {
    await knex.destroy();
  }
}

test();
