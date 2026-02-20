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
    public_encryption_key TEXT NULL, -- X25519 Public Key for E2EE
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id CHAR(36) PRIMARY KEY NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(255) NOT NULL,
    ciphertext TEXT NOT NULL, -- AES-GCM Encrypted content
    nonce TEXT NOT NULL,      -- Nonce used for encryption
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS chat_rooms (
    id CHAR(36) PRIMARY KEY NOT NULL,
    type VARCHAR(20) NOT NULL, -- direct, group, global
    name VARCHAR(255) NULL, -- For group chats
    description TEXT NULL,
    avatar_url VARCHAR(255) NULL,
    banner_url VARCHAR(255) NULL,
    is_public BOOLEAN DEFAULT FALSE,
    creator_id VARCHAR(255) NULL,
    meta_data TEXT NULL, -- For additional info
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_room_gates (
    id CHAR(36) PRIMARY KEY NOT NULL,
    chat_room_id CHAR(36) NOT NULL,
    gate_type VARCHAR(20) NOT NULL, -- TOKEN, NFT, GENESIS
    mint_address VARCHAR(255) NULL,
    min_balance VARCHAR(255) DEFAULT '1',
    symbol VARCHAR(50) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_participants (
    id CHAR(36) PRIMARY KEY NOT NULL,
    chat_room_id CHAR(36) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (chat_room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id CHAR(36) PRIMARY KEY NOT NULL,
    chat_room_id CHAR(36) NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255) NULL,
    additional_data TEXT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    nonce TEXT NULL, -- For E2EE (NACL box)
    is_encrypted BOOLEAN DEFAULT FALSE, -- Flag for E2EE
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(chat_room_id);
`;
