import { DEFAULT_IMAGES } from '@/shared/config/constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, Platform, ImageProps, View, Text } from 'react-native';
import COLORS from '@/assets/colors';

// Fallback public IPFS gateways for raw hashes
const PUBLIC_IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

// Track problematic IPFS hashes globally to avoid retrying failed URLs
const problematicIpfsHashes = new Set<string>();

/**
 * A React component that handles IPFS images with advanced fallback gateways
 * 
 * @param props Standard Image props plus optional defaultSource
 * @returns An Image component with enhanced IPFS handling
 */
export const IPFSAwareImage = ({
    source,
    style,
    defaultSource = DEFAULT_IMAGES.user,
    onLoad,
    onError,
    ...props
}: ImageProps & { defaultSource?: any }) => {
    const [currentSource, setCurrentSource] = useState(source);
    const [isLoading, setIsLoading] = useState(true);
    const [gatewayAttempt, setGatewayAttempt] = useState(0);
    const mountedRef = useRef(true);
    const ipfsHashRef = useRef<string | null>(null);
    const [showFallback, setShowFallback] = useState(false);

    // Extract IPFS hash when source changes
    useEffect(() => {
        const extractIpfsHash = (sourceUri: string): string | null => {
            // Case 1: ipfs://Qm...
            if (sourceUri.startsWith('ipfs://')) {
                return sourceUri.replace('ipfs://', '');
            }
            // Case 2: Direct Qm... hash
            else if (sourceUri.startsWith('Qm') && sourceUri.length > 30 && !sourceUri.includes('/')) {
                return sourceUri;
            }
            // Case 3: https://gateway.com/ipfs/Qm...
            else if (sourceUri.includes('/ipfs/')) {
                const parts = sourceUri.split('/ipfs/');
                if (parts.length > 1) {
                    return parts[1].split('?')[0]?.split('#')[0];
                }
            }
            return null;
        };

        // Reset state for new source
        setIsLoading(true);
        setGatewayAttempt(0);
        setShowFallback(false);

        // Type checking for the source
        let sourceUri = '';
        if (typeof source === 'string') {
            sourceUri = source;
        } else if (source && typeof source === 'object' && 'uri' in source) {
            sourceUri = source.uri as string;
        }

        if (sourceUri) {
            // 1. If it's a direct web URL that already works, use it AS IS first.
            // This prevents overwriting the server-provided custom gateway URL.
            if (sourceUri.startsWith('http') && !sourceUri.includes('ipfs.io')) {
                setCurrentSource(source);
                const hash = extractIpfsHash(sourceUri);
                ipfsHashRef.current = hash;
                return;
            }

            // Extract IPFS hash if present
            const hash = extractIpfsHash(sourceUri);
            ipfsHashRef.current = hash;

            // If this is a known problematic hash, go straight to fallback
            if (hash && problematicIpfsHashes.has(hash)) {
                setShowFallback(true);
                setIsLoading(false);
                return;
            }

            // If it's a raw hash or ipfs:// protocol, use our managed gateway selection
            if (hash) {
                const gateway = PUBLIC_IPFS_GATEWAYS[0];
                const finalUri = `${gateway}${hash}`;
                setCurrentSource({ uri: finalUri });
            } else {
                // For other URLs (like local file paths or non-IPFS web URLs)
                setCurrentSource(source);
            }
        } else {
            // Not a valid image source
            setShowFallback(true);
            setIsLoading(false);
        }

        return () => {
            mountedRef.current = false;
        };
    }, [source]);

    // Try next gateway when current one fails
    const tryNextGateway = useCallback(async () => {
        if (!mountedRef.current || !ipfsHashRef.current) {
          setShowFallback(true);
          setIsLoading(false);
          return;
        }

        const hash = ipfsHashRef.current;
        const nextAttempt = gatewayAttempt + 1;
        
        // If we've tried all gateways, show fallback
        if (nextAttempt >= PUBLIC_IPFS_GATEWAYS.length) {
            if (hash) {
                problematicIpfsHashes.add(hash);
            }
            setShowFallback(true);
            setIsLoading(false);
            return;
        }

        setGatewayAttempt(nextAttempt);
        const nextGateway = PUBLIC_IPFS_GATEWAYS[nextAttempt];
        const nextUrl = `${nextGateway}${hash}`;
        
        console.log(`[IPFSAwareImage] Retrying with gateway: ${nextGateway}`);

        setTimeout(() => {
            if (mountedRef.current) {
                setCurrentSource({ uri: nextUrl });
            }
        }, 50);
    }, [gatewayAttempt]);

    // Handle image load error
    const handleError = async (e: any) => {
        if (!mountedRef.current) return;

        let errorUrl = '';
        if (typeof currentSource === 'string') errorUrl = currentSource;
        else if (currentSource && typeof currentSource === 'object' && 'uri' in currentSource) errorUrl = currentSource.uri as string;

        const errorMsg = e?.nativeEvent?.error || '';
        console.log(`[IPFSAwareImage] Load error for URL: ${errorUrl}. Error: ${errorMsg}`);
        
        if (ipfsHashRef.current) {
            // For IPFS images, try next gateway immediately
            tryNextGateway();
        } else {
            // For regular images, show fallback immediately
            setShowFallback(true);
            setIsLoading(false);
        }

        if (onError) {
            onError(e);
        }
    };

    // Handle image load success
    const handleLoad = (e: any) => {
        if (!mountedRef.current) return;
        setIsLoading(false);
        if (onLoad) onLoad(e);
    };

    return (
        <View style={[
            { overflow: 'hidden', backgroundColor: COLORS.background },
            style
        ]}>
            {isLoading && !showFallback && (
                <View style={[
                    { 
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: COLORS.background 
                    }
                ]} />
            )}
            
            <Image
                source={showFallback ? defaultSource : currentSource}
                style={{ width: '100%', height: '100%' }}
                onError={handleError}
                onLoad={handleLoad}
                fadeDuration={Platform.OS === 'android' ? 0 : 150}
                {...props}
            />
        </View>
    );
};

