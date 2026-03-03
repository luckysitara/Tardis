// server/src/utils/ipfs.ts
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { PinataSDK } from 'pinata';

/**
 * Uploads an image to IPFS using Pinata exclusively.
 */
export async function uploadToIpfs(
  imagePathOrBuffer: string | Buffer,
  metadata: Record<string, any>,
): Promise<string> {
  const { default: fetch } = await import('node-fetch');
  
  if (!process.env.PINATA_JWT) {
    console.error('[IPFS] CRITICAL: PINATA_JWT is not configured in .env');
    throw new Error('IPFS upload failed: Pinata credentials missing on server.');
  }

  console.log('[IPFS] Uploading to Pinata...');
  try {
    // For social media and chat, we upload the file and return the direct CID URL
    return await uploadToPinata(imagePathOrBuffer, metadata, true);
  } catch (error: any) {
    console.error('[IPFS] Pinata upload failed:', error.message);
    throw error;
  }
}

/**
 * Low-level Pinata upload function
 */
export async function uploadToPinata(
  imagePathOrBuffer: string | Buffer,
  metadata: Record<string, any>,
  returnOnlyImage: boolean = false
): Promise<string> {
  const { default: fetch } = await import('node-fetch');

  let fileBuffer: Buffer;
  if (typeof imagePathOrBuffer === 'string') {
    fileBuffer = fs.readFileSync(path.resolve(imagePathOrBuffer));
  } else {
    fileBuffer = imagePathOrBuffer;
  }

  const fileName = `tardis-${Date.now()}.png`;
  const tempFilePath = path.join(process.cwd(), fileName);
  fs.writeFileSync(tempFilePath, fileBuffer);
  
  try {
    const formData = new FormData();
    const readStream = fs.createReadStream(tempFilePath);
    formData.append('file', readStream, { filename: fileName });
    
    const imageResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      body: formData,
    });
    
    if (!imageResponse.ok) {
      const errorDetail = await imageResponse.text();
      throw new Error(`Pinata API Error: ${imageResponse.status} - ${errorDetail}`);
    }
    
    const imageUploadData = await imageResponse.json() as { IpfsHash: string };
    const gateway = process.env.PINATA_GATEWAY;
    if (!gateway) {
      console.error('[IPFS] CRITICAL: PINATA_GATEWAY is not configured in .env');
      throw new Error('IPFS upload failed: PINATA_GATEWAY missing on server.');
    }
    const imageUri = `https://${gateway}/ipfs/${imageUploadData.IpfsHash}`;
    
    console.log('[IPFS] Successfully pinned to Pinata:', imageUri);
    
    if (returnOnlyImage) {
        return imageUri;
    }

    // Optional: Pin metadata JSON if this were for a token/NFT
    const metadataObject = {
      name: metadata.name || 'Tardis Media',
      symbol: metadata.symbol || 'TRDS',
      description: metadata.description || '',
      image: imageUri,
      showName: metadata.showName !== undefined ? metadata.showName : true,
    };
    
    const jsonResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      body: JSON.stringify(metadataObject)
    });
    
    if (!jsonResponse.ok) return imageUri;
    
    const jsonData = await jsonResponse.json() as { IpfsHash: string };
    // Reuse the already declared 'gateway' variable
    return `https://${gateway}/ipfs/${jsonData.IpfsHash}`;
  } finally {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

export async function createLocalMetadata(metadata: any): Promise<string> {
  console.log('Creating local metadata:', metadata);
  return `https://tardis.social/metadata/${Date.now()}.json`;
}
