import nacl from 'tweetnacl';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

/**
 * Derives a 32-byte seed from a hardware signature using SHA-256.
 * This seed is used to generate stable X25519 keypairs for E2EE.
 */
export async function deriveEncryptionSeed(signature: Uint8Array): Promise<Uint8Array> {
  const hash = await Crypto.digestUint8ArrayAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    signature
  );
  return hash;
}

/**
 * Generates an X25519 keypair from a 32-byte seed.
 */
export function getKeypairFromSeed(seed: Uint8Array): nacl.BoxKeyPair {
  return nacl.box.keyPair.fromSecretKey(seed);
}

/**
 * Encrypts a message for a recipient using their public key and our private key.
 * Returns the ciphertext and nonce as Base64 strings.
 */
export function encryptMessage(
  message: string,
  recipientPublicKeyBase64: string,
  senderPrivateKey: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = new TextEncoder().encode(message);
  const recipientPublicKey = new Uint8Array(Buffer.from(recipientPublicKeyBase64, 'base64'));

  const encrypted = nacl.box(
    messageUint8,
    nonce,
    recipientPublicKey,
    senderPrivateKey
  );

  return {
    ciphertext: Buffer.from(encrypted).toString('base64'),
    nonce: Buffer.from(nonce).toString('base64'),
  };
}

/**
 * Decrypts a message from a sender using their public key and our private key.
 */
export function decryptMessage(
  ciphertextBase64: string,
  nonceBase64: string,
  senderPublicKeyBase64: string,
  recipientPrivateKey: Uint8Array
): string | null {
  try {
    const ciphertext = new Uint8Array(Buffer.from(ciphertextBase64, 'base64'));
    const nonce = new Uint8Array(Buffer.from(nonceBase64, 'base64'));
    const senderPublicKey = new Uint8Array(Buffer.from(senderPublicKeyBase64, 'base64'));

    const decrypted = nacl.box.open(
      ciphertext,
      nonce,
      senderPublicKey,
      recipientPrivateKey
    );

    if (!decrypted) {
      return null;
    }

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return null;
  }
}