/**
 * Convert a URL or string to a valid image source object
 */
export const getValidImageSource = (imageUrl: string | any) => {
    if (!imageUrl) return DEFAULT_IMAGES.user;

    if (typeof imageUrl !== 'string') {
        return imageUrl;
    }

    const fixedUrl = fixAllImageUrls(imageUrl);

    // If it's already a full HTTP(S) URL, use it directly
    // The server handles formatting it with the custom gateway
    if (fixedUrl.startsWith('http')) {
        return { uri: fixedUrl };
    }

    // Only if it's a raw hash or ipfs:// protocol, we format it with a public gateway
    let ipfsHash = '';
    if (fixedUrl.startsWith('ipfs://')) {
        ipfsHash = fixedUrl.replace('ipfs://', '');
    } else if (fixedUrl.startsWith('Qm') && fixedUrl.length > 30) {
        ipfsHash = fixedUrl;
    }

    if (ipfsHash) {
        return { uri: `${PUBLIC_IPFS_GATEWAYS[0]}${ipfsHash}` };
    }

    return { uri: fixedUrl };
};

/**
 * Clean up image URL strings
 */
export const fixAllImageUrls = (url: string | null | undefined): string => {
    if (!url) return '';

    // Remove extra quotes
    if (url.startsWith('"') && url.endsWith('"')) {
        url = url.slice(1, -1);
    }

    // Handle relative Arweave paths
    if (url.startsWith('/')) {
        return `https://arweave.net${url}`;
    }

    // Fix URLs without protocol
    if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('ipfs://')) {
        return `https://${url}`;
    }

    // Fix encoding issues
    if (url.includes(' ')) {
        return encodeURI(url);
    }

    return url;
};

// For backward compatibility
export const fixIPFSUrl = fixAllImageUrls;

/**
 * Utility to generate a unique key for images
 */
export const getImageKey = (baseKey: string): string => {
    return Platform.OS === 'android'
        ? `img-${baseKey}-${Date.now()}`
        : `img-${baseKey}`;
}; 
