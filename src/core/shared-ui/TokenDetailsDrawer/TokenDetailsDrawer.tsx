import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
  ScrollView,
  Linking,
  Dimensions,
  ImageStyle,
  StyleProp,
  Animated,
  PanResponder,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { styles } from './TokenDetailsDrawer.styles';
import { fetchUserAssets } from '@/modules/data-module/utils/fetch';
import { Timeframe, useCoingecko } from '@/modules/data-module/hooks/useCoingecko';
import { fetchJupiterTokenData } from '@/modules/data-module/utils/tokenUtils';
// Removed: import { getTokenRiskReport, TokenRiskReport, getRiskScoreColor, getRiskLevel, getRiskLevelColor, RiskLevel } from '@/shared/services/rugCheckService';
// Removed: import LineGraph from '@/core/shared-ui/TradeCard/LineGraph';
import COLORS from '@/assets/colors';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
// Removed: import { TokenInfo } from '@/modules/data-module';

const { width, height } = Dimensions.get('window');

// Navigation type - Simplified, no longer references SwapScreen
type TokenDetailsDrawerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Authenticated'>;


interface TokenDetailsDrawerProps {
  visible: boolean;
  onClose: () => void;
  tokenMint: string;
  loading?: boolean;
  initialData?: {
    symbol?: string;
    name?: string;
    logoURI?: string;
    // Removed: isCollection?: boolean;
    // Removed: collectionData?: any;
    // Removed: nftData?: any;
  };
}

