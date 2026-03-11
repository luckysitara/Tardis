import { Connection, PublicKey } from '@solana/web3.js';
import { performReverseLookup } from '@bonfida/spl-name-service';
import { TldParser } from '@onsol/tldparser';
import { Buffer } from 'buffer';
import { ENDPOINTS } from '@/shared/config/constants';

// Ensure global Buffer is available for the SDK
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

const getRpcUrl = () => {
  return ENDPOINTS.helius;
};

const connection = new Connection(getRpcUrl());
const tldParser = new TldParser(connection);

/**
 * Resolves a Solana public key to a TARDIS identity.
 * Priority: 1. Manual Label (.skr) -> 2. .skr (Seeker ID via AllDomains) -> 3. .sol (General Identity via Bonfida) -> 4. Abbreviation
 * @param publicKey String representation of the wallet address
 * @param label Optional wallet label (from MWA/Seed Vault)
 * @returns The resolved handle or abbreviated address
 */
export async function resolveTardisIdentity(publicKey: string, label?: string): Promise<string> {
  try {
    const pubkey = new PublicKey(publicKey);
    const abbreviation = `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`;

    // 0. Priority: Manual Label from Wallet
    // Many Seeker users have their .skr identity set as the wallet label in MWA
    if (label) {
      const lowerLabel = label.toLowerCase().trim();
      
      // If it already has .skr, use it
      if (lowerLabel.endsWith('.skr')) {
        console.log(`[Identity] Using .skr identity from wallet label: ${lowerLabel}`);
        return lowerLabel;
      }
      
      // If it looks like a human-readable handle (not an address) and we're on Seeker, 
      // treat it as a .skr handle. Seeker labels are usually the Seeker ID.
      // We check that it's not a long hex/base58 string that looks like an address.
      if (lowerLabel.length > 0 && lowerLabel.length < 32 && !lowerLabel.includes(' ')) {
        const potentialHandle = `${lowerLabel}.skr`;
        console.log(`[Identity] Deriving .skr identity from wallet label "${lowerLabel}" -> ${potentialHandle}`);
        return potentialHandle;
      }
    }

    // 1. Try .skr (Seeker ID) lookup via AllDomains TldParser
    try {
      console.log(`[Identity] Attempting .skr resolution for ${publicKey} via AllDomains...`);
      const allDomains = await tldParser.getParsedAllUserDomains(pubkey);
      
      // Look for a domain with .skr TLD (flexible check for dot)
      const skrDomain = allDomains.find(d => d.tld && (d.tld === '.skr' || d.tld === 'skr'));
      if (skrDomain) {
        const fullSkrName = skrDomain.tld.startsWith('.') 
          ? `${skrDomain.domain}${skrDomain.tld}` 
          : `${skrDomain.domain}.${skrDomain.tld}`;
        console.log(`[Identity] Resolved .skr for ${publicKey}: ${fullSkrName}`);
        return fullSkrName;
      }
      
      // Also try getting the "Main Domain"
      const mainDomain = await tldParser.getMainDomain(pubkey);
      if (mainDomain && mainDomain.tld && (mainDomain.tld === '.skr' || mainDomain.tld === 'skr')) {
        const fullSkrName = mainDomain.tld.startsWith('.') 
          ? `${mainDomain.domain}${mainDomain.tld}` 
          : `${mainDomain.domain}.${mainDomain.tld}`;
        console.log(`[Identity] Resolved main .skr for ${publicKey}: ${fullSkrName}`);
        return fullSkrName;
      }
    } catch (error) {
      console.log(`[Identity] .skr resolution failed for ${publicKey}, trying .sol fallback`);
    }

    // 2. Fallback to .sol handle via Bonfida SNS
    try {
      const solDomain = await performReverseLookup(connection, pubkey);
      if (solDomain) {
        console.log(`[Identity] Resolved .sol for ${publicKey}: ${solDomain}.sol`);
        return `${solDomain}.sol`;
      }
    } catch (error) {
      console.log(`[Identity] No .sol entry found for ${publicKey}`);
    }

    // 3. Ultimate Fallback: Abbreviated Address
    return abbreviation;

  } catch (criticalError) {
    console.error("[Identity] Critical resolution error:", criticalError);
    return `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`;
  }
}