import { useState } from 'react';

const SERVER_BASE_URL = 'https://seek.kikhaus.com';

interface DomainLookupResult {
  address?: string;
  domain?: string;
  error?: string;
}

export function useDomainLookup() {
  const [loading, setLoading] = useState(false);

  /**
   * Resolve .skr domain to wallet address
   * @param domain - Domain name (with or without .skr extension)
   * @returns Wallet address or error
   */
  const resolveDomain = async (domain: string): Promise<DomainLookupResult> => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/domain/resolve-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.error || 'Failed to resolve domain' };
      }

      const data = await response.json();
      return { address: data.address };
    } catch (error) {
      console.error('[useDomainLookup] Error resolving domain:', error);
      return { error: 'Network request failed' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reverse lookup: resolve wallet address to .skr domain
   * @param address - Solana wallet address (base58)
   * @returns .skr domain name or error
   */
  const resolveAddress = async (address: string): Promise<DomainLookupResult> => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/domain/resolve-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        // Silent fail for 404s as it's common for addresses not to have domains
        if (response.status === 404) {
          return { error: 'No .skr domain found' };
        }
        const error = await response.json();
        return { error: error.error || 'Failed to resolve address' };
      }

      const data = await response.json();
      return { domain: data.domain };
    } catch (error) {
      console.error('[useDomainLookup] Error resolving address:', error);
      return { error: 'Network request failed' };
    } finally {
      setLoading(false);
    }
  };

  return {
    resolveDomain,
    resolveAddress,
    loading,
  };
}
