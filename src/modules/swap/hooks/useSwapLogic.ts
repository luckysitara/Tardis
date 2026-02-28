import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert, Linking } from 'react-native';
import { PublicKey } from '@solana/web3.js';

import {
  TokenInfo,
  fetchTokenBalance,
  fetchTokenPrice,
  fetchTokenMetadata,
  ensureCompleteTokenInfo,
  DEFAULT_SOL_TOKEN,
  DEFAULT_USDC_TOKEN
} from '@/modules/data-module';
import { TradeService, SwapProvider } from '@/modules/swap/services/tradeService';
import { JupiterUltraService } from '@/modules/swap/services/jupiterUltraService';

// Debounce time for updating price-related values (in milliseconds)
const PRICE_UPDATE_DEBOUNCE = 1000;

export interface SwapRouteParams {
  inputToken?: TokenInfo;
  outputToken?: TokenInfo;
  inputMint?: string;
  outputMint?: string;
  inputAmount?: string;
  shouldInitialize?: boolean;
}

export function useSwapLogic(
  routeParams: SwapRouteParams = {},
  userPublicKey: PublicKey | null,
  connected: boolean,
  transactionSender: { 
    sendTransaction: (transaction: any, connection: any, options?: any) => Promise<string>,
    sendBase64Transaction: (base64Tx: string, connection: any, options?: any) => Promise<string>,
    signTransaction: (transaction: any) => Promise<any>
  },
  navigation: any
) {
  // UI States
  const [activeProvider, setActiveProvider] = useState<SwapProvider>('Jupiter');
  const [inputValue, setInputValue] = useState(routeParams.inputAmount || '0');
  const [showSelectTokenModal, setShowSelectTokenModal] = useState(false);
  const [selectingWhichSide, setSelectingWhichSide] = useState<'input' | 'output'>('input');
  const [poolAddress, setPoolAddress] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(0.5);

  // Token States
  const [inputToken, setInputToken] = useState<TokenInfo | null>(null);
  const [outputToken, setOutputToken] = useState<TokenInfo | null>(null);
  const [tokensInitialized, setTokensInitialized] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [currentTokenPrice, setCurrentTokenPrice] = useState<number | null>(null);
  const [estimatedOutputAmount, setEstimatedOutputAmount] = useState<string>('');
  const [outputTokenUsdValue, setOutputTokenUsdValue] = useState('$0.00');

  // Transaction States
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [solscanTxSig, setSolscanTxSig] = useState('');

  // Refs
  const isMounted = useRef(true);
  const [pendingTokenOps, setPendingTokenOps] = useState<{ input: boolean, output: boolean }>({ input: false, output: false });
  
  // Caching refs to prevent unnecessary state updates
  const currentPriceRef = useRef<number | null>(null);
  
  // Debounce timer refs
  const priceUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const estimateSwapTimer = useRef<NodeJS.Timeout | null>(null);
  const lastInitializedMints = useRef<string>('');
  const initInFlight = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      initInFlight.current = false;
      
      // Clear any pending timers
      if (priceUpdateTimer.current) {
        clearTimeout(priceUpdateTimer.current);
      }
      if (estimateSwapTimer.current) {
        clearTimeout(estimateSwapTimer.current);
      }
    };
  }, []);

  // Initialize tokens with details
  const initializeTokens = useCallback(async () => {
    // Prevent redundant initialization with same params
    const inputMint = routeParams.inputMint || routeParams.inputToken?.address;
    const outputMint = routeParams.outputMint || routeParams.outputToken?.address;
    
    // Safety check for basic required data
    if (!inputMint && !outputMint && !routeParams.inputToken && !routeParams.outputToken) {
      return;
    }

    const mintsKey = `${inputMint || 'def'}-${outputMint || 'def'}`;
    
    if (tokensInitialized && lastInitializedMints.current === mintsKey) {
      return;
    }

    // Don't initialize if already in flight or component unmounted
    if (!isMounted.current || initInFlight.current) {
      return;
    }

    initInFlight.current = true;
    lastInitializedMints.current = mintsKey;

    try {
      // Mark operations as pending
      setPendingTokenOps({ input: true, output: true });
      console.warn('[SwapScreen] Initializing tokens...', routeParams);

      // Fetch initial tokens
      let initialInputToken: TokenInfo | null = null;
      let initialOutputToken: TokenInfo | null = null;

      // 1. INPUT TOKEN INITIALIZATION
      try {
        if (routeParams.inputToken) {
          initialInputToken = routeParams.inputToken;
        } else if (routeParams.inputMint) {
          initialInputToken = await fetchTokenMetadata(routeParams.inputMint);
          
          if (!initialInputToken && routeParams.inputMint === DEFAULT_SOL_TOKEN.address) {
            initialInputToken = DEFAULT_SOL_TOKEN;
          }
        }
        
        if (!initialInputToken) {
          initialInputToken = DEFAULT_SOL_TOKEN;
        }
      } catch (err) {
        initialInputToken = DEFAULT_SOL_TOKEN;
      }

      // 2. OUTPUT TOKEN INITIALIZATION
      try {
        if (routeParams.outputToken) {
          initialOutputToken = routeParams.outputToken;
        } else if (routeParams.outputMint) {
          initialOutputToken = await fetchTokenMetadata(routeParams.outputMint);
          
          if (!initialOutputToken && routeParams.outputMint === DEFAULT_USDC_TOKEN.address) {
            initialOutputToken = DEFAULT_USDC_TOKEN;
          }
        }
        
        if (!initialOutputToken) {
          initialOutputToken = DEFAULT_USDC_TOKEN;
          
          if (initialInputToken?.address === initialOutputToken?.address) {
            if (initialInputToken?.address === DEFAULT_SOL_TOKEN.address) {
              initialOutputToken = DEFAULT_USDC_TOKEN;
            } else {
              initialOutputToken = DEFAULT_SOL_TOKEN;
            }
          }
        }
      } catch (err) {
        initialOutputToken = DEFAULT_USDC_TOKEN;
      }

      if (isMounted.current) {
        // Set the tokens
        setInputToken(initialInputToken);
        setOutputToken(initialOutputToken);
        setPendingTokenOps({ input: false, output: false });
        setTokensInitialized(true);
        initInFlight.current = false;

        // If route provided an amount, set it
        if (routeParams.inputAmount) {
          setInputValue(routeParams.inputAmount);
        }

        // Fetch balance and price only if wallet is connected
        if (userPublicKey && initialInputToken) {
          const balance = await fetchTokenBalance(userPublicKey, initialInputToken);
          if (isMounted.current && balance !== null) {
            setCurrentBalance(balance);
            
            const price = await fetchTokenPrice(initialInputToken);
            if (isMounted.current && price !== null) {
              setCurrentTokenPrice(price);
              currentPriceRef.current = price;
            }
          }
        }
      }
    } catch (error) {
      console.error('[SwapScreen] Unexpected error during token initialization:', error);
      setPendingTokenOps({ input: false, output: false });
      initInFlight.current = false;
    }
  }, [
    userPublicKey, 
    routeParams.inputMint, 
    routeParams.outputMint, 
    routeParams.inputToken, 
    routeParams.outputToken, 
    routeParams.inputAmount,
    tokensInitialized
  ]);

  // Fetch token balance
  const fetchBalance = useCallback(async (tokenToUse?: TokenInfo | null) => {
    if (!connected || !userPublicKey) {
      return null;
    }

    const tokenForBalance = tokenToUse || inputToken;

    if (!tokenForBalance) {
      return null;
    }

    try {
      const balance = await fetchTokenBalance(userPublicKey, tokenForBalance);

      if (isMounted.current) {
        if (balance !== null && balance !== currentBalance) {
          setCurrentBalance(balance);
        }
        return balance;
      }
    } catch (err) {
      console.error('[SwapScreen] Error fetching balance:', err);
      if (isMounted.current) {
        setCurrentBalance(0);
        setErrorMsg(`Failed to fetch ${tokenForBalance.symbol} balance`);
        setTimeout(() => isMounted.current && setErrorMsg(''), 3000);
      }
    }
    return null;
  }, [connected, userPublicKey, inputToken, currentBalance]);

  // Fetch token price
  const getTokenPrice = useCallback(async (tokenToUse?: TokenInfo | null): Promise<number | null> => {
    const tokenForPrice = tokenToUse || inputToken;

    if (!tokenForPrice) {
      return null;
    }

    try {
      const price = await fetchTokenPrice(tokenForPrice);
      
      if (isMounted.current) {
        if (tokenForPrice === inputToken && price !== null && price !== currentPriceRef.current) {
          if (priceUpdateTimer.current) {
            clearTimeout(priceUpdateTimer.current);
          }
          
          priceUpdateTimer.current = setTimeout(() => {
            if (isMounted.current) {
              setCurrentTokenPrice(price);
              currentPriceRef.current = price;
            }
          }, PRICE_UPDATE_DEBOUNCE);
        }
        
        return price;
      }
    } catch (err) {
      console.error('[SwapScreen] Error fetching token price:', err);
      if (isMounted.current) {
        setCurrentTokenPrice(null);
        currentPriceRef.current = null;
      }
    }
    return null;
  }, [inputToken]);

  // Calculate USD value for a given token amount
  const calculateUsdValue = useCallback((amount: string, tokenPrice: number | null) => {
    if (!tokenPrice || tokenPrice <= 0 || !amount || isNaN(parseFloat(amount))) {
      return '$0.00';
    }

    try {
      const numericAmount = parseFloat(amount);
      const usdValue = numericAmount * tokenPrice;

      if (usdValue >= 1000000) {
        return `$${(usdValue / 1000000).toFixed(2)}M`;
      } else if (usdValue >= 1000) {
        return `$${(usdValue / 1000).toFixed(2)}K`;
      } else if (usdValue < 0.01 && usdValue > 0) {
        return `$${usdValue.toFixed(6)}`;
      } else {
        return `$${usdValue.toFixed(2)}`;
      }
    } catch (error) {
      console.error('Error calculating USD value:', error);
      return '$0.00';
    }
  }, []);

  // Estimate the output amount based on input
  const estimateSwap = useCallback(async () => {
    if (!connected || parseFloat(inputValue) <= 0 || !inputToken || !outputToken || !userPublicKey) {
      if (estimatedOutputAmount !== '0') {
        setEstimatedOutputAmount('0');
      }
      if (outputTokenUsdValue !== '$0.00') {
        setOutputTokenUsdValue('$0.00');
      }
      return;
    }
    
    try {
      if (estimateSwapTimer.current) {
        clearTimeout(estimateSwapTimer.current);
      }
      
      estimateSwapTimer.current = setTimeout(async () => {
        if (!isMounted.current) return;
        
        try {
          const amountInNativeUnits = Math.floor(
            parseFloat(inputValue) * Math.pow(10, inputToken.decimals)
          );

          const order = await JupiterUltraService.getUltraOrder(
            inputToken.address,
            outputToken.address,
            amountInNativeUnits.toString(),
            userPublicKey.toBase58()
          );

          if (isMounted.current && order.outAmount) {
            const outAmountNum = Number(order.outAmount) / Math.pow(10, outputToken.decimals);
            const formattedOutput = outAmountNum.toFixed(outputToken.decimals <= 6 ? outputToken.decimals : 6);
            
            setEstimatedOutputAmount(formattedOutput);
            
            const outputPrice = await fetchTokenPrice(outputToken);
            if (isMounted.current) {
              const formattedUsdValue = calculateUsdValue(formattedOutput, outputPrice);
              setOutputTokenUsdValue(formattedUsdValue);
            }
          }
        } catch (error: any) {
          const inputPrice = await getTokenPrice(inputToken);
          const outputPrice = await getTokenPrice(outputToken);

          if (inputPrice && outputPrice && isMounted.current) {
            const estimatedOutput = (parseFloat(inputValue) * inputPrice / outputPrice) * 0.997;
            const formattedOutput = estimatedOutput.toFixed(outputToken.decimals <= 6 ? outputToken.decimals : 6);
            setEstimatedOutputAmount(formattedOutput);
            setOutputTokenUsdValue(calculateUsdValue(formattedOutput, outputPrice));
          }
        }
      }, 500); 
    } catch (error) {
      console.error('[SwapLogic] Error in estimateSwap:', error);
    }
  }, [connected, userPublicKey, inputValue, inputToken, outputToken, calculateUsdValue, getTokenPrice]);

  // Handle token selection
  const handleTokenSelected = useCallback(async (token: TokenInfo) => {
    if (!isMounted.current) return;

    try {
      if (selectingWhichSide === 'input') {
        setPendingTokenOps(prev => ({ ...prev, input: true }));
      } else {
        setPendingTokenOps(prev => ({ ...prev, output: true }));
      }

      if (priceUpdateTimer.current) {
        clearTimeout(priceUpdateTimer.current);
        priceUpdateTimer.current = null;
      }
      
      if (estimateSwapTimer.current) {
        clearTimeout(estimateSwapTimer.current);
        estimateSwapTimer.current = null;
      }

      let completeToken: TokenInfo | null = null;
      const timeoutPromise = new Promise<TokenInfo>(resolve => {
        setTimeout(() => {
          resolve(token); 
        }, 8000);
      });
      
      try {
        completeToken = await Promise.race([
          ensureCompleteTokenInfo(token),
          timeoutPromise
        ]);
      } catch (error) {
        completeToken = token;
      }

      if (!isMounted.current) return;
      
      if (!completeToken) {
        throw new Error('Failed to get token information');
      }

      if (selectingWhichSide === 'input') {
        setInputToken(completeToken);
        setPendingTokenOps(prev => ({ ...prev, input: false }));
        setInputValue('0');
        setCurrentBalance(null);
        setCurrentTokenPrice(null);
        currentPriceRef.current = null;
        setShowSelectTokenModal(false);

        setTimeout(async () => {
          if (isMounted.current && userPublicKey) {
            try {
              const newBalance = await fetchBalance(completeToken);
              if (!isMounted.current) return;
              
              if (newBalance !== null) {
                const price = await getTokenPrice(completeToken);
                if (!isMounted.current) return;
                
                if (price !== null) {
                  currentPriceRef.current = price;
                  priceUpdateTimer.current = setTimeout(() => {
                    if (isMounted.current) {
                      setCurrentTokenPrice(price);
                      setTimeout(() => {
                        if (isMounted.current && parseFloat(inputValue) > 0) {
                          estimateSwap();
                        }
                      }, 300);
                    }
                  }, PRICE_UPDATE_DEBOUNCE / 2);
                }
              }
            } catch (error) {
              if (isMounted.current) {
                setCurrentBalance(0);
                if (currentPriceRef.current === null) {
                  setCurrentTokenPrice(0);
                }
              }
            }
          }
        }, 200);
      } else {
        setOutputToken(completeToken);
        setPendingTokenOps(prev => ({ ...prev, output: false }));
        setShowSelectTokenModal(false);
        setEstimatedOutputAmount('');
        setOutputTokenUsdValue('$0.00');
        
        setTimeout(() => {
          if (isMounted.current && inputToken && parseFloat(inputValue) > 0) {
            estimateSwap();
          }
        }, 300);
      }
    } catch (error) {
      if (selectingWhichSide === 'input') {
        setPendingTokenOps(prev => ({ ...prev, input: false }));
      } else {
        setPendingTokenOps(prev => ({ ...prev, output: false }));
      }

      if (isMounted.current) {
        setErrorMsg('Failed to load token information');
        setTimeout(() => isMounted.current && setErrorMsg(''), 3000);
        setShowSelectTokenModal(false);
      }
    }
  }, [selectingWhichSide, fetchBalance, getTokenPrice, userPublicKey, estimateSwap, inputValue, inputToken]);

  // Handle max button click
  const handleMaxButtonClick = useCallback(async () => {
    if (isMounted.current) {
      setErrorMsg('');
    }

    if (!connected || !userPublicKey || !inputToken) {
      if (isMounted.current) {
        Alert.alert(
          "Wallet Not Connected",
          "Please connect your wallet to view your balance."
        );
      }
      return;
    }

    if (currentBalance !== null && currentBalance > 0) {
      setInputValue(String(currentBalance));
      return;
    }

    if (isMounted.current) {
      setLoading(true);
      setResultMsg("Fetching your balance...");
    }

    try {
      const balance = await fetchBalance(inputToken);

      if (isMounted.current) {
        setLoading(false);
        setResultMsg("");
      }

      if (balance !== null && balance > 0 && isMounted.current) {
        setInputValue(String(balance));
      } else if (isMounted.current) {
        Alert.alert(
          "Balance Unavailable",
          `Could not get your ${inputToken.symbol} balance. Please check your wallet connection.`
        );
      }
    } catch (error) {
      if (isMounted.current) {
        setLoading(false);
        setResultMsg("");
        setErrorMsg(`Failed to fetch your ${inputToken?.symbol || 'token'} balance`);
        setTimeout(() => isMounted.current && setErrorMsg(''), 3000);
      }
    }
  }, [currentBalance, fetchBalance, inputToken, userPublicKey, connected]);

  // Handle percentage button clicks (25%, 50%)
  const handlePercentageButtonClick = useCallback(async (percentage: number) => {
    if (isMounted.current) {
      setErrorMsg('');
    }

    if (!connected || !userPublicKey || !inputToken) {
      if (isMounted.current) {
        Alert.alert(
          "Wallet Not Connected",
          "Please connect your wallet to view your balance."
        );
      }
      return;
    }

    if (currentBalance !== null && !isNaN(currentBalance) && currentBalance > 0) {
      const percentageAmount = (currentBalance * percentage) / 100;
      setInputValue(String(percentageAmount));
      return;
    }

    if (isMounted.current) {
      setLoading(true);
      setResultMsg("Fetching your balance...");
    }

    try {
      const balance = await fetchBalance(inputToken);

      if (isMounted.current) {
        setLoading(false);
        setResultMsg("");
      }

      if (balance !== null && !isNaN(balance) && balance > 0 && isMounted.current) {
        const percentageAmount = (balance * percentage) / 100;
        setInputValue(String(percentageAmount));
      } else if (isMounted.current) {
        Alert.alert(
          "Balance Unavailable",
          `Could not get your ${inputToken.symbol} balance. Please check your wallet connection.`
        );
      }
    } catch (error) {
      if (isMounted.current) {
        setLoading(false);
        setResultMsg("");
        setErrorMsg(`Failed to fetch your ${inputToken?.symbol || 'token'} balance`);
        setTimeout(() => isMounted.current && setErrorMsg(''), 3000);
      }
    }
  }, [currentBalance, fetchBalance, inputToken, userPublicKey, connected]);

  // Handle clear button click
  const handleClearButtonClick = useCallback(() => {
    setInputValue('0');
    if (isMounted.current) {
      setErrorMsg('');
    }
  }, []);

  // Calculate conversion rate
  const getConversionRate = useCallback(() => {
    if (!inputToken || !outputToken || !estimatedOutputAmount || parseFloat(inputValue || '0') <= 0) {
      return `1 ${inputToken?.symbol || 'token'} = 0 ${outputToken?.symbol || 'token'}`;
    }

    const inputAmt = parseFloat(inputValue);
    const outputAmt = parseFloat(estimatedOutputAmount);
    const rate = outputAmt / inputAmt;

    return `1 ${inputToken.symbol} = ${rate.toFixed(6)} ${outputToken.symbol}`;
  }, [inputToken, outputToken, inputValue, estimatedOutputAmount]);

  const conversionRate = useMemo(() => getConversionRate(), [getConversionRate]);

  // Check if a provider is available for selection
  const isProviderAvailable = useCallback((provider: SwapProvider) => {
    return provider === 'Jupiter';
  }, []);

  // Check if the swap button should be enabled
  const isSwapButtonEnabled = useCallback(() => {
    if (!connected || loading) return false;
    if (!isProviderAvailable(activeProvider)) return false;

    const inputAmount = parseFloat(inputValue || '0');
    if (inputAmount <= 0) return false;

    if (currentBalance !== null && !isNaN(currentBalance) && inputAmount > currentBalance) {
      return false;
    }

    return true;
  }, [connected, loading, activeProvider, isProviderAvailable, inputValue, currentBalance]);

  // Function to handle keypad input
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

  // Execute swap
  const handleSwap = useCallback(async () => {
    if (!connected || !userPublicKey) {
      Alert.alert('Wallet not connected', 'Please connect your wallet first.');
      return;
    }

    if (!inputToken || !outputToken) {
      Alert.alert('Tokens not loaded', 'Please wait for tokens to load or select tokens first.');
      return;
    }

    if (isNaN(parseFloat(inputValue)) || parseFloat(inputValue) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount to swap.');
      return;
    }

    setLoading(true);
    setResultMsg('');
    setErrorMsg('');

    try {
      const response = await TradeService.executeSwap(
        inputToken,
        outputToken,
        inputValue,
        userPublicKey,
        transactionSender,
        {
          statusCallback: (status) => {
            if (isMounted.current) {
              setResultMsg(status);

              if (status.toLowerCase().includes('complete') ||
                status.toLowerCase().includes('successful') ||
                status === 'Transaction complete! ✓') {
                setLoading(false);
              }
            }
          },
          isComponentMounted: () => isMounted.current
        },
        activeProvider,
        {
          poolAddress,
          slippage
        }
      );

      if (response.success && response.signature) {
        if (isMounted.current) {
          setResultMsg(`Swap successful!`);
          setSolscanTxSig(response.signature);
          
          setTimeout(() => {
            if (isMounted.current) {
              setResultMsg('');
            }
          }, 5000);
        }
      } else {
        const errorString = response.error?.toString() || '';
        if (errorString.includes('Component unmounted')) {
          return; 
        }
        throw new Error(response.error?.toString() || 'Transaction failed');
      }
    } catch (err: any) {
      if (isMounted.current) {
        let errorMessage = 'Swap failed. ';
        let mayHaveSucceeded = false;

        if (err.message.includes('signature verification')) {
          errorMessage += 'Please try again.';
        } else if (err.message.includes('0x1771')) {
          errorMessage += 'Insufficient balance or price impact too high.';
        } else if (err.message.includes('ExceededSlippage') || err.message.includes('0x1774')) {
          errorMessage += 'Price impact too high.';
        } else if (err.message.includes('confirmation failed') || err.message.includes('may have succeeded')) {
          mayHaveSucceeded = true;
          const signatureMatch = err.message.match(/Signature: ([a-zA-Z0-9]+)/);
          const signature = signatureMatch ? signatureMatch[1] : null;

          if (signature && signature !== 'Unknown') {
            errorMessage = 'Transaction sent but confirmation timed out. ';
            setSolscanTxSig(signature);

            Alert.alert(
              'Transaction Status Uncertain',
              'Your transaction was sent but confirmation timed out. It may have succeeded. You can check the status on Solscan.',
              [
                {
                  text: 'View on Solscan',
                  onPress: () => {
                    const url = `https://solscan.io/tx/${signature}`;
                    Linking.openURL(url).catch(err => {
                      console.error('[SwapScreen] Error opening Solscan URL:', err);
                    });
                  }
                },
                {
                  text: 'OK',
                  onPress: () => {
                    setInputValue('0');
                    fetchBalance();
                  }
                }
              ]
            );
            return;
          } else {
            errorMessage += 'Your transaction may have succeeded but confirmation timed out. Check your wallet for changes.';
          }
        } else {
          errorMessage += err.message;
        }

        setErrorMsg(errorMessage);
        if (!mayHaveSucceeded) {
          Alert.alert('Swap Failed', errorMessage);
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [
    connected,
    userPublicKey,
    inputValue,
    inputToken,
    outputToken,
    transactionSender,
    fetchBalance,
    activeProvider,
    isProviderAvailable,
    loading,
    poolAddress,
    slippage
  ]);

  // View transaction on Solscan
  const viewTransaction = useCallback(() => {
    if (solscanTxSig) {
      const url = `https://solscan.io/tx/${solscanTxSig}`;
      Linking.openURL(url).catch(err => {
        console.error('[SwapScreen] Error opening Solscan URL:', err);
      });
    }
  }, [solscanTxSig]);

  // Function to swap input and output tokens
  const handleSwapTokens = useCallback(async () => {
    if (!isMounted.current || pendingTokenOps.input || pendingTokenOps.output) {
      return;
    }

    const tempInputToken = inputToken;
    const tempOutputToken = outputToken;
    const tempInputValue = inputValue;
    const tempEstimatedOutputAmount = estimatedOutputAmount;

    setPendingTokenOps({ input: true, output: true });

    setInputToken(tempOutputToken);
    setOutputToken(tempInputToken);

    setInputValue(tempEstimatedOutputAmount || '0');
    setEstimatedOutputAmount(tempInputValue);

    setCurrentBalance(null);
    setCurrentTokenPrice(null);
    currentPriceRef.current = null;

    if (tempOutputToken && connected && userPublicKey) {
      try {
        const balance = await fetchTokenBalance(userPublicKey, tempOutputToken);
        if (isMounted.current && balance !== null) {
          setCurrentBalance(balance);
        }
        const price = await fetchTokenPrice(tempOutputToken);
        if (isMounted.current && price !== null) {
          setCurrentTokenPrice(price);
          currentPriceRef.current = price;
        }
      } catch (error) {
        if (isMounted.current) {
          setErrorMsg('Error updating token data after swap.');
          setTimeout(() => setErrorMsg(''), 3000);
        }
      }
    }
    
    setPendingTokenOps({ input: false, output: false });
  }, [
    inputToken, 
    outputToken, 
    inputValue, 
    estimatedOutputAmount, 
    connected, 
    userPublicKey,
    fetchTokenBalance, 
    fetchTokenPrice
  ]);

  // Update effects
  useEffect(() => {
    if (!tokensInitialized) {
      initializeTokens();
    } else if (routeParams.shouldInitialize) {
      setTokensInitialized(false); 
      if (navigation?.setParams) {
        navigation.setParams({ ...routeParams, shouldInitialize: false });
      }
    }
  }, [tokensInitialized, initializeTokens, routeParams, navigation]);

  useEffect(() => {
    setResultMsg('');
    setErrorMsg('');
    setSolscanTxSig('');

    if (!tokensInitialized) {
      initializeTokens();
    } else if (connected && userPublicKey && inputToken) {
      if (priceUpdateTimer.current) {
        clearTimeout(priceUpdateTimer.current);
      }
      
      if (estimateSwapTimer.current) {
        clearTimeout(estimateSwapTimer.current);
      }

      const fetchSequence = async () => {
        if (!isMounted.current) return;
        
        try {
          const balance = await fetchTokenBalance(userPublicKey, inputToken);
          if (!isMounted.current) return;
          
          if (balance !== null && balance !== currentBalance) {
            setCurrentBalance(balance);
          }
          
          setTimeout(async () => {
            if (!isMounted.current) return;
            
            const price = await fetchTokenPrice(inputToken);
            if (!isMounted.current) return;
            
            if (price !== null && price !== currentPriceRef.current) {
              currentPriceRef.current = price;
              
              priceUpdateTimer.current = setTimeout(() => {
                if (isMounted.current) {
                  setCurrentTokenPrice(price);
                  setTimeout(() => {
                    if (isMounted.current && parseFloat(inputValue) > 0) {
                      estimateSwap();
                    }
                  }, 300);
                }
              }, PRICE_UPDATE_DEBOUNCE / 2);
            }
          }, 100);
        } catch (error) {
          console.error('[SwapScreen] Error updating token data:', error);
        }
      };
      
      const timer = setTimeout(fetchSequence, 200);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [tokensInitialized, initializeTokens, connected, userPublicKey, inputToken]);
  
  useEffect(() => {
    if (estimateSwapTimer.current) {
      clearTimeout(estimateSwapTimer.current);
    }
    
    estimateSwapTimer.current = setTimeout(() => {
      if (isMounted.current) {
        if (parseFloat(inputValue) > 0) {
          estimateSwap();
        } else if (estimatedOutputAmount !== '0') {
          setEstimatedOutputAmount('0');
          setOutputTokenUsdValue('$0.00');
        }
      }
    }, 300);
    
    return () => {
      if (estimateSwapTimer.current) {
        clearTimeout(estimateSwapTimer.current);
      }
    };
  }, [inputValue, inputToken, outputToken]);

  return {
    inputToken,
    outputToken,
    currentBalance,
    currentTokenPrice,
    inputValue,
    estimatedOutputAmount,
    outputTokenUsdValue,
    activeProvider,
    showSelectTokenModal,
    selectingWhichSide,
    poolAddress,
    slippage,
    loading,
    resultMsg,
    errorMsg,
    solscanTxSig,
    pendingTokenOps,
    conversionRate,
    setInputValue,
    setActiveProvider,
    setShowSelectTokenModal,
    setSelectingWhichSide,
    setPoolAddress,
    setSlippage,
    handleTokenSelected,
    handleMaxButtonClick,
    handlePercentageButtonClick,
    handleClearButtonClick,
    handleKeyPress,
    handleSwap,
    viewTransaction,
    calculateUsdValue,
    isProviderAvailable,
    isSwapButtonEnabled,
    handleSwapTokens,
    fetchBalance,
    getTokenPrice
  };
}