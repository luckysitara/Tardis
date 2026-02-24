import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  FlatList,
  Image,
} from 'react-native';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  createTransferCheckedInstruction 
} from '@solana/spl-token';
import { useFetchTokens, fixImageUrl } from '@/modules/data-module/hooks/useFetchTokens';

interface TipModalProps {
  visible: boolean;
  onClose: () => void;
  recipientAddress: string;
  recipientName: string;
  onTipSent: (signature: string, amount: number, symbol: string) => void;
}

const RPC_URL = 'https://api.mainnet-beta.solana.com';

const TipModal: React.FC<TipModalProps> = ({
  visible,
  onClose,
  recipientAddress,
  recipientName,
  onTipSent,
}) => {
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  
  const { sendTransaction, publicKey } = useWallet();
  const { tokens, loading: loadingTokens } = useFetchTokens(publicKey?.toBase58());

  const solToken = {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    image: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
    token_info: {
      decimals: 9,
      balance: 0, // Not used here
    },
    assetType: 'token' as const,
  };

  const [selectedToken, setSelectedToken] = useState<any>(solToken);

  const availableTokens = useMemo(() => {
    return [solToken, ...tokens];
  }, [tokens]);

  const handleSendTip = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', `Please enter a valid ${selectedToken.symbol} amount.`);
      return;
    }

    if (!publicKey) {
      Alert.alert('Wallet Error', 'Please connect your wallet.');
      return;
    }

    setIsSending(true);
    try {
      const connection = new Connection(RPC_URL, 'confirmed');
      const recipientPubkey = new PublicKey(recipientAddress);
      const transaction = new Transaction();

      if (selectedToken.symbol === 'SOL') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPubkey,
            lamports: numAmount * LAMPORTS_PER_SOL,
          })
        );
      } else {
        // SPL Token Transfer
        const mintPubkey = new PublicKey(selectedToken.id === 'solana' ? selectedToken.token_info.mint : selectedToken.id);
        const decimals = selectedToken.token_info.decimals;
        
        const fromAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
        const toAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

        // Check if recipient ATA exists
        const toAtaInfo = await connection.getAccountInfo(toAta);
        if (!toAtaInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              toAta,
              recipientPubkey,
              mintPubkey
            )
          );
        }

        const rawAmount = BigInt(Math.floor(numAmount * Math.pow(10, decimals)));
        
        transaction.add(
          createTransferCheckedInstruction(
            fromAta,
            mintPubkey,
            toAta,
            publicKey,
            rawAmount,
            decimals
          )
        );
      }

      const signature = await sendTransaction(transaction, connection);
      
      if (signature) {
        onTipSent(signature, numAmount, selectedToken.symbol);
        setAmount('');
        onClose();
      }
    } catch (error: any) {
      console.error('[TipModal] Error sending tip:', error);
      Alert.alert('Transaction Failed', error.message || 'An error occurred during the transaction.');
    } finally {
      setIsSending(false);
    }
  };

  const renderTokenItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.tokenItem} 
      onPress={() => {
        setSelectedToken(item);
        setShowTokenSelector(false);
      }}
    >
      <Image source={{ uri: fixImageUrl(item.image) }} style={styles.tokenIconSmall} />
      <View style={styles.tokenItemText}>
        <Text style={styles.tokenItemSymbol}>{item.symbol}</Text>
        <Text style={styles.tokenItemName}>{item.name}</Text>
      </View>
      {selectedToken.symbol === item.symbol && (
        <Text style={styles.checkMark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Send Tip to {recipientName}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <Text style={styles.recipientSub}>Address: {recipientAddress.substring(0, 8)}...{recipientAddress.substring(recipientAddress.length - 8)}</Text>
                
                <TouchableOpacity 
                  style={styles.tokenSelector}
                  onPress={() => setShowTokenSelector(!showTokenSelector)}
                >
                  <Image source={{ uri: fixImageUrl(selectedToken.image) }} style={styles.tokenIconSmall} />
                  <Text style={styles.tokenSelectorText}>{selectedToken.symbol}</Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>

                {showTokenSelector && (
                  <View style={styles.tokenListContainer}>
                    <FlatList
                      data={availableTokens}
                      renderItem={renderTokenItem}
                      keyExtractor={item => item.id}
                      style={styles.tokenList}
                      nestedScrollEnabled
                    />
                  </View>
                )}

                {!showTokenSelector && (
                  <>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.greyMid}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        autoFocus
                      />
                      <Text style={styles.currency}>{selectedToken.symbol}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.sendButton, isSending && styles.disabledButton]}
                      onPress={handleSendTip}
                      disabled={isSending}
                    >
                      {isSending ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.sendButtonText}>Send Tip</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: COLORS.greyMid,
    fontSize: 20,
  },
  content: {
    alignItems: 'center',
  },
  recipientSub: {
    color: COLORS.greyMid,
    fontSize: 14,
    marginBottom: 24,
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkerBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tokenSelectorText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  dropdownIcon: {
    color: COLORS.greyMid,
    fontSize: 12,
  },
  tokenListContainer: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  tokenList: {
    width: '100%',
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tokenItemText: {
    flex: 1,
    marginLeft: 12,
  },
  tokenItemSymbol: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  tokenItemName: {
    color: COLORS.greyMid,
    fontSize: 12,
  },
  tokenIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  checkMark: {
    color: COLORS.brandPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 16,
    textAlign: 'center',
  },
  currency: {
    color: COLORS.brandPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
  },
  sendButton: {
    backgroundColor: COLORS.brandPrimary,
    width: '100%',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
});

export default TipModal;
