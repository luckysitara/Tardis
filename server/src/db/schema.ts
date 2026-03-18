// File: server/src/db/schema.ts

// This file defines the database schema directly without migrations.
// It uses SQL DDL statements compatible with SQLite.

export const createTablesSQL = `
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    username VARCHAR(255) NOT NULL, -- Immutable .skr name
    display_name VARCHAR(255) NOT NULL, -- Mutable display name
    profile_picture_url VARCHAR(255) NULL,
    description TEXT NULL,
    public_encryption_key TEXT NULL, -- X25519 Public Key for E2EE
    is_hardware_verified BOOLEAN DEFAULT FALSE, -- Verified via hardware signature
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
    community_id VARCHAR(255) NULL, -- Optional: ID of the community this post belongs to
    parent_id CHAR(36) NULL, -- Optional: ID of the parent post for threads
    is_public BOOLEAN DEFAULT FALSE, -- Whether a community post is also visible in Town Hall
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id CHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    post_id CHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE (user_id, post_id)
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
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, read
    nonce TEXT NULL, -- For E2EE (NACL box)
    is_encrypted BOOLEAN DEFAULT FALSE, -- Flag for E2EE
    reply_to_id CHAR(36) NULL, -- Reference to another message
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(chat_room_id);

CREATE TABLE IF NOT EXISTS message_reactions (
    id CHAR(36) PRIMARY KEY NOT NULL,
    message_id CHAR(36) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(255) NOT NULL, -- Recipient
    type VARCHAR(50) NOT NULL, -- mention, like, repost, reply, follow
    actor_id VARCHAR(255) NOT NULL, -- Who triggered it
    resource_id VARCHAR(255) NULL, -- Post ID, Chat ID, etc.
    content TEXT NULL, -- Preview text
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follows (
    id CHAR(36) PRIMARY KEY NOT NULL,
    follower_id VARCHAR(255) NOT NULL,
    following_id VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS purchases (
    id CHAR(36) PRIMARY KEY NOT NULL,
    buyer_wallet_address VARCHAR(255) NOT NULL,
    seller_wallet_address VARCHAR(255) NOT NULL,
    post_id CHAR(36) NULL,
    product_title VARCHAR(255) NOT NULL,
    price VARCHAR(255) NOT NULL,
    token_mint VARCHAR(255) NULL,
    signature TEXT NOT NULL,
    shipping_name VARCHAR(255) NULL,
    shipping_address TEXT NULL,
    contact_info VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'completed',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
);
`;

export const createTablesPostgresSQL = `
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(255) NULL,
    description TEXT NULL,
    public_encryption_key TEXT NULL,
    is_hardware_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(255) NOT NULL,
    ciphertext TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY NOT NULL,
    author_wallet_address VARCHAR(255) NOT NULL,
    author_skr_username VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT DEFAULT '[]',
    signature TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    like_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    community_id VARCHAR(255) NULL,
    parent_id UUID NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    post_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY NOT NULL,
    post_id UUID NOT NULL,
    user_wallet_address VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (post_id, user_wallet_address)
);

CREATE TABLE IF NOT EXISTS reposts (
    id UUID PRIMARY KEY NOT NULL,
    original_post_id UUID NOT NULL,
    reposter_wallet_address VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (reposter_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (original_post_id, reposter_wallet_address)
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY NOT NULL,
    type VARCHAR(20) NOT NULL,
    name VARCHAR(255) NULL,
    description TEXT NULL,
    avatar_url VARCHAR(255) NULL,
    banner_url VARCHAR(255) NULL,
    is_public BOOLEAN DEFAULT FALSE,
    creator_id VARCHAR(255) NULL,
    meta_data TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_room_gates (
    id UUID PRIMARY KEY NOT NULL,
    chat_room_id UUID NOT NULL,
    gate_type VARCHAR(20) NOT NULL,
    mint_address VARCHAR(255) NULL,
    min_balance VARCHAR(255) DEFAULT '1',
    symbol VARCHAR(50) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID PRIMARY KEY NOT NULL,
    chat_room_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (chat_room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY NOT NULL,
    chat_room_id UUID NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255) NULL,
    additional_data TEXT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'sent',
    nonce TEXT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    reply_to_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(chat_room_id);

CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY NOT NULL,
    message_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NULL,
    content TEXT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY NOT NULL,
    follower_id VARCHAR(255) NOT NULL,
    following_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY NOT NULL,
    buyer_wallet_address VARCHAR(255) NOT NULL,
    seller_wallet_address VARCHAR(255) NOT NULL,
    post_id UUID NULL,
    product_title VARCHAR(255) NOT NULL,
    price VARCHAR(255) NOT NULL,
    token_mint VARCHAR(255) NULL,
    signature TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_wallet_address) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
);
`;
