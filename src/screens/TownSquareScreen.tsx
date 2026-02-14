import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Colors } from '@/styles/theme';
import { useAppSelector } from '@/shared/hooks/useReduxHooks';
import { useTardisMobileWallet } from '@/modules/wallet-providers/hooks/useTardisMobileWallet';
import { SERVER_URL } from '@env'; // Assuming SERVER_URL is available through @env

const TownSquareScreen: React.FC = () => {
  const { username, address: author_wallet_address } = useAppSelector(state => state.auth);
  const { signMessage } = useTardisMobileWallet();

  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = useCallback(async () => {
    if (!postContent.trim()) {
      Alert.alert('Error', 'Post content cannot be empty.');
      return;
    }
    if (!username || !author_wallet_address) {
      Alert.alert('Error', 'Wallet not connected or username not found.');
      return;
    }

    setIsPosting(true);
    try {
      const timestamp = new Date().toISOString();
      // The message to be signed must precisely match what the backend expects for verification.
      // Make sure the structure here matches the `signedMessage` reconstruction in postsRoutes.ts
      const messageToSign = JSON.stringify({ content: postContent, timestamp });
      
      const signature = await signMessage(messageToSign);

      if (!signature) {
        Alert.alert('Signing Failed', 'Failed to get a signature from your wallet.');
        return;
      }

      const response = await fetch(`${SERVER_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author_wallet_address,
          author_skr_username: username,
          content: postContent,
          media_urls: [], // Placeholder for now, will implement media later
          signature,
          timestamp,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'Post created successfully!');
        setPostContent('');
        // TODO: Refresh posts list here when implemented
      } else {
        Alert.alert('Error', data.error || 'Failed to create post.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'An unexpected error occurred while creating the post.');
    } finally {
      setIsPosting(false);
    }
  }, [postContent, username, author_wallet_address, signMessage]);


  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to the Town Square!</Text>
        <Text style={styles.subtitle}>Create your hardware-signed post below.</Text>

        <TextInput
          style={styles.textInput}
          placeholder="What's on your mind?"
          placeholderTextColor={Colors.greyMid}
          multiline
          value={postContent}
          onChangeText={setPostContent}
          editable={!isPosting}
        />

        <Button
          title={isPosting ? 'Posting...' : 'Post to Town Square'}
          onPress={handlePost}
          color={Colors.sonicCyan}
          disabled={isPosting || !postContent.trim()}
        />
        {isPosting && <ActivityIndicator size="small" color={Colors.sonicCyan} style={styles.activityIndicator} />}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.deepSpace,
    padding: 20, // Add padding for better spacing
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.sonicCyan,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.greyMid,
    marginBottom: 20, // Add margin
  },
  textInput: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 8,
    padding: 10,
    color: Colors.white,
    fontSize: 16,
    textAlignVertical: 'top', // For multiline TextInput
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.sonicCyan,
  },
  activityIndicator: {
    marginTop: 10,
  }
});

export default TownSquareScreen;
