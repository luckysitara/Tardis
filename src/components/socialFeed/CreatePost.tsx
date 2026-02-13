// src/components/socialFeed/CreatePost.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { createPost } from '@/shared/state/socialFeed/slice';
import { Colors } from '@/styles/theme';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet'; // Import useWallet
import * as base58 from 'bs58'; // For base58 encoding of the signature

const CreatePost: React.FC = () => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<string[]>([]); // Placeholder for media URLs
  const dispatch = useAppDispatch();
  const navigation = useAppNavigation();
  const { connected, address, signMessage, isMWA } = useWallet(); // Get wallet state and signing function
  const loading = useAppSelector(state => state.socialFeed.loading === 'pending');
  const [isSigning, setIsSigning] = useState(false);

  const handlePost = async () => {
    if (!connected || !address) {
      Alert.alert('Error', 'No wallet connected. Please connect your wallet to create a post.');
      return;
    }
    if (content.trim() === '') {
      Alert.alert('Error', 'Post content cannot be empty.');
      return;
    }

    setIsSigning(true);
    let signatureString: string | undefined;
    try {
      // Ensure TextEncoder is available in the environment (React Native often requires polyfills)
      const encoder = new TextEncoder();
      const message = encoder.encode(content); // Convert string to Uint8Array
      const signature = await signMessage(message); // Sign the message
      signatureString = base58.encode(signature); // Encode signature to base58 for storage
      
      console.log('Post content signed successfully:', signatureString);
    } catch (error: any) {
      Alert.alert('Signing Failed', `Could not sign your post: ${error.message || 'Unknown error'}`);
      setIsSigning(false);
      return;
    }

    try {
      await dispatch(createPost({ userId: address, content, media, signature: signatureString })).unwrap();
      Alert.alert('Success', 'Post created successfully!');
      setContent('');
      setMedia([]);
      navigation.goBack(); // Go back after posting, assuming it's a modal
    } catch (error: any) {
      Alert.alert('Error', `Failed to create post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Post</Text>
        <TouchableOpacity onPress={handlePost} style={styles.postButton} disabled={loading || isSigning || !connected}>
          {loading || isSigning ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.postButtonText}>Sign & Post</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        {!connected && (
          <Text style={styles.warningText}>Please connect your wallet to create a post.</Text>
        )}
        <TextInput
          style={styles.textInput}
          placeholder="What's happening in the Town Square?"
          placeholderTextColor={Colors.gray}
          multiline
          value={content}
          onChangeText={setContent}
          maxLength={280} // X-like character limit
          editable={!loading && !isSigning && connected}
        />
        {/* Placeholder for media upload */}
        <TouchableOpacity style={styles.mediaUploadButton} disabled={!connected}>
          <Text style={styles.mediaUploadButtonText}>Add Media (Coming Soon)</Text>
        </TouchableOpacity>
        {isMWA() && (
          <Text style={styles.mwaIndicatorText}>Using Solana Seeker (MWA) for signing.</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.deepSpace,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray + '30',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  cancelButton: {
    padding: 5,
  },
  cancelButtonText: {
    color: Colors.gray,
    fontSize: 16,
  },
  postButton: {
    backgroundColor: Colors.tardisBlue,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100, // Ensure button size consistency during loading
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 15,
  },
  warningText: {
    color: Colors.red,
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  mwaIndicatorText: {
    color: Colors.sonicCyan,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    color: Colors.white,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: Colors.deepSpace,
    borderRadius: 10,
    padding: 10,
    borderColor: Colors.tardisBlue + '50',
    borderWidth: 1,
  },
  mediaUploadButton: {
    backgroundColor: Colors.deepSpace,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray + '50',
    alignItems: 'center',
  },
  mediaUploadButtonText: {
    color: Colors.gray,
    fontSize: 16,
  },
});

export default CreatePost;
