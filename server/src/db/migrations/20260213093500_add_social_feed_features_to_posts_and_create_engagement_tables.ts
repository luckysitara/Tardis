// server/src/db/migrations/20260213093500_add_social_feed_features_to_posts_and_create_engagement_tables.ts

import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    // Add signature column to the posts table
    await knex.schema.alterTable('posts', table => {
        table.string('signature').nullable(); // MWA signature of the post content
    });

    // Create a new 'likes' table
    await knex.schema.createTable('likes', table => {
        table.uuid('id').primary();
        table.uuid('post_id')
             .notNullable()
             .references('id')
             .inTable('posts')
             .onDelete('CASCADE');
        table.string('user_id')
             .notNullable()
             .references('id')
             .inTable('users')
             .onDelete('CASCADE');
        table.string('signature').notNullable(); // MWA signature of the like action
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

        // Ensure a user can only like a post once
        table.unique(['post_id', 'user_id']);
    });

    // Create a new 'reposts' table
    await knex.schema.createTable('reposts', table => {
        table.uuid('id').primary();
        table.uuid('post_id') // The post being reposted
             .notNullable()
             .references('id')
             .inTable('posts')
             .onDelete('CASCADE');
        table.string('user_id')
             .notNullable()
             .references('id')
             .inTable('users')
             .onDelete('CASCADE');
        table.uuid('original_post_id') // ID of the original post (if this is a quote repost)
             .nullable()
             .references('id')
             .inTable('posts')
             .onDelete('CASCADE');
        table.string('signature').notNullable(); // MWA signature of the repost action
        table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

        // Optional: Ensure a user can only repost a post once, or allow multiple quote reposts.
        // For simplicity, let's assume a user can only repost a given post once.
        table.unique(['post_id', 'user_id']);
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('reposts');
    await knex.schema.dropTableIfExists('likes');
    
    // Drop the signature column from posts table
    await knex.schema.alterTable('posts', table => {
        table.dropColumn('signature');
    });
}
