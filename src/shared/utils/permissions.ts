import { Alert, Platform } from 'react-native';
import { mediaDevices } from 'react-native-webrtc';

/**
 * Checks and requests permissions for camera and microphone.
 * Returns true if both are granted, false otherwise.
 */
export async function requestCallPermissions(isVideo: boolean = true): Promise<boolean> {
  try {
    const constraints = {
      audio: true,
      video: isVideo
    };

    // mediaDevices.getUserMedia will trigger the permission prompt in React Native
    const stream = await mediaDevices.getUserMedia(constraints);
    
    // If we got the stream, we have permission. 
    // We stop the tracks immediately because this was just a check.
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error: any) {
    console.warn('[Permissions] Permission denied or error:', error);
    
    Alert.alert(
      'Permissions Required',
      'Tardis needs access to your camera and microphone to make calls. Please enable them in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settings', onPress: () => {
          // Open settings logic would go here if needed
        }}
      ]
    );
    
    return false;
  }
}
