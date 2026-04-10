/**
 * Chat image service for uploading images to IPFS
 */
import axios from 'axios';
import { SERVER_BASE_URL } from '@/shared/config/server';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compresses an image before upload
 */
async function compressImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.warn('[uploadChatImage] Compression failed, using original:', error);
    return uri;
  }
}

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
    // Compress image first to avoid large payloads failing on mobile networks
    const compressedUri = await compressImage(imageUri);
    
    const formData = new FormData();
    
    const fileName = compressedUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(fileName);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    const photo = {
      uri: compressedUri,
      name: fileName,
      type: type,
    };

    // @ts-ignore
    formData.append('chatImage', photo);
    formData.append('userId', userId);

    // Use SERVER_BASE_URL from shared config
    const targetServerUrl = SERVER_BASE_URL;
    console.log(`[uploadChatImage] Sending request to ${targetServerUrl}/api/chat/images/upload`);

    const response = await fetch(`${targetServerUrl}/api/chat/images/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
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
 