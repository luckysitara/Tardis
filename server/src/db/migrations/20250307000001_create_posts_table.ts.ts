import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create the "posts" table.
  await knex.schema.createTable('posts', table => {
    table.uuid('id').primary();
    // For threaded posts, parent_id references posts.id.
    table
      .uuid('parent_id')
      .nullable()
      .references('id')
      .inTable('posts')
      .onDelete('CASCADE');
    // Store only the user_id (must exist in the users table).
    table
      .string('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    // Store post content as JSON.
    table.json('sections').notNullable().defaultTo('[]');
    // Interaction counters.
    table.integer('reaction_count').defaultTo(0);
    table.integer('retweet_count').defaultTo(0);
    table.integer('quote_count').defaultTo(0);
    // Detailed reactions stored as JSON (e.g. { "👍": 5 }).
    table.json('reactions').notNullable().defaultTo('{}');
    // If the post is a retweet, retweet_of references another post.
    table
      .uuid('retweet_of')
      .nullable()
      .references('id')
      .inTable('posts')
      .onDelete('CASCADE');
    // Timestamp for when the post was created.
    table.datetime('created_at').defaultTo(knex.raw('CURRENT_TIMESTAMP'));
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('posts');
}
