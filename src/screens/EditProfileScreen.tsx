import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import COLORS from '@/assets/colors';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { updateUsername, updateDescription, updateProfilePicAction } from '@/shared/state/auth/reducer';
import * as ImagePicker from 'expo-image-picker';
import { uploadChatImage } from '@/core/chat/services/chatImageService';
import Icons from '@/assets/svgs';

const EditProfileScreen = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { address: userId, username, description, profilePicUrl } = useAppSelector(state => state.auth);

  const [name, setName] = useState(username || '');
  const [bio, setBio] = useState(description || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Access to gallery is required to change profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);

    try {
      // 1. Upload image if changed
      if (selectedImage) {
        const uploadedUrl = await uploadChatImage(userId, selectedImage);
        await dispatch(updateProfilePicAction({ userId, profilePicUrl: uploadedUrl })).unwrap();
      }

      // 2. Update name
      if (name !== username) {
        await dispatch(updateUsername({ userId, newUsername: name })).unwrap();
      }

      // 3. Update bio
      if (bio !== description) {
        await dispatch(updateDescription({ userId, newDescription: bio })).unwrap();
      }

      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Edit Your Profile</Text>

      <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
        <Image 
          source={{ uri: selectedImage || profilePicUrl || `https://api.dicebear.com/7.x/initials/png?seed=${username}` }} 
          style={styles.profilePic} 
        />
        <View style={styles.editOverlay}>
          <Icons.GalleryIcon width={24} height={24} color={COLORS.white} />
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor={COLORS.gray}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="Bio"
        placeholderTextColor={COLORS.gray}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={isSaving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 30,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 30,
    position: 'relative',
    borderWidth: 2,
    borderColor: COLORS.brandPrimary,
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    alignSelf: 'flex-start',
    marginLeft: '5%',
    color: COLORS.greyLight,
    marginBottom: 5,
    fontSize: 14,
  },
  input: {
    width: '90%',
    backgroundColor: COLORS.darkerBackground,
    color: COLORS.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 20,
    width: '90%',
  },
  saveButton: {
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.greyMid,
    fontSize: 16,
  }
});

export default EditProfileScreen;

