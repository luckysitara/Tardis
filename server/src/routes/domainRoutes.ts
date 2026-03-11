import { Router, Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import * as tldParserPkg from '@onsol/tldparser';
const TldParser = (tldParserPkg as any).TldParser || (tldParserPkg as any).default?.TldParser;
import { getConnection } from '../utils/connection';

const domainRouter = Router();

// Initialize parser with the global connection
const connection = getConnection();
const parser = new TldParser(connection);

/**
 * Resolve .skr domain to wallet address
 * POST /api/resolve-domain
 * Body: { domain: string }
 */
domainRouter.post('/resolve-domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ success: false, error: 'Domain name is required' });
    }

    // Remove .skr extension if present for lookup as per reference
    const domainName = domain.toLowerCase().endsWith('.skr') 
      ? domain.slice(0, -4) 
      : domain;
    
    console.log(`[DomainLookup] Resolving domain: ${domainName}.skr`);

    // Look up domain owner
    const owner = await parser.getOwnerFromDomainTld(domainName);

    if (!owner) {
      return res.status(404).json({ success: false, error: 'Domain not found' });
    }

    return res.json({ success: true, address: owner.toBase58() });
  } catch (error: any) {
    console.error('[DomainLookup] Error resolving domain:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to resolve domain' });
  }
});

/**
 * Reverse lookup: resolve wallet address to .skr domain
 * POST /api/resolve-address
 * Body: { address: string }
 */
domainRouter.post('/resolve-address', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }

    // Validate and convert address
    const publicKey = new PublicKey(address);
    
    console.log(`[DomainLookup] Performing reverse lookup for: ${address}`);

    // Get all .skr domains owned by this address
    const domains = await parser.getParsedAllUserDomainsFromTld(publicKey, 'skr');

    if (!domains || domains.length === 0) {
      return res.status(404).json({ success: false, error: 'No .skr domain found for this address' });
    }

    // Return the first .skr domain found
    const domainName = domains[0].domain;
    return res.json({ success: true, domain: `${domainName}.skr` });
  } catch (error: any) {
    console.error('[DomainLookup] Error resolving address:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to resolve address' });
  }
});

export default domainRouter;
