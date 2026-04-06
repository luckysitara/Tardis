import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

describe('E2EE Calling Logic', () => {
  const aliceKeys = nacl.box.keyPair();
  const bobKeys = nacl.box.keyPair();
  const alicePubBase64 = Buffer.from(aliceKeys.publicKey).toString('base64');
  const bobPubBase64 = Buffer.from(bobKeys.publicKey).toString('base64');

  function encrypt(message: string, pub: string, priv: Uint8Array) {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const enc = nacl.box(new TextEncoder().encode(message), nonce, new Uint8Array(Buffer.from(pub, 'base64')), priv);
    return { ciphertext: Buffer.from(enc).toString('base64'), nonce: Buffer.from(nonce).toString('base64') };
  }

  function decrypt(cipher: string, nonce: string, pub: string, priv: Uint8Array) {
    const dec = nacl.box.open(new Uint8Array(Buffer.from(cipher, 'base64')), new Uint8Array(Buffer.from(nonce, 'base64')), new Uint8Array(Buffer.from(pub, 'base64')), priv);
    return dec ? new TextDecoder().decode(dec) : null;
  }

  test('should encrypt and decrypt call signaling data correctly', () => {
    const originalSdp = 'v=0\r\no=- 472839472389472 2 IN IP4 127.0.0.1';
    const encrypted = encrypt(originalSdp, bobPubBase64, aliceKeys.secretKey);
    const decrypted = decrypt(encrypted.ciphertext, encrypted.nonce, alicePubBase64, bobKeys.secretKey);
    expect(decrypted).toBe(originalSdp);
  });

  test('should fail to decrypt with wrong keys', () => {
    const encrypted = encrypt('secret', bobPubBase64, aliceKeys.secretKey);
    const decrypted = decrypt(encrypted.ciphertext, encrypted.nonce, bobPubBase64, bobKeys.secretKey);
    expect(decrypted).toBeNull();
  });
});
