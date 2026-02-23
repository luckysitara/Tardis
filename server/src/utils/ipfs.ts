// server/src/utils/ipfs.ts
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { PinataSDK } from 'pinata';

// Use environment variables for API keys
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

export async function uploadToIpfs(
  imagePathOrBuffer: string | Buffer,
  metadata: Record<string, any>,
): Promise<string> {
  const { default: fetch } = await import('node-fetch');
  
  // 1) Prioritize Pinata if configured
  if (process.env.PINATA_JWT) {
    console.log('[IPFS] Prioritizing Pinata upload...');
    try {
      // For social media posts/chats, we just want the image CID
      return await uploadToPinata(imagePathOrBuffer, metadata, true);
    } catch (pinataErr: any) {
      console.error('[IPFS] Pinata upload failed:', pinataErr.message);
    }
  }

  // 2) Fallback to pump.fun
  console.log('[IPFS] Attempting fallback upload to pump.fun...');
  
  let fileBuffer: Buffer;
  if (typeof imagePathOrBuffer === 'string') {
    fileBuffer = fs.readFileSync(path.resolve(imagePathOrBuffer));
  } else {
    fileBuffer = imagePathOrBuffer;
  }

  const formData = new FormData();
  formData.append('file', fileBuffer, {filename: `image-${Date.now()}.png`, contentType: 'image/png'});
  formData.append('name', metadata.name || 'Chat Image');
  formData.append('symbol', metadata.symbol || 'IMG');
  formData.append('description', metadata.description || 'Uploaded via Tardis');
  formData.append('showName', metadata.showName !== undefined ? metadata.showName.toString() : 'false');
  
  try {
    const metadataResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (metadataResponse.ok) {
      const result = await metadataResponse.json() as { metadataUri: string, image?: string };
      if (result.image) return result.image;
      if (result.metadataUri) return result.metadataUri;
    }
  } catch (err: any) {
    console.error('[IPFS] pump.fun fallback exception:', err.message);
  }

  return `https://tardis.social/fallback-image-${Date.now()}.png`;
}

/**
 * Upload image to Pinata
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

  const fileName = `image-${Date.now()}.png`;
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
      throw new Error(`Failed to upload image to Pinata: ${imageResponse.statusText}`);
    }
    
    const imageUploadData = await imageResponse.json() as { IpfsHash: string };
    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    const imageUri = `https://${gateway}/ipfs/${imageUploadData.IpfsHash}`;
    console.log('[IPFS] Image uploaded to Pinata:', imageUri);
    
    if (returnOnlyImage) {
        return imageUri;
    }

    const metadataObject = {
      name: metadata.name || '',
      symbol: metadata.symbol || '',
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
    return `https://${gateway}/ipfs/${jsonData.IpfsHash}`;
  } finally {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

export async function createLocalMetadata(metadata: any): Promise<string> {
  console.log('Creating local metadata:', metadata);
  return `https://meteora.ag/metadata/${Date.now()}.json`;
}
