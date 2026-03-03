import { fixAllImageUrls } from '../IPFSImage';

export function fixImageUrl(url: string): string {
  return fixAllImageUrls(url);
}

/**
 * Extract the best available image URL from the Helius API asset response
 * This function handles various response formats from the Helius DAS API
 */
export function extractAssetImage(asset: any): string {
  if (!asset) return '';
  
  // Debug log to help troubleshoot
  // console.log('Extracting image from asset:', JSON.stringify(asset, null, 2));
  
  // Try to find the image in the most common locations
  const possibleImageSources = [
    // Direct image property
    asset.image,
    
    // Links section (most common for tokens)
    asset.content?.links?.image,
    
    // CDN or direct URI from files array (often has best quality)
    ...(asset.content?.files || [])
      .filter((file: any) => file?.cdn_uri || file?.uri)
      .map((file: any) => file.cdn_uri || file.uri),
    
    // First file URI or CDN URI
    asset.content?.files?.[0]?.cdn_uri,
    asset.content?.files?.[0]?.uri,
    
    // Metadata image (common for NFTs)
    asset.content?.metadata?.image,
    
    // Check all files for image types
    ...(asset.content?.files || [])
      .filter((file: any) => 
        file.mime?.startsWith('image/') || 
        file.uri?.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ||
        file.cdn_uri?.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)
      )
      .map((file: any) => file.cdn_uri || file.uri),
      
    // Try JSON_URI converted to Arweave for NFTs
    asset.content?.json_uri?.replace('ar://', 'https://arweave.net/'),
  ];
  
  // Return the first valid image URL we find
  for (const source of possibleImageSources) {
    if (source && typeof source === 'string') {
      return fixImageUrl(source);
    }
  }
  
  // If we got this far without finding an image, special case handling
  
  // For tokens with a known symbol, we can try commonly known token images
  if (asset.token_info?.symbol || asset.symbol) {
    const symbol = (asset.token_info?.symbol || asset.symbol).toLowerCase();
    if (symbol === 'sol') {
      return 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png';
    }
    if (symbol === 'usdc') {
      return 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'; 
    }
    // Add more known tokens here if needed
  }
  
  return '';
}