const formatLargeNumber = (num: number): string => {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

const formatTokenAmount = (amount: number, decimals: number): string => {
  if (isNaN(amount) || isNaN(decimals)) return '0';
  const tokenAmount = amount / Math.pow(10, decimals);
  if (tokenAmount < 0.001 && tokenAmount > 0)
    return tokenAmount.toExponential(4);
  if (tokenAmount >= 1000) return tokenAmount.toFixed(2);
  if (tokenAmount >= 1) return tokenAmount.toFixed(4);
  return tokenAmount.toFixed(6);
};

const TokenDetailsDrawer: React.FC<TokenDetailsDrawerProps> = ({
  visible,
  onClose,
  tokenMint,
  loading,
  initialData,
}) => {
  const navigation = useNavigation<TokenDetailsDrawerNavigationProp>();
  
  const [tokenData, setTokenData] = useState<any>(null); // Changed to any
  const [heliusTokenData, setHeliusTokenData] = useState<any>(null);
  const [loadingTokenData, setLoadingTokenData] = useState(false);
  const [loadingHelius, setLoadingHelius] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'market'>('overview');

  // Removed: Risk analysis state
  // const [riskReport, setRiskReport] = useState<TokenRiskReport | null>(null);
  // const [loadingRiskReport, setLoadingRiskReport] = useState(false);
  // const [riskReportError, setRiskReportError] = useState<string | null>(null);

  const {
    timeframe,
    setTimeframe,
    graphData,
    timestamps,
    timeframePrice,
    coinError,
    refreshCoinData,
    loadingOHLC,
    setSelectedCoinId,
    marketCap,
    fdv,
    liquidityScore,
    timeframeChangePercent,
  } = useCoingecko();

  const isLoading = loading || loadingTokenData;

  // --- DRAG LOGIC ---
  const panY = useRef(new Animated.Value(height)).current;
  const lastPanY = useRef(0);

  useEffect(() => {
    if (visible) {
      // Instantly show the drawer at position 0
      panY.setValue(0);
    } else {
      // Instantly hide the drawer off-screen
      panY.setValue(height);
    }
  }, [visible, panY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dy }) => {
        // Only allow dragging down
        if (dy > 0) {
          panY.setValue(dy);
        }
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 150 || vy > 0.5) {
          // Animate out (close)
          Animated.timing(panY, {
            toValue: height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            panY.setValue(height);
          });
        } else {
          // Snap back to open
          Animated.timing(panY, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible && tokenMint) {
      // Removed: if (!initialData?.isCollection && !initialData?.nftData) {
        fetchTokenDetails();
      // }
      fetchHeliusData();
      // Removed: fetchRiskReport();
    }
  }, [visible, tokenMint, initialData]);

  const fetchTokenDetails = async () => {
    setLoadingTokenData(true);
    setError(null);
    try {
      const data = await fetchJupiterTokenData(tokenMint);
      if (data) {
        setTokenData(data);
        if (data.extensions?.coingeckoId) {
          setSelectedCoinId(data.extensions.coingeckoId.toLowerCase());
        }
      } else {
        setError('Token data not found');
      }
    } catch (err) {
      setError('Failed to load token details');
    } finally {
      setLoadingTokenData(false);
    }
  };

  const fetchHeliusData = async () => {
    if (!tokenMint) return;
    setLoadingHelius(true);
    try {
      const dummyWallet = '11111111111111111111111111111111';
      const result = await fetchUserAssets(dummyWallet);
      const tokenInfo = result.items.find(
        (item: any) => item.id === tokenMint || item.mint === tokenMint,
      );
      if (tokenInfo) {
        setHeliusTokenData(tokenInfo);
      }
    } catch (err) {
      // handle error if needed
    } finally {
      setLoadingHelius(false);
    }
  };

  // Removed: fetchRiskReport

  const openExplorer = () => {
    Linking.openURL(`https://solscan.io/token/${tokenMint}`);
  };

  // Removed: openTensor
  // Removed: openMagicEden

  // Removed: handleNavigateToSwap

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'overview' && styles.activeTabButton,
        ]}
        onPress={() => setActiveTab('overview')}>
        <Text
          style={[
            styles.tabText,
            activeTab === 'overview' && styles.activeTabText,
          ]}>
          Overview
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'market' && styles.activeTabButton,
        ]}
        onPress={() => setActiveTab('market')}>
        <Text
          style={[
            styles.tabText,
            activeTab === 'market' && styles.activeTabText,
          ]}>
          Market
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      {(['1H', '1D', '1W', '1M', 'All'] as Timeframe[]).map(tf => (
        <TouchableOpacity
          key={tf}
          style={[
            styles.timeframeButton,
            timeframe === tf && styles.activeTimeframeButton,
          ]}
          onPress={() => setTimeframe(tf)}>
          <Text
            style={[
              styles.timeframeText,
              timeframe === tf && styles.activeTimeframeText,
            ]}>
            {tf}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => {
    // Removed: const isNftOrCollection = initialData?.isCollection || initialData?.nftData;
    // Simplified to only handle generic tokens
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionText}>
            {tokenData?.extensions?.description || 'No description available.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Token Address</Text>
            <Text
              style={styles.detailValue}
              numberOfLines={1}
              ellipsizeMode="middle">
              {tokenMint}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Decimals</Text>
            <Text style={styles.detailValue}>{tokenData?.decimals ?? '-'}</Text>
          </View>

          {heliusTokenData?.token_info && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Token Standard</Text>
              <Text style={styles.detailValue}>
                {heliusTokenData.token_info.token_program ===
                  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
                  ? 'SPL Token'
                  : heliusTokenData.token_info.token_program}
              </Text>
            </View>
          )}

          {tokenData?.tags && tokenData.tags.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tags</Text>
              <View style={styles.tagsContainer}>
                {tokenData.tags.map((tag: string, idx: number) => (
                  <View key={idx} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {tokenData?.extensions?.website && (
            <View style={[styles.detailRow, { height: 44, alignItems: 'center' }]}>
              <Text style={styles.detailLabel}>Website</Text>
              <TouchableOpacity
                style={{ flexShrink: 0, alignSelf: 'center' }}
                onPress={() => Linking.openURL(tokenData.extensions.website)}>
                <Text
                  style={[styles.detailValue, styles.linkText, styles.noWrap, { minWidth: 100, textAlign: 'right' }]}
                  numberOfLines={1}>
                  {tokenData.extensions.website}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Removed: Security Analysis Section */}
        {/* {renderRiskAnalysisSection()} */}

        {timeframePrice > 0 && (
          <View style={styles.statsSummaryContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={styles.statValue}>
                {timeframePrice > 0 ? `$${timeframePrice.toFixed(4)}` : 'N/A'}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>24h Change</Text>
              <Text
                style={[
                  styles.statValue,
                  timeframeChangePercent > 0
                    ? styles.positiveChange
                    : timeframeChangePercent < 0
                      ? styles.negativeChange
                      : {},
                ]}>
                {timeframeChangePercent > 0 ? '+' : ''}
                {timeframeChangePercent.toFixed(2)}%
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Market Cap</Text>
              <Text style={[styles.statValue, styles.statValueText]}>
                {formatLargeNumber(marketCap)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.explorerButton, { minWidth: 150 }]} 
          onPress={openExplorer}
        >
          <Text style={[styles.explorerButtonText, styles.noWrap]}>View on Solscan</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderMarketTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
      {tokenData?.extensions?.coingeckoId && (
        <>
          {renderTimeframeSelector()}
          <View style={styles.chartContainer}>
            {loadingOHLC ? (
              <ActivityIndicator size="large" color={COLORS.brandPrimary} />
            ) : graphData.length > 0 ? (
              <Text style={styles.chartEmptyText}>Chart data is available, but the LineGraph component has been removed for Phase 1.</Text>
            ) : (
              <Text style={styles.chartEmptyText}>No chart data available</Text>
            )}
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market Data</Text>

        <View style={styles.marketMetricsContainer}>
          <View style={styles.marketMetricItem}>
            <Text style={styles.marketMetricLabel}>Market Cap</Text>
            <Text style={styles.marketMetricValue}>
              {formatLargeNumber(marketCap)}
            </Text>
          </View>

          <View style={styles.marketMetricItem}>
            <Text style={styles.marketMetricLabel}>FDV</Text>
            <Text style={styles.marketMetricValue}>
              {formatLargeNumber(fdv)}
            </Text>
          </View>

          <View style={styles.marketMetricItem}>
            <Text style={styles.marketMetricLabel}>Liquidity</Text>
            <Text style={styles.marketMetricValue}>
              {liquidityScore ? liquidityScore.toFixed(2) : '0'}%
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Price</Text>
          <Text style={styles.detailValue}>
            {timeframePrice ? `$${timeframePrice.toFixed(6)}` : 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>24h Change</Text>
          <Text
            style={[
              styles.detailValue,
              timeframeChangePercent > 0
                ? styles.positiveChange
                : timeframeChangePercent < 0
                  ? styles.negativeChange
                  : {},
            ]}>
            {timeframeChangePercent > 0 ? '+' : ''}
            {timeframeChangePercent.toFixed(2)}%
          </Text>
        </View>

        {heliusTokenData?.token_info?.price_info && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recent Price</Text>
            <Text style={styles.detailValue}>
              $
              {heliusTokenData.token_info.price_info.price_per_token
                ? heliusTokenData.token_info.price_info.price_per_token.toFixed(6)
                : 'N/A'}
            </Text>
          </View>
        )}

        {tokenData?.extensions?.coingeckoId && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Coingecko ID</Text>
              <Text style={styles.detailValue}>
                {tokenData.extensions.coingeckoId}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.coingeckoButton, { minWidth: 150 }]}
              onPress={() =>
                Linking.openURL(
                  `https://www.coingecko.com/en/coins/${tokenData.extensions.coingeckoId}`,
                )
              }>
              <Text style={[styles.coingeckoButtonText, styles.noWrap]}>View on Coingecko</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );

  // Removed: renderRiskAnalysisSection

  // Removed: Helper function to get human-readable risk level
  // Removed: Helper function to get risk description

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.drawerContainer, { transform: [{ translateY: panY }] }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#32D4DE" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        <View style={styles.tokenInfoContainer}>
          <Image
            source={
              initialData?.logoURI
                ? { uri: initialData.logoURI }
                : tokenData?.logoURI
                  ? { uri: tokenData.logoURI }
                  : require('@/assets/images/SENDlogo.png')
            }
            style={styles.tokenImage as StyleProp<ImageStyle>} // Simplified, no more nftImage/collectionImage
            resizeMode="cover"
          />
          <View style={styles.tokenNameContainer}>
            <Text style={styles.tokenName} numberOfLines={2}>
              {initialData?.name ||
                tokenData?.name ||
                initialData?.symbol ||
                tokenData?.symbol ||
                'Unknown Token'}
            </Text>
            {/* Simplified - always assume token for now */}
            <Text style={styles.tokenSymbol}>
                {tokenData?.symbol || initialData?.symbol || ''}
            </Text>
            {timeframePrice > 0 && (
                <View style={styles.priceContainer}>
                  <Text style={styles.tokenPrice}>
                    {timeframePrice ? `$${timeframePrice.toFixed(4)}` : '$0.00'}
                  </Text>
                  <Text
                    style={[
                      styles.priceChange,
                      {
                        color:
                          timeframeChangePercent > 0
                            ? '#00C851'
                            : timeframeChangePercent < 0
                              ? '#FF5252'
                              : '#666666',
                      },
                    ]}>
                    {timeframeChangePercent > 0 ? '+' : ''}
                    {timeframeChangePercent.toFixed(2)}%
                  </Text>
                </View>
              )}
          </View>
        </View>

        {/* Removed: Elegant Swap Button */}

        {/* Always render tab buttons and tabs */}
        <>
          {renderTabButtons()}
          {activeTab === 'overview' ? renderOverviewTab() : renderMarketTab()}
        </>
      </Animated.View>
    </Modal>
  );
};

export default TokenDetailsDrawer;