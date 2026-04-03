-- ==========================================
-- TARDIS DATABASE SETUP & RLS CONFIGURATION
-- ==========================================
-- Instructions: 
-- 1. Open your Supabase Dashboard.
-- 2. Go to the SQL Editor.
-- 3. Paste this entire script and run it.
-- 4. This will create all tables, indexes, and security policies.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLE CREATION (PostgreSQL)
-- ==========================================

-- USERS TABLE
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

-- MESSAGES TABLE (Direct E2EE)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ciphertext TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- POSTS TABLE
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_wallet_address VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_skr_username VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT DEFAULT '[]',
    signature TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    like_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    community_id VARCHAR(255) NULL,
    parent_id UUID NULL REFERENCES posts(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, post_id)
);

-- LIKES TABLE
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_wallet_address VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (post_id, user_wallet_address)
);

-- REPOSTS TABLE
CREATE TABLE IF NOT EXISTS reposts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reposter_wallet_address VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (original_post_id, reposter_wallet_address)
);

-- CHAT ROOMS TABLE
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL, -- direct, group, global
    name VARCHAR(255) NULL,
    description TEXT NULL,
    avatar_url VARCHAR(255) NULL,
    banner_url VARCHAR(255) NULL,
    is_public BOOLEAN DEFAULT FALSE,
    creator_id VARCHAR(255) NULL REFERENCES users(id) ON DELETE SET NULL,
    meta_data TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CHAT ROOM GATES TABLE
CREATE TABLE IF NOT EXISTS chat_room_gates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    gate_type VARCHAR(20) NOT NULL, -- TOKEN, NFT, GENESIS
    mint_address VARCHAR(255) NULL,
    min_balance VARCHAR(255) DEFAULT '1',
    symbol VARCHAR(50) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CHAT PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (chat_room_id, user_id)
);

-- CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url VARCHAR(255) NULL,
    additional_data TEXT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'sent',
    nonce TEXT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    reply_to_id UUID NULL REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (message_id, user_id, emoji)
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id VARCHAR(255) NULL,
    content TEXT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, following_id)
);

-- PUSH TOKENS TABLE
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expo_push_token VARCHAR(500) NOT NULL UNIQUE,
    device_id VARCHAR(255) NULL,
    platform VARCHAR(20) NOT NULL,
    app_version VARCHAR(50) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_wallet_address);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);

-- ==========================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. SECURITY POLICIES (Using DO blocks for safety)
-- ==========================================

-- USERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = id);
    END IF;
END $$;

-- DIRECT MESSAGES (E2EE)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own direct messages') THEN
        CREATE POLICY "Users can view their own direct messages" ON messages 
            FOR SELECT USING (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send direct messages') THEN
        CREATE POLICY "Users can send direct messages" ON messages 
            FOR INSERT WITH CHECK (auth.uid()::text = sender_id);
    END IF;
END $$;

-- POSTS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Posts are viewable by everyone') THEN
        CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authors can manage own posts') THEN
        CREATE POLICY "Authors can manage own posts" ON posts FOR ALL USING (auth.uid()::text = author_wallet_address);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create posts') THEN
        CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid()::text = author_wallet_address);
    END IF;
END $$;

-- SOCIAL INTERACTIONS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own bookmarks') THEN
        CREATE POLICY "Users manage own bookmarks" ON bookmarks FOR ALL USING (auth.uid()::text = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own likes') THEN
        CREATE POLICY "Users manage own likes" ON likes FOR ALL USING (auth.uid()::text = user_wallet_address);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own reposts') THEN
        CREATE POLICY "Users manage own reposts" ON reposts FOR ALL USING (auth.uid()::text = reposter_wallet_address);
    END IF;
END $$;

-- CHAT ROOMS & GATES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Rooms viewable by participants or if public') THEN
        CREATE POLICY "Rooms viewable by participants or if public" ON chat_rooms 
            FOR SELECT USING (
                is_public = true OR 
                EXISTS (SELECT 1 FROM chat_participants WHERE chat_room_id = chat_rooms.id AND user_id = auth.uid()::text)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Room gates are publicly viewable') THEN
        CREATE POLICY "Room gates are publicly viewable" ON chat_room_gates FOR SELECT USING (true);
    END IF;
END $$;

-- CHAT PARTICIPANTS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants list viewable by everyone') THEN
        CREATE POLICY "Participants list viewable by everyone" ON chat_participants FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can join/leave rooms') THEN
        CREATE POLICY "Users can join/leave rooms" ON chat_participants FOR ALL USING (auth.uid()::text = user_id);
    END IF;
END $$;

-- CHAT MESSAGES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can view messages') THEN
        CREATE POLICY "Participants can view messages" ON chat_messages 
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.chat_room_id = chat_messages.chat_room_id AND chat_participants.user_id = auth.uid()::text)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send messages to joined rooms') THEN
        CREATE POLICY "Users can send messages to joined rooms" ON chat_messages 
            FOR INSERT WITH CHECK (
                auth.uid()::text = sender_id AND
                EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.chat_room_id = chat_messages.chat_room_id AND chat_participants.user_id = auth.uid()::text)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Senders can delete/edit their own messages') THEN
        CREATE POLICY "Senders can delete/edit their own messages" ON chat_messages 
            FOR UPDATE USING (auth.uid()::text = sender_id);
    END IF;
END $$;

-- MESSAGE REACTIONS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can view reactions') THEN
        CREATE POLICY "Participants can view reactions" ON message_reactions 
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM chat_messages m 
                    JOIN chat_participants p ON m.chat_room_id = p.chat_room_id 
                    WHERE m.id = message_reactions.message_id AND p.user_id = auth.uid()::text
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own reactions') THEN
        CREATE POLICY "Users manage own reactions" ON message_reactions 
            FOR ALL USING (auth.uid()::text = user_id);
    END IF;
END $$;

-- NOTIFICATIONS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own notifications') THEN
        CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own notifications') THEN
        CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id);
    END IF;
END $$;

-- FOLLOWS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Follows are public') THEN
        CREATE POLICY "Follows are public" ON follows FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own follows') THEN
        CREATE POLICY "Users manage own follows" ON follows FOR ALL USING (auth.uid()::text = follower_id);
    END IF;
END $$;

-- PUSH TOKENS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own push tokens') THEN
        CREATE POLICY "Users manage own push tokens" ON push_tokens FOR ALL USING (auth.uid()::text = user_id);
    END IF;
END $$;

-- ==========================================
-- 5. UPDATED_AT TRIGGERS
-- ==========================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_users') THEN
        CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_posts') THEN
        CREATE TRIGGER set_updated_at_posts BEFORE UPDATE ON posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_chat_rooms') THEN
        CREATE TRIGGER set_updated_at_chat_rooms BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_chat_participants') THEN
        CREATE TRIGGER set_updated_at_chat_participants BEFORE UPDATE ON chat_participants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_chat_messages') THEN
        CREATE TRIGGER set_updated_at_chat_messages BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_push_tokens') THEN
        CREATE TRIGGER set_updated_at_push_tokens BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
