// File: server/src/db/schema.ts

// This file defines the database schema directly without migrations.
// It uses SQL DDL statements compatible with SQLite.

export const createTablesSQL = `
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    username VARCHAR(255) NOT NULL,
    handle VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(255) NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id CHAR(36) PRIMARY KEY NOT NULL, -- UUID for posts
    author_wallet_address VARCHAR(255) NOT NULL,
    author_skr_username VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT DEFAULT '[]', -- Store as stringified JSON array
    signature TEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    like_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_wallet_address) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
    id CHAR(36) PRIMARY KEY NOT NULL, -- UUID for likes
    post_id CHAR(36) NOT NULL,
    user_wallet_address VARCHAR(255) NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (post_id, user_wallet_address) -- A user can only like a post once
);

CREATE TABLE IF NOT EXISTS reposts (
    id CHAR(36) PRIMARY KEY NOT NULL, -- UUID for reposts
    original_post_id CHAR(36) NOT NULL,
    reposter_wallet_address VARCHAR(255) NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (reposter_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (original_post_id, reposter_wallet_address) -- A user can only repost an original post once
);
`;
