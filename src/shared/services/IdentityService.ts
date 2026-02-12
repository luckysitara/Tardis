import { Connection, PublicKey } from '@solana/web3.js';
import { performReverseLookup } from '@bonfida/spl-name-service';
import { Buffer } from 'buffer';

// Ensure global Buffer is available for the SDK
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

/**
 * SNS TLD Public Keys
 * The .skr TLD is the hardware-attested registry for Solana Seeker owners.
 */
const SKR_TLD_STATE = new PublicKey('679mS9sh9AbaHquv38A67tB9KeY6fV2fGZpnd9Y7L765');

const getRpcUrl = () => {
  return process.env.HELIUS_STAKED_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
};

const connection = new Connection(getRpcUrl());

/**
 * Resolves a Solana public key to a TARDIS identity.
 * Priority: 1. .skr (Hardware Identity) -> 2. .sol (General Identity) -> 3. Abbreviation
 * * @param publicKey String representation of the wallet address
 * @returns The resolved handle or abbreviated address
 */
export async function resolveTardisIdentity(publicKey: string): Promise<string> {
  try {
    const pubkey = new PublicKey(publicKey);
    const abbreviation = `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`;

    // 1. Try to resolve .skr handle first (The Seeker Priority)
    try {
      // We explicitly pass the SKR_TLD_STATE account
      const skrDomain = await performReverseLookup(connection, pubkey, SKR_TLD_STATE);
      if (skrDomain) {
        console.log(`[Identity] Resolved .skr for ${publicKey}: ${skrDomain}.skr`);
        return `${skrDomain}.skr`;
      }
    } catch (error) {
      // Log for debugging but don't stop the flow
      console.log(`[Identity] No .skr entry for ${publicKey}`);
    }

    // 2. Fallback to .sol handle
    try {
      // Default performReverseLookup checks the .sol TLD
      const solDomain = await performReverseLookup(connection, pubkey);
      if (solDomain) {
        console.log(`[Identity] Resolved .sol for ${publicKey}: ${solDomain}.sol`);
        return `${solDomain}.sol`;
      }
    } catch (error) {
       // Gracefully handle the "buffer smaller than expected" error common in SNS
      console.log(`[Identity] No .sol entry or buffer error for ${publicKey}`);
    }

    // 3. Ultimate Fallback: Abbreviated Address
    return abbreviation;

  } catch (criticalError) {
    console.error("[Identity] Critical resolution error:", criticalError);
    return `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`;
  }
}