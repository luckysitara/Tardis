// File: server/src/utils/solana.ts
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

/**
 * Verifies a message signed by a Solana wallet.
 * This utility function is crucial for ensuring the authenticity of hardware-signed posts.
 *
 * @param message The original message (e.g., post content + timestamp) that was signed.
 * @param signature The base64-encoded signature provided by the wallet.
 * @param publicKey The base58-encoded public key of the signer.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageUint8 = new TextEncoder().encode(message);
    const signatureUint8 = Buffer.from(signature, 'base64');
    const publicKeyUint8 = new PublicKey(publicKey).toBuffer();

    // Verify the signature
    return nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
  } catch (error) {
    console.error('[SolanaUtils] Error verifying signature:', error);
    return false;
  }
}
