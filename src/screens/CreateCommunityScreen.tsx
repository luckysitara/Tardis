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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { createCommunity, fetchCommunities } from '@/shared/state/community/slice';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs'; // Assuming you have an Icons component for SVG
import { Picker } from '@react-native-picker/picker';

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
  const creatorId = useAppSelector(state => state.auth.address); // Get creatorId from auth state

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [gates, setGates] = useState<GateInput[]>([]);

  const handleAddGate = () => {
    setGates([...gates, { type: 'TOKEN', mintAddress: '', minBalance: '', symbol: '' }]);
  };

  const handleRemoveGate = (index: number) => {
    const newGates = gates.filter((_, i) => i !== index);
    setGates(newGates);
  };

  const handleGateChange = (index: number, field: keyof GateInput, value: string) => {
    const newGates = [...gates];
    // Ensure type is correctly cast if it's the field being updated
    (newGates[index][field] as any) = value;
    setGates(newGates);
  };

  const handleSubmit = async () => {
    if (!name || !creatorId) {
      Alert.alert('Error', 'Community name and creator are required.');
      return;
    }

    try {
      await dispatch(createCommunity({
        name,
        description,
        avatarUrl,
        bannerUrl,
        isPublic,
        creatorId,
        gates: gates.map(gate => ({
          ...gate,
          minBalance: gate.minBalance || '1', // Default to 1 if not provided
        })),
      })).unwrap();
      Alert.alert('Success', 'Community created successfully!');
      dispatch(fetchCommunities()); // Re-fetch communities to update the list
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to create community.');
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

      <Text style={styles.label}>Avatar URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://example.com/avatar.png"
        placeholderTextColor={COLORS.greyMid}
        value={avatarUrl}
        onChangeText={setAvatarUrl}
      />

      <Text style={styles.label}>Banner URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://example.com/banner.png"
        placeholderTextColor={COLORS.greyMid}
        value={bannerUrl}
        onChangeText={setBannerUrl}
      />

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
            <Button title="Remove Gate" onPress={() => handleRemoveGate(index)} color={COLORS.error} />
          </View>
        ))}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Button
        title={loading ? 'Creating...' : 'Create Community'}
        onPress={handleSubmit}
        color={COLORS.brandPrimary}
        disabled={loading}
      />
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
    paddingBottom: 50, // Ensure content isn't cut off by bottom button
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 24, // To balance the header title position
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
    // Note: backgroundColor is buggy on iOS for Picker itself, often needs to be applied to wrapper
  },
  pickerItem: {
    color: COLORS.white,
    backgroundColor: COLORS.background, // This style is for individual Picker.Item, may not work on all platforms
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
});

export default CreateCommunityScreen;
