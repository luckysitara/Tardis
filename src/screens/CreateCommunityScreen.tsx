import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { createCommunity, fetchCommunities } from '@/shared/state/community/slice';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadChatImage } from '@/core/chat/services/chatImageService';

type CreateCommunityScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CreateCommunityScreen'
>;

interface GateInput {
  type: 'TOKEN' | 'NFT' | 'GENESIS';
  mintAddress: string;
  minBalance: string;
  symbol?: string;
}

const CreateCommunityScreen = () => {
  const navigation = useNavigation<CreateCommunityScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.community);
  const creatorId = useAppSelector(state => state.auth.address);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [gates, setGates] = useState<GateInput[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async (type: 'avatar' | 'banner') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your gallery to pick an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (type === 'avatar') {
          setSelectedAvatar(result.assets[0].uri);
        } else {
          setSelectedBanner(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick an image');
    }
  };

  const handleAddGate = () => {
    setGates([...gates, { type: 'TOKEN', mintAddress: '', minBalance: '', symbol: '' }]);
  };

  const handleRemoveGate = (index: number) => {
    const newGates = gates.filter((_, i) => i !== index);
    setGates(newGates);
  };

  const handleGateChange = (index: number, field: keyof GateInput, value: string) => {
    const newGates = [...gates];
    (newGates[index][field] as any) = value;
    setGates(newGates);
  };

  const handleSubmit = async () => {
    if (!name || !creatorId) {
      Alert.alert('Error', 'Community name and creator are required.');
      return;
    }

    setIsUploading(true);
    try {
      let avatarUrl = '';
      let bannerUrl = '';

      // 1. Upload Avatar if selected
      if (selectedAvatar) {
        try {
          avatarUrl = await uploadChatImage(creatorId, selectedAvatar);
        } catch (uploadError) {
          console.error("Avatar upload error:", uploadError);
          Alert.alert("Upload Error", "Failed to upload avatar.");
          setIsUploading(false);
          return;
        }
      }

      // 2. Upload Banner if selected
      if (selectedBanner) {
        try {
          bannerUrl = await uploadChatImage(creatorId, selectedBanner);
        } catch (uploadError) {
          console.error("Banner upload error:", uploadError);
          Alert.alert("Upload Error", "Failed to upload banner.");
          setIsUploading(false);
          return;
        }
      }

      await dispatch(createCommunity({
        name,
        description,
        avatarUrl,
        bannerUrl,
        isPublic,
        creatorId,
        gates: gates.map(gate => ({
          ...gate,
          minBalance: gate.minBalance || '1',
        })),
      })).unwrap();
      Alert.alert('Success', 'Community created successfully!');
      dispatch(fetchCommunities());
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to create community.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icons.ArrowLeftIcon width={24} height={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Community</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.label}>Community Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Solana Devs"
        placeholderTextColor={COLORS.greyMid}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="A brief description of your community"
        placeholderTextColor={COLORS.greyMid}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Community Avatar</Text>
      <TouchableOpacity 
        style={styles.imagePickerPlaceholder} 
        onPress={() => pickImage('avatar')}
      >
        {selectedAvatar ? (
          <Image source={{ uri: selectedAvatar }} style={styles.previewAvatar} />
        ) : (
          <View style={styles.placeholderInner}>
            <Icons.GalleryIcon width={32} height={32} color={COLORS.greyMid} />
            <Text style={styles.placeholderText}>Select Avatar</Text>
          </View>
        )}
      </TouchableOpacity>
      {selectedAvatar && (
        <TouchableOpacity onPress={() => setSelectedAvatar(null)}>
          <Text style={styles.removeText}>Remove Avatar</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Community Banner</Text>
      <TouchableOpacity 
        style={[styles.imagePickerPlaceholder, styles.bannerPlaceholder]} 
        onPress={() => pickImage('banner')}
      >
        {selectedBanner ? (
          <Image source={{ uri: selectedBanner }} style={styles.previewBanner} />
        ) : (
          <View style={styles.placeholderInner}>
            <Icons.GalleryIcon width={32} height={32} color={COLORS.greyMid} />
            <Text style={styles.placeholderText}>Select Banner</Text>
          </View>
        )}
      </TouchableOpacity>
      {selectedBanner && (
        <TouchableOpacity onPress={() => setSelectedBanner(null)}>
          <Text style={styles.removeText}>Remove Banner</Text>
        </TouchableOpacity>
      )}

      <View style={styles.switchContainer}>
        <Text style={styles.label}>Public Community</Text>
        <Switch
          trackColor={{ false: COLORS.greyDark, true: COLORS.brandPrimary }}
          thumbColor={COLORS.white}
          ios_backgroundColor={COLORS.greyDark}
          onValueChange={setIsPublic}
          value={isPublic}
        />
      </View>

      <View style={styles.gatesSection}>
        <View style={styles.gatesHeader}>
          <Text style={styles.label}>Gating Requirements</Text>
          <Button title="Add Gate" onPress={handleAddGate} color={COLORS.brandSecondary} />
        </View>
        {gates.map((gate, index) => (
          <View key={index} style={styles.gateItem}>
            <View style={styles.gateRow}>
              <Text style={styles.gateLabel}>Type:</Text>
              <Picker
                selectedValue={gate.type}
                style={styles.picker}
                onValueChange={(itemValue) => handleGateChange(index, 'type', itemValue as any)}
                itemStyle={styles.pickerItem}
                dropdownIconColor={COLORS.white}
              >
                <Picker.Item label="Token" value="TOKEN" />
                <Picker.Item label="NFT" value="NFT" />
                <Picker.Item label="Genesis" value="GENESIS" />
              </Picker>
            </View>

            {!!(gate.type === 'TOKEN' || gate.type === 'NFT') && (
              <View>
                <Text style={styles.gateLabel}>Mint Address:</Text>
                <TextInput
                  style={styles.gateInput}
                  placeholder="e.g., 9xQeWvE8"
                  placeholderTextColor={COLORS.greyMid}
                  value={gate.mintAddress}
                  onChangeText={(text) => handleGateChange(index, 'mintAddress', text)}
                />
              </View>
            )}

            {!!(gate.type === 'TOKEN') && (
              <View>
                <Text style={styles.gateLabel}>Minimum Balance:</Text>
                <TextInput
                  style={styles.gateInput}
                  placeholder="e.g., 100"
                  placeholderTextColor={COLORS.greyMid}
                  value={gate.minBalance}
                  onChangeText={(text) => handleGateChange(index, 'minBalance', text)}
                  keyboardType="numeric"
                />
                <Text style={styles.gateLabel}>Symbol (Optional):</Text>
                <TextInput
                  style={styles.gateInput}
                  placeholder="e.g., USDT"
                  placeholderTextColor={COLORS.greyMid}
                  value={gate.symbol}
                  onChangeText={(text) => handleGateChange(index, 'symbol', text)}
                />
              </View>
            )}
            <Button title="Remove Gate" onPress={() => handleRemoveGate(index)} color={COLORS.errorRed || '#EF4444'} />
          </View>
        ))}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.submitButton, (loading || isUploading) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading || isUploading}
      >
        {loading || isUploading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={styles.submitButtonText}>Create Community</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  label: {
    fontSize: 16,
    color: COLORS.greyLight,
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#161B22',
    color: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 5,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  placeholderInner: {
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.greyMid,
    fontSize: 12,
    marginTop: 5,
  },
  previewAvatar: {
    width: '100%',
    height: '100%',
  },
  previewBanner: {
    width: '100%',
    height: '100%',
  },
  removeText: {
    color: COLORS.errorRed || '#EF4444',
    fontSize: 12,
    marginTop: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  gatesSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#30363D',
    paddingTop: 20,
  },
  gatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gateItem: {
    backgroundColor: '#161B22',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.brandSecondary,
  },
  gateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gateLabel: {
    fontSize: 14,
    color: COLORS.greyLight,
    marginRight: 10,
  },
  gateInput: {
    backgroundColor: COLORS.background,
    color: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  picker: {
    flex: 1,
    color: COLORS.white,
  },
  pickerItem: {
    color: COLORS.white,
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.errorRed || '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
});

export default CreateCommunityScreen;
