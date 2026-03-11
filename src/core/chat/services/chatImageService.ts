/**
 * Chat image service for uploading images to IPFS
 */
import axios from 'axios';
import { SERVER_URL } from '@env';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Uploads a chat image to IPFS
 * 
 * @param userId - User ID for tracking the upload
 * @param imageUri - Local URI of the image to upload
 * @returns Promise that resolves to the IPFS URL of the uploaded image
 */
export async function uploadChatImage(userId: string, imageUri: string): Promise<string> {
  console.log(`[uploadChatImage] Initiating upload for user ${userId}, uri: ${imageUri}`);
  try {
    const formData = new FormData();
    
    const fileName = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(fileName);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // Important: React Native FormData needs an object with uri, name, type
    // and uri should have file:// prefix on most versions
    const photo = {
      uri: imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`,
      name: fileName,
      type: type,
    };

    // @ts-ignore
    formData.append('chatImage', photo);
    formData.append('userId', userId);

    const finalServerUrl = 'https://seek.kikhaus.com';
    console.log(`[uploadChatImage] FORCING request to ${finalServerUrl}/api/chat/images/upload`);

    const response = await fetch(`${finalServerUrl}/api/chat/images/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
    console.log(`[uploadChatImage] Server response:`, result);

    if (result && result.success && result.url) {
      return result.url;
    } else {
      throw new Error(result.error || 'Failed to get image URL from server');
    }
  } catch (error: any) {
    console.error('[uploadChatImage] Error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
} 
 