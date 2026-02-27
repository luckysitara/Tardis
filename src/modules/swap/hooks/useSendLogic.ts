import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert, Linking } from 'react-native';
import { PublicKey, Transaction, SystemProgram, Connection } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createTransferCheckedInstruction, 
  getAssociatedTokenAddress,
  getMint
} from '@solana/spl-token';

import {
  TokenInfo,
  fetchTokenBalance,
  fetchTokenPrice,
  fetchTokenMetadata,
  ensureCompleteTokenInfo,
  getRpcUrl,
  DEFAULT_SOL_TOKEN,
} from '@/modules/data-module';
import { TransactionService } from '@/modules/wallet-providers/services/transaction/transactionService';

export interface SendRouteParams {
  token?: TokenInfo;
  amount?: string;
  recipientAddress?: string;
}

export function useSendLogic(
  routeParams: SendRouteParams = {},
  userPublicKey: PublicKey | null,
  connected: boolean,
  sendTransaction: (transaction: any, connection: any, options?: any) => Promise<string>,
  navigation: any
) {
  console.warn('[SendLogic] Hook initialized with params:', JSON.stringify(routeParams));

  // UI States
  const [inputValue, setInputValue] = useState(routeParams.amount || '0');
  const [recipientAddress, setRecipientAddress] = useState(routeParams.recipientAddress || '');
  const [showSelectTokenModal, setShowSelectTokenModal] = useState(false);

  // Token States
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [tokensInitialized, setTokensInitialized] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [currentTokenPrice, setCurrentTokenPrice] = useState<number | null>(null);

  // Transaction States
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [solscanTxSig, setSolscanTxSig] = useState('');

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Initialize token
  const initializeToken = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      console.warn('[SendLogic] Initializing token with routeParams:', JSON.stringify(routeParams));
      let initialToken: TokenInfo | null = null;
      
      if (routeParams.token && routeParams.token.address) {
        console.warn('[SendLogic] Using full token from route params:', routeParams.token.symbol);
        initialToken = routeParams.token;
      } else if (routeParams.token?.address) {
        // Handle case where routeParams.token is just a partial object with address
        console.warn('[SendLogic] Fetching metadata for token address:', routeParams.token.address);
        initialToken = await fetchTokenMetadata(routeParams.token.address);
      } else {
        // Default to SOL
        console.warn('[SendLogic] No token in route params, using default SOL constant');
        initialToken = DEFAULT_SOL_TOKEN;
      }

      // Final fallback
      if (!initialToken) {
        console.warn('[SendLogic] Final fallback to default SOL constant');
        initialToken = DEFAULT_SOL_TOKEN;
      }

      console.warn('[SendLogic] Setting selected token:', initialToken?.symbol);

      if (isMounted.current && initialToken) {
        setSelectedToken(initialToken);
        setTokensInitialized(true);

        if (userPublicKey) {
          const balance = await fetchTokenBalance(userPublicKey, initialToken);
          if (isMounted.current) setCurrentBalance(balance);
          
          const price = await fetchTokenPrice(initialToken);
          if (isMounted.current) setCurrentTokenPrice(price);
        }
      }
    } catch (error) {
      console.error('[SendLogic] Error initializing token:', error);
      // Ensure we have at least SOL if initialization failed
      if (isMounted.current) {
        setSelectedToken(DEFAULT_SOL_TOKEN);
        setTokensInitialized(true);
      }
    }
  }, [userPublicKey, routeParams]);

  useEffect(() => {
    if (!tokensInitialized) initializeToken();
  }, [tokensInitialized, initializeToken]);

  const handleTokenSelected = useCallback(async (token: TokenInfo) => {
    if (!isMounted.current) return;
    const completeToken = await ensureCompleteTokenInfo(token);
    if (isMounted.current) {
      setSelectedToken(completeToken);
      setInputValue('0');
      setCurrentBalance(null);
      setCurrentTokenPrice(null);
      setShowSelectTokenModal(false);
      
      if (userPublicKey) {
        const balance = await fetchTokenBalance(userPublicKey, completeToken);
        if (isMounted.current) setCurrentBalance(balance);
        const price = await fetchTokenPrice(completeToken);
        if (isMounted.current) setCurrentTokenPrice(price);
      }
    }
  }, [userPublicKey]);

  const handleSend = useCallback(async () => {
    if (!connected || !userPublicKey || !selectedToken || !recipientAddress) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(inputValue);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    if (currentBalance !== null && amount > currentBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    let toPublicKey: PublicKey;
    try {
      toPublicKey = new PublicKey(recipientAddress);
    } catch (e) {
      Alert.alert('Error', 'Invalid recipient address');
      return;
    }

    setLoading(true);
    setResultMsg('Preparing transaction...');
    setErrorMsg('');

    try {
      const connection = new Connection(getRpcUrl(), 'confirmed');
      const transaction = new Transaction();

      if (selectedToken.symbol === 'SOL') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: userPublicKey,
            toPubkey: toPublicKey,
            lamports: amount * 1e9,
          })
        );
      } else {
        // SPL Token transfer
        const mintPubkey = new PublicKey(selectedToken.address);
        const fromAta = await getAssociatedTokenAddress(mintPubkey, userPublicKey);
        const toAta = await getAssociatedTokenAddress(mintPubkey, toPublicKey);
        
        // Check if toAta exists, if not we'd need to create it. 
        // For simplicity in this first version, we assume it exists or use a more complex helper.
        // But let's add the transfer instruction:
        const decimals = selectedToken.decimals || 9;
        transaction.add(
          createTransferCheckedInstruction(
            fromAta,
            mintPubkey,
            toAta,
            userPublicKey,
            BigInt(Math.floor(amount * Math.pow(10, decimals))),
            decimals
          )
        );
      }

      const signature = await sendTransaction(transaction, connection, {
        confirmTransaction: true,
        statusCallback: (status: string) => setResultMsg(status),
      });

      if (isMounted.current) {
        setSolscanTxSig(signature);
        setResultMsg('Transfer successful!');
        setLoading(false);
        Alert.alert('Success', 'Tokens sent successfully!');
      }
    } catch (error: any) {
      console.error('[SendLogic] Send error:', error);
      if (isMounted.current) {
        setErrorMsg(error.message || 'Transaction failed');
        setLoading(false);
      }
    }
  }, [connected, userPublicKey, selectedToken, recipientAddress, inputValue, currentBalance, sendTransaction]);

  const handleKeyPress = (key: string) => {
    if (key === 'delete') {
      setInputValue(prev => prev.slice(0, -1) || '0');
      return;
    }
    if (key === '.') {
      if (inputValue.includes('.')) return;
    }
    if (inputValue === '0' && key !== '.') {
      setInputValue(key);
    } else {
      setInputValue(prev => prev + key);
    }
  };

  return {
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
  };
}
