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
    sendBase64Transaction: (base64Tx: string, connection: any, options?: any) => Promise<string> 
  },
  navigation: any
) {
  console.warn('[SwapLogic] Hook initialized with params:', JSON.stringify(routeParams));

  // UI States
  const [activeProvider, setActiveProvider] = useState<SwapProvider>('JupiterUltra');
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
  const lastCalculatedPriceRef = useRef<{
    inputAmount: string;
    inputPrice: number | null;
    outputAmount: string;
    outputPrice: number | null;
  }>({
    inputAmount: '',
    inputPrice: null,
    outputAmount: '',
    outputPrice: null
  });
  
  // Debounce timer refs
  const priceUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const estimateSwapTimer = useRef<NodeJS.Timeout | null>(null);
  const lastInitializedMints = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      console.warn('[SwapScreen] Component unmounting, cleaning up');
      isMounted.current = false;
      setPendingTokenOps({ input: false, output: false });
      
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
    const mintsKey = `${routeParams.inputMint || routeParams.inputToken?.address}-${routeParams.outputMint || routeParams.outputToken?.address}`;
    if (tokensInitialized && lastInitializedMints.current === mintsKey) {
      console.warn('[SwapScreen] Tokens already initialized for these parameters, skipping.');
      return;
    }

    // Don't initialize if already initializing or completed
    if (!isMounted.current || (pendingTokenOps.input && pendingTokenOps.output)) {
      return;
    }

    lastInitializedMints.current = mintsKey;

    try {
      // Mark operations as pending
      setPendingTokenOps({ input: true, output: true });
      console.warn('[SwapScreen] Initializing tokens...', routeParams);

      // Fetch initial tokens
      let initialInputToken: TokenInfo | null = null;
      let initialOutputToken: TokenInfo | null = null;

      // 1. INPUT TOKEN INITIALIZATION
      console.warn('[SwapScreen] Starting input token init, routeParams:', JSON.stringify(routeParams));
      try {
        if (routeParams.inputToken) {
          console.warn('[SwapScreen] Using full input token from route params:', routeParams.inputToken.symbol);
          initialInputToken = routeParams.inputToken;
        } else if (routeParams.inputMint) {
          console.warn('[SwapScreen] Fetching input token metadata for mint:', routeParams.inputMint);
          initialInputToken = await fetchTokenMetadata(routeParams.inputMint);
          
          // Special case: if fetching fails but it's SOL, use the default
          if (!initialInputToken && routeParams.inputMint === DEFAULT_SOL_TOKEN.address) {
            console.warn('[SwapScreen] Fetching SOL metadata failed, using default SOL constant');
            initialInputToken = DEFAULT_SOL_TOKEN;
          }
        }
        
        // Final fallback for input token
        if (!initialInputToken) {
          console.warn('[SwapScreen] No input token after checks, falling back to default SOL');
          initialInputToken = DEFAULT_SOL_TOKEN;
        }
      } catch (err) {
        console.error('[SwapScreen] Error during input token initialization:', err);
        initialInputToken = DEFAULT_SOL_TOKEN;
      }

      console.warn('[SwapScreen] Input token initialized:', initialInputToken?.symbol);

      // 2. OUTPUT TOKEN INITIALIZATION
      console.warn('[SwapScreen] Starting output token init');
      try {
        if (routeParams.outputToken) {
          console.warn('[SwapScreen] Using full output token from route params:', routeParams.outputToken.symbol);
          initialOutputToken = routeParams.outputToken;
        } else if (routeParams.outputMint) {
          console.warn('[SwapScreen] Fetching output token metadata for mint:', routeParams.outputMint);
          initialOutputToken = await fetchTokenMetadata(routeParams.outputMint);
          
          // Special case: if fetching fails but it's USDC, use the default
          if (!initialOutputToken && routeParams.outputMint === DEFAULT_USDC_TOKEN.address) {
            console.warn('[SwapScreen] Fetching USDC metadata failed, using default USDC constant');
            initialOutputToken = DEFAULT_USDC_TOKEN;
          }
        }
        
        // Final fallback for output token (ensure it's different from input)
        if (!initialOutputToken) {
          console.warn('[SwapScreen] No output token after checks, falling back to default USDC');
          initialOutputToken = DEFAULT_USDC_TOKEN;
          
          // If input and output would be the same, use SOL/USDC combo correctly
          if (initialInputToken?.address === initialOutputToken?.address) {
            console.warn('[SwapScreen] Input and output match, adjusting output token to prevent same-token swap');
            if (initialInputToken?.address === DEFAULT_SOL_TOKEN.address) {
              initialOutputToken = DEFAULT_USDC_TOKEN;
            } else {
              initialOutputToken = DEFAULT_SOL_TOKEN;
            }
          }
        }
      } catch (err) {
        console.error('[SwapScreen] Error during output token initialization:', err);
        initialOutputToken = DEFAULT_USDC_TOKEN;
      }

      console.warn('[SwapScreen] Output token initialized:', initialOutputToken?.symbol);

      console.warn('[SwapScreen] Initial tokens set:', {
        input: initialInputToken?.symbol,
        output: initialOutputToken?.symbol
      });

      // Handle extreme case where everything failed (should be impossible now)
      if (!initialInputToken || !initialOutputToken) {
        console.error('[SwapScreen] Failed to initialize tokens after multiple attempts');
        setErrorMsg('Failed to load token information. Please try again.');
        setPendingTokenOps({ input: false, output: false });
        return;
      }

      if (isMounted.current) {
        // Set the tokens
        setInputToken(initialInputToken);
        setOutputToken(initialOutputToken);
        setPendingTokenOps({ input: false, output: false });
        setTokensInitialized(true);

        // If route provided an amount, set it
        if (routeParams.inputAmount) {
          console.warn('[SwapScreen] Setting input amount from route:', routeParams.inputAmount);
          setInputValue(routeParams.inputAmount);
        }

        // Fetch balance and price only if wallet is connected
        if (userPublicKey && initialInputToken) {
          // Load token details in sequence to avoid parallel fetch issues
          const balance = await fetchTokenBalance(userPublicKey, initialInputToken);
          if (isMounted.current && balance !== null) {
            setCurrentBalance(balance);
            
            // Fetch price after balance is loaded
            const price = await fetchTokenPrice(initialInputToken);
            if (isMounted.current && price !== null) {
              setCurrentTokenPrice(price);
              currentPriceRef.current = price; // Update the price ref
            }
          }
        }
      }
    } catch (error) {
      console.error('[SwapScreen] Unexpected error during token initialization:', error);
      setPendingTokenOps({ input: false, output: false });
    }
  }, [
    userPublicKey, 
    routeParams.inputMint, 
    routeParams.outputMint, 
    routeParams.inputToken, 
    routeParams.outputToken, 
    routeParams.inputAmount
  ]);

  // Fetch token balance
  const fetchBalance = useCallback(async (tokenToUse?: TokenInfo | null) => {
    if (!connected || !userPublicKey) {
      console.warn("[SwapScreen] No wallet connected, cannot fetch balance");
      return null;
    }

    const tokenForBalance = tokenToUse || inputToken;

    // Cannot fetch balance if token is null
    if (!tokenForBalance) {
      console.warn("[SwapScreen] No token provided, cannot fetch balance");
      return null;
    }

    try {
      console.warn(`[SwapScreen] Fetching balance for ${tokenForBalance.symbol}...`);
      const balance = await fetchTokenBalance(userPublicKey, tokenForBalance);

      // Only update state if component is still mounted and balance is non-null
      if (isMounted.current) {
        // Only update if the balance actually changed
        if (balance !== null && balance !== currentBalance) {
        console.warn(`[SwapScreen] Token balance fetched for ${tokenForBalance.symbol}: ${balance}`);
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

    // Cannot fetch price if token is null
    if (!tokenForPrice) {
      console.warn("[SwapScreen] No token provided, cannot fetch price");
      return null;
    }

    try {
      console.warn(`[SwapScreen] Fetching price for ${tokenForPrice.symbol}...`);
      const price = await fetchTokenPrice(tokenForPrice);
      
      if (isMounted.current) {
        console.warn(`[SwapScreen] Token price fetched for ${tokenForPrice.symbol}: ${price}`);
        
        // Only update state if it's the input token and the price actually changed
        if (tokenForPrice === inputToken && price !== null && price !== currentPriceRef.current) {
          // Clear any pending price update timer
          if (priceUpdateTimer.current) {
            clearTimeout(priceUpdateTimer.current);
          }
          
          // Update price with debounce to prevent frequent re-renders
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
    // Add better error handling for invalid inputs
    if (!tokenPrice || tokenPrice <= 0 || !amount || isNaN(parseFloat(amount))) {
      return '$0.00';
    }

    try {
      const numericAmount = parseFloat(amount);
      const usdValue = numericAmount * tokenPrice;

      // Format based on value size
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
    if (!connected || parseFloat(inputValue) <= 0 || !inputToken || !outputToken) {
      // Reset values when conditions aren't met
      if (estimatedOutputAmount !== '0') {
        setEstimatedOutputAmount('0');
      }
      if (outputTokenUsdValue !== '$0.00') {
        setOutputTokenUsdValue('$0.00');
      }
      return;
    }
    
    // Check if we need to recalculate based on cached values
    const shouldRecalculate = 
      inputValue !== lastCalculatedPriceRef.current.inputAmount ||
      currentPriceRef.current !== lastCalculatedPriceRef.current.inputPrice;
    
    if (!shouldRecalculate) {
      return; // Skip calculation if nothing has changed
    }

    try {
      // Clear any pending estimate
      if (estimateSwapTimer.current) {
        clearTimeout(estimateSwapTimer.current);
      }
      
      // Update with debounce to prevent frequent recalculations
      estimateSwapTimer.current = setTimeout(async () => {
        if (!isMounted.current) return;
        
        // Get prices for both tokens
        const inputPrice = await getTokenPrice(inputToken);
        const outputPrice = await getTokenPrice(outputToken);

        if (inputPrice && outputPrice && isMounted.current) {
          const inputValueNum = parseFloat(inputValue);

          // Calculate USD value
          const inputValueUsd = inputValueNum * inputPrice;

          // Calculate output amount based on equivalent USD value (minus simulated 0.3% fee)
          const estimatedOutput = (inputValueUsd / outputPrice) * 0.997;

          // Format the number properly based on token decimals
          const formattedOutput = estimatedOutput.toFixed(outputToken.decimals <= 6 ? outputToken.decimals : 6);
          const formattedUsdValue = calculateUsdValue(formattedOutput, outputPrice);

          // Update state only if values have changed
          if (formattedOutput !== estimatedOutputAmount) {
            setEstimatedOutputAmount(formattedOutput);
          }
          
          if (formattedUsdValue !== outputTokenUsdValue) {
            setOutputTokenUsdValue(formattedUsdValue);
          }

          // Update the cache
          lastCalculatedPriceRef.current = {
            inputAmount: inputValue,
            inputPrice,
            outputAmount: formattedOutput,
            outputPrice
          };

          console.warn(`[SwapScreen] Estimate: ${inputValueNum} ${inputToken.symbol} (${inputPrice} USD) → ${estimatedOutput} ${outputToken.symbol} (${outputPrice} USD)`);
        }
      }, 300); // Short debounce for estimate calculation
    } catch (error) {
      console.error('[SwapScreen] Error estimating swap:', error);
    }
  }, [connected, inputValue, getTokenPrice, inputToken, outputToken, outputTokenUsdValue, estimatedOutputAmount, calculateUsdValue]);

  // Handle token selection
  const handleTokenSelected = useCallback(async (token: TokenInfo) => {
    if (!isMounted.current) return;

    try {
      console.warn(`[SwapScreen] Token selected: ${token.symbol || 'Unknown'}`);

      // Mark token operation as pending
      if (selectingWhichSide === 'input') {
        setPendingTokenOps(prev => ({ ...prev, input: true }));
      } else {
        setPendingTokenOps(prev => ({ ...prev, output: true }));
      }

      // Cancel any pending price updates and estimate calculations
      if (priceUpdateTimer.current) {
        clearTimeout(priceUpdateTimer.current);
        priceUpdateTimer.current = null;
      }
      
      if (estimateSwapTimer.current) {
        clearTimeout(estimateSwapTimer.current);
        estimateSwapTimer.current = null;
      }

      // Ensure we have complete token info - add timeout protection
      let completeToken: TokenInfo | null = null;
      
      // Set up a timeout promise that will resolve after 8 seconds
      const timeoutPromise = new Promise<TokenInfo>(resolve => {
        setTimeout(() => {
          console.warn(`[SwapScreen] Token fetch timeout for ${token.symbol}, using available data`);
          resolve(token); // Return original token on timeout
        }, 8000);
      });
      
      // Race the token fetch against the timeout
      try {
        completeToken = await Promise.race([
          ensureCompleteTokenInfo(token),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('[SwapScreen] Error fetching complete token info:', error);
        completeToken = token; // Use original token as fallback
      }

      if (!isMounted.current) return;
      
      // Safely proceed with either complete token or original token
      if (!completeToken) {
        throw new Error('Failed to get token information');
      }

      if (selectingWhichSide === 'input') {
        console.warn('[SwapScreen] Input token changed to', completeToken.symbol);

        // Update input token state immediately
        setInputToken(completeToken);
        setPendingTokenOps(prev => ({ ...prev, input: false }));

        // Reset input value and fetch new balance in sequence
        setInputValue('0');
        setCurrentBalance(null);
        setCurrentTokenPrice(null);
        currentPriceRef.current = null;

        // Show the modal as closed immediately
        setShowSelectTokenModal(false);

        // Fetch balance and price for new token with small delay to allow UI to update
        setTimeout(async () => {
          if (isMounted.current && userPublicKey) {
            try {
              // First fetch balance
              const newBalance = await fetchBalance(completeToken);
              
              if (!isMounted.current) return;
              
              // Then fetch price (sequentially to avoid race conditions)
              if (newBalance !== null) {
                const price = await getTokenPrice(completeToken);
                
                if (!isMounted.current) return;
                
                if (price !== null) {
                  currentPriceRef.current = price;
                  
                  // Update price state with debounce
                  priceUpdateTimer.current = setTimeout(() => {
                    if (isMounted.current) {
                      setCurrentTokenPrice(price);
                      
                      // Finally trigger output calculation
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
              console.error('[SwapScreen] Error during token change updates:', error);
              
              // Clean up and set some default values to prevent UI being stuck
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
        console.warn('[SwapScreen] Output token changed to', completeToken.symbol);
        
        // Update output token state
        setOutputToken(completeToken);
        setPendingTokenOps(prev => ({ ...prev, output: false }));

        // Close the modal immediately
      setShowSelectTokenModal(false);
        
        // Reset estimated output
        setEstimatedOutputAmount('');
        setOutputTokenUsdValue('$0.00');
        
        // Trigger new output estimate after a short delay
        setTimeout(() => {
          if (isMounted.current && inputToken && parseFloat(inputValue) > 0) {
            estimateSwap();
          }
        }, 300);
      }
    } catch (error) {
      console.error('[SwapScreen] Error selecting token:', error);
      // Reset pending flags
      if (selectingWhichSide === 'input') {
        setPendingTokenOps(prev => ({ ...prev, input: false }));
      } else {
        setPendingTokenOps(prev => ({ ...prev, output: false }));
      }

      if (isMounted.current) {
        setErrorMsg('Failed to load token information');
        setTimeout(() => isMounted.current && setErrorMsg(''), 3000);
        // Always close the modal even on error
        setShowSelectTokenModal(false);
      }
    }
  }, [selectingWhichSide, fetchBalance, getTokenPrice, userPublicKey, estimateSwap, inputValue, inputToken]);

  // Handle max button click
  const handleMaxButtonClick = useCallback(async () => {
    console.warn("[SwapScreen] MAX button clicked, current balance:", currentBalance);

    if (isMounted.current) {
      setErrorMsg(''); // Clear any existing error messages
    }

    // Validate wallet connection
    if (!connected || !userPublicKey || !inputToken) {
      if (isMounted.current) {
        Alert.alert(
          "Wallet Not Connected",
          "Please connect your wallet to view your balance."
        );
      }
      return;
    }

    // If we already have a balance, use it
    if (currentBalance !== null && currentBalance > 0) {
      setInputValue(String(currentBalance));
      return;
    }

    // Otherwise, fetch fresh balance
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

      // Check if we have a balance after fetching
      if (balance !== null && balance > 0 && isMounted.current) {
        console.warn("[SwapScreen] Setting max amount from fetched balance:", balance);
        setInputValue(String(balance));
      } else if (isMounted.current) {
        console.warn("[SwapScreen] Balance fetch returned:", balance);
        Alert.alert(
          "Balance Unavailable",
          `Could not get your ${inputToken.symbol} balance. Please check your wallet connection.`
        );
      }
    } catch (error) {
      console.error("[SwapScreen] Error in MAX button handler:", error);
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
    console.warn(`[SwapScreen] ${percentage}% button clicked, current balance:`, currentBalance);

    if (isMounted.current) {
      setErrorMsg(''); // Clear any existing error messages
    }

    // Validate wallet connection
    if (!connected || !userPublicKey || !inputToken) {
      if (isMounted.current) {
        Alert.alert(
          "Wallet Not Connected",
          "Please connect your wallet to view your balance."
        );
      }
      return;
    }

    // If we already have a balance, use it
    if (currentBalance !== null && currentBalance > 0) {
      const percentageAmount = (currentBalance * percentage) / 100;
      setInputValue(String(percentageAmount));
      return;
    }

    // Otherwise, fetch fresh balance
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

      // Check if we have a balance after fetching
      if (balance !== null && balance > 0 && isMounted.current) {
        console.warn(`[SwapScreen] Setting ${percentage}% amount from fetched balance:`, balance);
        const percentageAmount = (balance * percentage) / 100;
        setInputValue(String(percentageAmount));
      } else if (isMounted.current) {
        console.warn("[SwapScreen] Balance fetch returned:", balance);
        Alert.alert(
          "Balance Unavailable",
          `Could not get your ${inputToken.symbol} balance. Please check your wallet connection.`
        );
      }
    } catch (error) {
      console.error(`[SwapScreen] Error in ${percentage}% button handler:`, error);
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
    console.warn("[SwapScreen] Clear button clicked");
    setInputValue('0');
    if (isMounted.current) {
      setErrorMsg(''); // Clear any existing error messages
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

  // Memoize the conversion rate to prevent unnecessary calculations
  const conversionRate = useMemo(() => getConversionRate(), [getConversionRate]);

  // Check if a provider is available for selection
  const isProviderAvailable = useCallback((provider: SwapProvider) => {
    return provider === 'JupiterUltra';
  }, []);

  // Check if the swap button should be enabled
  const isSwapButtonEnabled = useCallback(() => {
    if (!connected || loading) return false;

    // Check if the provider is available
    if (!isProviderAvailable(activeProvider)) return false;

    // Check if input amount is valid and not greater than balance
    const inputAmount = parseFloat(inputValue || '0');
    if (inputAmount <= 0) return false;

    // If we have a current balance, check if input amount exceeds it
    if (currentBalance !== null && inputAmount > currentBalance) {
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
    console.warn('[SwapScreen] ⚠️⚠️⚠️ SWAP BUTTON CLICKED ⚠️⚠️⚠️');
    console.warn(`[SwapScreen] Provider: ${activeProvider}, Amount: ${inputValue} ${inputToken?.symbol || 'token'}`);

    if (!connected || !userPublicKey) {
      console.warn('[SwapScreen] Error: Wallet not connected');
      Alert.alert('Wallet not connected', 'Please connect your wallet first.');
      return;
    }

    if (!inputToken || !outputToken) {
      console.warn('[SwapScreen] Error: Tokens not initialized');
      Alert.alert('Tokens not loaded', 'Please wait for tokens to load or select tokens first.');
      return;
    }

    if (isNaN(parseFloat(inputValue)) || parseFloat(inputValue) <= 0) {
      console.warn('[SwapScreen] Error: Invalid amount input:', inputValue);
      Alert.alert('Invalid amount', 'Please enter a valid amount to swap.');
      return;
    }

    console.warn('[SwapScreen] Starting swap with:', {
      provider: activeProvider,
      inputToken: inputToken.symbol,
      outputToken: outputToken.symbol,
      amount: inputValue
    });

    setLoading(true);
    setResultMsg('');
    setErrorMsg('');

    try {
      // Execute the swap using the trade service with the selected provider
      console.warn('[SwapScreen] Calling TradeService.executeSwap');
      const response = await TradeService.executeSwap(
        inputToken,
        outputToken,
        inputValue,
        userPublicKey,
        transactionSender,
        {
          statusCallback: (status) => {
            console.warn('[SwapScreen] Status update:', status);
            if (isMounted.current) {
              setResultMsg(status);

              // Check if the status message indicates completion
              if (status.toLowerCase().includes('complete') ||
                status.toLowerCase().includes('successful') ||
                status === 'Transaction complete! ✓') {
                console.warn('[SwapScreen] Completion status received, resetting loading state');
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

      console.warn('[SwapScreen] TradeService.executeSwap response:', JSON.stringify(response));

      if (response.success && response.signature) {
        if (isMounted.current) {
          console.warn('[SwapScreen] Swap successful! Signature:', response.signature);
          setResultMsg(`Swap successful!`);
          setSolscanTxSig(response.signature);
        }
      } else {
        console.warn('[SwapScreen] Swap response not successful:', response);
        const errorString = response.error?.toString() || '';
        if (errorString.includes('Component unmounted')) {
          console.warn('[SwapScreen] Component unmounted during swap, ignoring error.');
          return; // Exit silently
        }

        throw new Error(response.error?.toString() || 'Transaction failed');
      }
    } catch (err: any) {
      console.error('[SwapScreen] Swap error caught:', err);
      console.error('[SwapScreen] Error details:', JSON.stringify(err, null, 2));

      if (isMounted.current) {
        // Format error message for user
        let errorMessage = 'Swap failed. ';
        let mayHaveSucceeded = false;

        if (err.message.includes('signature verification')) {
          errorMessage += 'Please try again.';
        } else if (err.message.includes('0x1771')) {
          errorMessage += 'Insufficient balance or price impact too high.';
        } else if (err.message.includes('ExceededSlippage') || err.message.includes('0x1774')) {
          errorMessage += 'Price impact too high.';
        } else if (err.message.includes('confirmation failed') || err.message.includes('may have succeeded')) {
          // Handle the case where transaction might have succeeded
          mayHaveSucceeded = true;

          // Extract signature if available
          const signatureMatch = err.message.match(/Signature: ([a-zA-Z0-9]+)/);
          const signature = signatureMatch ? signatureMatch[1] : null;

          if (signature && signature !== 'Unknown') {
            errorMessage = 'Transaction sent but confirmation timed out. ';
            setSolscanTxSig(signature);

            // Show a different alert for this case
            Alert.alert(
              'Transaction Status Uncertain',
              'Your transaction was sent but confirmation timed out. It may have succeeded. You can check the status on Solscan.',
              [
                {
                  text: 'View on Solscan',
                  onPress: () => {
                    // Open transaction on Solscan
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

            // Return early so we don't show the standard error alert
            return;
          } else {
            errorMessage += 'Your transaction may have succeeded but confirmation timed out. Check your wallet for changes.';
          }
        } else {
          errorMessage += err.message;
        }

        console.warn('[SwapScreen] Setting error message:', errorMessage);
        setErrorMsg(errorMessage);

        if (!mayHaveSucceeded) {
          Alert.alert('Swap Failed', errorMessage);
        }
      }
    } finally {
      if (isMounted.current) {
        console.warn('[SwapScreen] Swap process completed, resetting loading state');
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
    loading
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
      console.warn('[SwapScreen] Token operations pending, cannot swap tokens now.');
      return;
    }

    console.warn('[SwapScreen] Swapping input and output tokens.');

    // Store current values temporarily
    const tempInputToken = inputToken;
    const tempOutputToken = outputToken;
    const tempInputValue = inputValue;
    const tempEstimatedOutputAmount = estimatedOutputAmount;

    // Set operations as pending
    setPendingTokenOps({ input: true, output: true });

    // Swap tokens
    setInputToken(tempOutputToken);
    setOutputToken(tempInputToken);

    // Swap amounts (new input amount becomes the previous output amount)
    // Reset output amount as it will be recalculated
    setInputValue(tempEstimatedOutputAmount || '0'); // Use '0' if undefined
    setEstimatedOutputAmount(tempInputValue); // Old input becomes new 'estimated' output temporarily, will be overwritten

    // Reset and fetch new data for the new input token
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
        console.error('[SwapScreen] Error fetching data for new input token after swap:', error);
        if (isMounted.current) {
          setErrorMsg('Error updating token data after swap.');
          setTimeout(() => setErrorMsg(''), 3000);
        }
      }
    }
    
    // Mark operations as complete
    setPendingTokenOps({ input: false, output: false });

    // Trigger a re-estimation of the swap if the new input value is greater than 0
    if (parseFloat(tempEstimatedOutputAmount || '0') > 0) {
      // We need to call estimateSwap or a similar function here
      // For now, this will be handled by the useEffect that depends on inputValue or inputToken
      console.warn('[SwapScreen] Triggering swap estimation after token swap.');
    }
  }, [
    inputToken, 
    outputToken, 
    inputValue, 
    estimatedOutputAmount, 
    connected, 
    userPublicKey,
    fetchTokenBalance, 
    fetchTokenPrice,
    setPendingTokenOps
  ]);

  // Update effects
  useEffect(() => {
    if (!tokensInitialized) {
      initializeTokens();
    } else if (routeParams.shouldInitialize) {
      // If the component needs to re-initialize with new route params
      console.warn('[SwapScreen] Re-initializing from route params', routeParams);
      setTokensInitialized(false); // This will trigger initializeTokens() in the next effect

      // Clear the shouldInitialize flag to prevent re-initialization loops
      if (navigation?.setParams) {
        // Update the route params to remove shouldInitialize
        navigation.setParams({ ...routeParams, shouldInitialize: false });
      }
    }
  }, [tokensInitialized, initializeTokens, routeParams, navigation]);

  // Reset states and handle token updates on visibility changes
  useEffect(() => {
    // Reset states
    setResultMsg('');
    setErrorMsg('');
    setSolscanTxSig('');

    if (tokensInitialized) {
      console.warn('[SwapScreen] Component visible, scheduling background updates...');
    }

    // Initialize tokens if not already initialized
    if (!tokensInitialized) {
      initializeTokens();
    } else if (connected && userPublicKey && inputToken) {
      // If tokens are already initialized and we have a wallet connected, 
      // fetch data in a controlled, sequential manner with proper debouncing
      
      // Clear any pending timers to avoid conflicts
      if (priceUpdateTimer.current) {
        clearTimeout(priceUpdateTimer.current);
      }
      
      if (estimateSwapTimer.current) {
        clearTimeout(estimateSwapTimer.current);
        }

      // Use a sequence of operations with proper timing gaps
      // First check balance, then price, then calculate estimates
      const fetchSequence = async () => {
        if (!isMounted.current) return;
        
        try {
          // 1. First fetch balance
          const balance = await fetchTokenBalance(userPublicKey, inputToken);
          if (!isMounted.current) return;
          
          if (balance !== null && balance !== currentBalance) {
            setCurrentBalance(balance);
          }
          
          // 2. Next fetch input token price (with small delay)
          setTimeout(async () => {
            if (!isMounted.current) return;
            
            const price = await fetchTokenPrice(inputToken);
            if (!isMounted.current) return;
            
            if (price !== null && price !== currentPriceRef.current) {
              currentPriceRef.current = price;
              
              // Debounce the actual state update
              priceUpdateTimer.current = setTimeout(() => {
                if (isMounted.current) {
                  setCurrentTokenPrice(price);

                  // 3. Finally, estimate the swap (with further delay)
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
      
      // Start the sequence with a small delay
      const timer = setTimeout(fetchSequence, 200);

      return () => {
        clearTimeout(timer);
        if (priceUpdateTimer.current) {
          clearTimeout(priceUpdateTimer.current);
        }
        if (estimateSwapTimer.current) {
          clearTimeout(estimateSwapTimer.current);
        }
      };
    }
  }, [tokensInitialized, initializeTokens, connected, userPublicKey, inputToken, currentTokenPrice, currentBalance, estimateSwap, inputValue]);
  
  // Update output estimate when input changes, but with debounce
  useEffect(() => {
    // Clear any pending estimate
    if (estimateSwapTimer.current) {
      clearTimeout(estimateSwapTimer.current);
    }
    
    // Schedule new estimate with debounce
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
  }, [inputValue, estimateSwap, estimatedOutputAmount]);

  return {
    // Token data
    inputToken,
    outputToken,
    currentBalance,
    currentTokenPrice,
    
    // UI state
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
    
    // Computed values
    conversionRate,
    
    // State updaters
    setInputValue,
    setActiveProvider,
    setShowSelectTokenModal,
    setSelectingWhichSide,
    setPoolAddress,
    setSlippage,
    
    // Action handlers
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
    
    // Token operations
    fetchBalance,
    getTokenPrice
  };
} 