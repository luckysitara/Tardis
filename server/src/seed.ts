import knex from './db/knex';
import { v4 as uuidv4 } from 'uuid';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

async function seed() {
  const myAddress = '2ggoPe4b9KFQQ5hghks3S9QWYdbSsGq1sJFscVNva5ZM';
  console.log('🌱 Refreshing test environment for:', myAddress);
  
  // 1. Generate stable keys for test users (so they stay the same across seeds)
  // In a real seed we might want hardcoded ones, but let's just generate fresh pairs for now
  const roseKeypair = nacl.box.keyPair();
  const jackKeypair = nacl.box.keyPair();
  
  const rosePublicKey = Buffer.from(roseKeypair.publicKey).toString('base64');
  const jackPublicKey = Buffer.from(jackKeypair.publicKey).toString('base64');

  const testUsers = [
    {
      id: 'SeekeR1111111111111111111111111111111111111',
      username: 'Rose Tyler',
      handle: 'rose.skr',
      description: 'The Bad Wolf.',
      public_encryption_key: rosePublicKey,
      keypair: roseKeypair // Store locally for encryption
    },
    {
      id: 'SeekeR2222222222222222222222222222222222222',
      username: 'Captain Jack',
      handle: 'jack.skr',
      description: 'Face of Boe.',
      public_encryption_key: jackPublicKey,
      keypair: jackKeypair // Store locally for encryption
    }
  ];

  try {
    // 2. Fetch User's Registered Public Key from DB
    const me = await knex('users').whereRaw('LOWER(id) = LOWER(?)', [myAddress]).first();
    const myRealPublicKey = me?.public_encryption_key;
    
    if (!myRealPublicKey) {
      console.warn('⚠️  Your public key is NOT registered in the DB yet. Login first, then re-seed for E2EE testing.');
    } else {
      console.log('🔗 Found your public key:', myRealPublicKey.substring(0, 10) + '...');
    }

    // 3. Ensure test users exist
    for (const testUser of testUsers) {
      const { keypair, ...userData } = testUser;
      const existing = await knex('users').whereRaw('LOWER(id) = LOWER(?)', [testUser.id]).first();
      if (!existing) {
        await knex('users').insert({ ...userData, created_at: new Date(), updated_at: new Date() });
      } else {
        await knex('users').whereRaw('LOWER(id) = LOWER(?)', [testUser.id]).update({
          public_encryption_key: testUser.public_encryption_key,
          updated_at: new Date()
        });
      }
    }

    // 4. Create/Update Chat Rooms
    for (const remoteUser of testUsers) {
      let chatRoom = await knex('chat_rooms')
        .join('chat_participants as p1', 'chat_rooms.id', 'p1.chat_room_id')
        .join('chat_participants as p2', 'chat_rooms.id', 'p2.chat_room_id')
        .whereRaw('LOWER(p1.user_id) = LOWER(?)', [myAddress])
        .whereRaw('LOWER(p2.user_id) = LOWER(?)', [remoteUser.id])
        .first('chat_rooms.*');

      let roomId;
      if (!chatRoom) {
        roomId = uuidv4();
        await knex('chat_rooms').insert({
          id: roomId,
          type: 'direct',
          created_at: new Date(),
          updated_at: new Date()
        });
        
        await knex('chat_participants').insert([
          { id: uuidv4(), chat_room_id: roomId, user_id: myAddress },
          { id: uuidv4(), chat_room_id: roomId, user_id: remoteUser.id }
        ]);
      } else {
        roomId = chatRoom.id;
      }

      await knex('chat_messages').where({ chat_room_id: roomId }).delete();
      
      const welcomeMsg = `Hello! This is a secure channel between us.`;
      const encryptedMsgText = `TARDIS ACCESS GRANTED: This transmission is 100% hardware-encrypted.`;
      
      let finalEncryptedContent = encryptedMsgText;
      let nonceBase64 = null;
      let isEncrypted = false;

      if (myRealPublicKey) {
        try {
          const userPK = new Uint8Array(Buffer.from(myRealPublicKey, 'base64'));
          const nonce = nacl.randomBytes(nacl.box.nonceLength);
          const messageUint8 = new TextEncoder().encode(encryptedMsgText);
          
          const encrypted = nacl.box(
            messageUint8,
            nonce,
            userPK,
            remoteUser.keypair.secretKey
          );
          
          finalEncryptedContent = Buffer.from(encrypted).toString('base64');
          nonceBase64 = Buffer.from(nonce).toString('base64');
          isEncrypted = true;
        } catch (err) {
          console.error('Encryption failed in seed:', err);
        }
      }

      const messages = [
        {
          id: uuidv4(),
          chat_room_id: roomId,
          sender_id: remoteUser.id,
          content: welcomeMsg,
          is_encrypted: false,
          created_at: new Date(Date.now() - 1000 * 60 * 5)
        },
        {
          id: uuidv4(),
          chat_room_id: roomId,
          sender_id: remoteUser.id,
          content: finalEncryptedContent,
          is_encrypted: isEncrypted,
          nonce: nonceBase64,
          created_at: new Date()
        }
      ];
      
      await knex('chat_messages').insert(messages);
      console.log(`✅ Refreshed Secure Bridge with ${remoteUser.username} (${isEncrypted ? 'Encrypted' : 'Plain Text'})`);
    }

    console.log('✅ Environment refreshed! Restart/Reload the app to see changes.');
  } catch (error) {
    console.error('❌ Refresh failed:', error);
  } finally {
    process.exit(0);
  }
}

seed();
