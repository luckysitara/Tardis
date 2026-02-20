import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '@/shared/hooks/useReduxHooks';
import axios from 'axios';
import { SERVER_URL } from '@env';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';

const SERVER_BASE_URL = SERVER_URL || 'http://192.168.1.175:8080';

const CreateCommunityScreen = () => {
  const navigation = useNavigation<any>();
  const { address: userId } = useAppSelector(state => state.auth);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  // Gating state
  const [useSgtGate, setUseSgtGate] = useState(false);
  const [tokenGateActive, setTokenGateActive] = useState(false);
  const [tokenMint, setTokenMint] = useState('');
  const [minBalance, setMinBalance] = useState('1');

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Community name is required.');
      return;
    }

    if (!userId) return;

    setLoading(true);
    try {
      const gates = [];
      if (useSgtGate) gates.push({ type: 'GENESIS' });
      if (tokenGateActive && tokenMint) {
        gates.push({
          type: 'TOKEN',
          mintAddress: tokenMint,
          minBalance: minBalance
        });
      }

      const response = await axios.post(`${SERVER_BASE_URL}/api/communities`, {
        name,
        description,
        isPublic,
        creatorId: userId,
        gates
      });

      if (response.data.success) {
        Alert.alert('Success', 'Community materialized!');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create community.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Community</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading} style={styles.createButton}>
          {loading ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : <Text style={styles.createText}>Create</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.label}>COMMUNITY IDENTITY</Text>
        <TextInput
          style={styles.input}
          placeholder="Name your transmission..."
          placeholderTextColor={COLORS.greyMid}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (Optional)"
          placeholderTextColor={COLORS.greyMid}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Public Discovery</Text>
            <Text style={styles.switchSublabel}>Allow others to see this in the Galactic Map</Text>
          </View>
          <Switch 
            value={isPublic} 
            onValueChange={setIsPublic} 
            trackColor={{ false: '#30363D', true: COLORS.brandPrimary }}
          />
        </View>

        <Text style={[styles.label, { marginTop: 30 }]}>TEMPORAL GATES (ACCESS RULES)</Text>
        
        <View style={styles.gateRow}>
          <View style={styles.gateInfo}>
            <Icons.Shield width={20} height={20} color={useSgtGate ? COLORS.brandPrimary : COLORS.greyMid} />
            <Text style={[styles.gateTitle, useSgtGate && { color: COLORS.white }]}>Seeker Genesis Only</Text>
          </View>
          <Switch 
            value={useSgtGate} 
            onValueChange={setUseSgtGate} 
            trackColor={{ false: '#30363D', true: COLORS.brandPrimary }}
          />
        </View>

        <View style={styles.gateRow}>
          <View style={styles.gateInfo}>
            <Icons.TradeShare width={20} height={20} color={tokenGateActive ? COLORS.brandPurple : COLORS.greyMid} />
            <Text style={[styles.gateTitle, tokenGateActive && { color: COLORS.white }]}>Token Gating</Text>
          </View>
          <Switch 
            value={tokenGateActive} 
            onValueChange={setTokenGateActive} 
            trackColor={{ false: '#30363D', true: COLORS.brandPurple }}
          />
        </View>

        {tokenGateActive && (
          <Animated.View style={styles.tokenForm}>
            <TextInput
              style={styles.gateInput}
              placeholder="Token Mint Address"
              placeholderTextColor={COLORS.greyMid}
              value={tokenMint}
              onChangeText={setTokenMint}
            />
            <TextInput
              style={styles.gateInput}
              placeholder="Minimum Balance"
              placeholderTextColor={COLORS.greyMid}
              value={minBalance}
              onChangeText={setMinBalance}
              keyboardType="numeric"
            />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  closeButton: { width: 60 },
  closeText: { color: COLORS.greyMid, fontSize: 16 },
  createButton: { width: 60, alignItems: 'flex-end' },
  createText: { color: COLORS.brandPrimary, fontSize: 16, fontWeight: 'bold' },
  form: { padding: 20 },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.brandPrimary,
    letterSpacing: 1,
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 15,
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  switchSublabel: { color: COLORS.greyMid, fontSize: 12, marginTop: 2 },
  gateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161B22',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  gateInfo: { flexDirection: 'row', alignItems: 'center' },
  gateTitle: { color: COLORS.greyMid, fontSize: 16, fontWeight: '600', marginLeft: 12 },
  tokenForm: {
    marginTop: 5,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.brandPurple,
  },
  gateInput: {
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 12,
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#30363D',
  }
});

export default CreateCommunityScreen;
