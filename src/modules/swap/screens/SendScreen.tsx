import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  StyleSheet
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { styles } from './SwapScreen.styles';
import SelectTokenModal from '../components/SelectTokenModal';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import { AppHeader } from '@/core/shared-ui';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';

import {
  TokenRow,
  StatusDisplay,
  Keypad,
  androidStyles
} from '@/modules/swap/components/SwapComponents';
import { useSendLogic, SendRouteParams } from '@/modules/swap/hooks/useSendLogic';

type SendScreenRouteProp = RouteProp<RootStackParamList, 'Send'>;
type SendScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Send'>;

export default function SendScreen() {
  const navigation = useNavigation<SendScreenNavigationProp>();
  const route = useRoute<SendScreenRouteProp>();
  const { 
    publicKey: userPublicKey, 
    connected, 
    sendTransaction 
  } = useWallet();

  const routeParams = route.params || {};

  const {
    selectedToken,
    currentBalance,
    currentTokenPrice,
    inputValue,
    recipientAddress,
    setRecipientAddress,
    showSelectTokenModal,
    setShowSelectTokenModal,
    loading,
    resultMsg,
    errorMsg,
    solscanTxSig,
    handleTokenSelected,
    handleSend,
    handleKeyPress,
    setInputValue
  } = useSendLogic(routeParams, userPublicKey, connected, sendTransaction, navigation);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const calculateUsdValue = (amount: string, price: number | null) => {
    if (!price || !amount) return '$0.00';
    return `$${(parseFloat(amount) * price).toFixed(2)}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader
          title="Send Tokens"
          showBackButton={true}
          onBackPress={handleBack}
        />

        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.fullWidthScroll}
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 250 }}
          >
            <View style={localStyles.inputGroup}>
              <Text style={localStyles.label}>Recipient Address</Text>
              <TextInput
                style={localStyles.addressInput}
                placeholder="Paste Solana address"
                placeholderTextColor={COLORS.greyDark}
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.swapContainer}>
              <TokenRow
                token={selectedToken}
                balance={currentBalance}
                isInput={true}
                value={inputValue}
                fiatValue={calculateUsdValue(inputValue, currentTokenPrice)}
                onPress={() => setShowSelectTokenModal(true)}
                connected={connected}
                isLoading={!selectedToken}
              />

              <View style={styles.percentageButtonsContainer}>
                <TouchableOpacity
                  style={styles.percentageButton}
                  onPress={() => currentBalance && setInputValue(String(currentBalance))}
                >
                  <Text style={styles.percentageButtonText}>MAX</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.percentageButton}
                  onPress={() => currentBalance && setInputValue(String(currentBalance * 0.5))}
                >
                  <Text style={styles.percentageButtonText}>50%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setInputValue('0')}
                >
                  <Text style={styles.clearButtonText}>CLEAR</Text>
                </TouchableOpacity>
              </View>
            </View>

            <StatusDisplay
              loading={loading}
              resultMsg={resultMsg}
              errorMsg={errorMsg}
            />

            {solscanTxSig ? (
              <TouchableOpacity 
                style={localStyles.solscanButton}
                onPress={() => {
                  const url = `https://solscan.io/tx/${solscanTxSig}`;
                  // Linking handled in logic if needed, or here
                }}
              >
                <Text style={localStyles.solscanText}>View on Solscan</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          <Keypad onKeyPress={handleKeyPress} />

          <TouchableOpacity
            style={[
              styles.swapActionButton,
              (!connected || loading || !recipientAddress || parseFloat(inputValue) <= 0) && { opacity: 0.6 }
            ]}
            onPress={handleSend}
            disabled={!connected || loading || !recipientAddress || parseFloat(inputValue) <= 0}
          >
            <Text style={styles.swapActionButtonText}>
              {loading ? 'Sending...' : 'Send Tokens'}
            </Text>
          </TouchableOpacity>
        </View>

        <SelectTokenModal
          visible={showSelectTokenModal}
          onClose={() => setShowSelectTokenModal(false)}
          onTokenSelected={handleTokenSelected}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  inputGroup: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  label: {
    color: COLORS.greyMid,
    fontSize: 14,
    marginBottom: 8,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  addressInput: {
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 12,
    padding: 16,
    color: COLORS.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  solscanButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  solscanText: {
    color: COLORS.brandPrimary,
    fontSize: 14,
    fontWeight: '700',
  }
});
