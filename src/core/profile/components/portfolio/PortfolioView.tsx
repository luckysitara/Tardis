import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useFetchPortfolio } from '@/modules/data-module/hooks/useFetchTokens';
import PortfolioItem from './PortfolioItem';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { fetchMultipleTokenPrices, DEFAULT_SOL_TOKEN } from '@/modules/data-module/services/tokenService';

interface PortfolioViewProps {
  address: string;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ address, ListHeaderComponent }) => {
  const { portfolio, loading, error, refetch } = useFetchPortfolio(address);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  // Fetch prices for all tokens when portfolio changes
  useEffect(() => {
    if (portfolio.items.length > 0 || (portfolio.nativeBalance && portfolio.nativeBalance.lamports > 0)) {
      const addresses = portfolio.items
        .filter(item => item.assetType === 'token')
        .map(item => item.id);
      
      // Add SOL if not already present
      if (!addresses.includes(DEFAULT_SOL_TOKEN.address)) {
        addresses.push(DEFAULT_SOL_TOKEN.address);
      }

      const getPrices = async () => {
        const prices = await fetchMultipleTokenPrices(addresses);
        setTokenPrices(prices);
      };
      
      getPrices();
    }
  }, [portfolio]);

  // Memoize tokens list including native SOL and injected price info
  const tokens = useMemo(() => {
    const list = portfolio.items
      .filter(item => item.assetType === 'token')
      .map(item => {
        // Inject price info if we have it
        if (tokenPrices[item.id]) {
          const price = tokenPrices[item.id];
          const balance = parseFloat(item.token_info?.balance || '0') / Math.pow(10, item.token_info?.decimals || 0);
          return {
            ...item,
            token_info: {
              ...item.token_info,
              price_info: {
                price_per_token: price,
                total_price: price * balance
              }
            }
          };
        }
        return item;
      });

    // Add native SOL to the list if balance exists
    if (portfolio.nativeBalance && portfolio.nativeBalance.lamports > 0) {
      const solAddress = DEFAULT_SOL_TOKEN.address;
      const solPrice = tokenPrices[solAddress] || 0;
      const solBalance = portfolio.nativeBalance.lamports / 1e9;
      
      const solItem: any = {
        id: solAddress,
        mint: solAddress,
        symbol: 'SOL',
        name: 'Solana',
        image: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
        assetType: 'token',
        token_info: {
          symbol: 'SOL',
          decimals: 9,
          balance: portfolio.nativeBalance.lamports.toString(),
          price_info: solPrice ? {
            price_per_token: solPrice,
            total_price: solPrice * solBalance
          } : undefined
        }
      };
      
      // Check if SOL is already in the list
      const hasSol = list.some(t => t.id === solItem.id);
      if (!hasSol) {
        list.unshift(solItem);
      } else {
        // If it is, update it with our synthetic one which has correct price info
        const index = list.findIndex(t => t.id === solItem.id);
        list[index] = solItem;
      }
    }
    return list;
  }, [portfolio, tokenPrices]);

  // Calculate total USD value
  const totalUsdValue = useMemo(() => {
    let total = 0;
    tokens.forEach(item => {
      total += item.token_info?.price_info?.total_price || 0;
    });
    return total;
  }, [tokens]);

  const renderHeader = () => (
    <View>
      {ListHeaderComponent && (
        typeof ListHeaderComponent === 'function' 
          ? <ListHeaderComponent /> 
          : ListHeaderComponent
      )}
      <View style={{ padding: 16 }}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>Total Balance</Text>
            <TouchableOpacity onPress={() => refetch()} disabled={loading}>
              <Icons.PlusCircleIcon width={20} height={20} fill={COLORS.white} style={{ transform: [{ rotate: '45deg' }] }} />
            </TouchableOpacity>
          </View>
          <Text style={styles.summaryValue}>
            {totalUsdValue > 0 
              ? `$${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
              : portfolio.nativeBalance 
                ? `${(portfolio.nativeBalance.lamports / 1e9).toFixed(4)} SOL`
                : '$0.00'}
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Tokens</Text>
      </View>
    </View>
  );

  if (loading && portfolio.items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.brandPrimary} />
      </View>
    );
  }

  if (error && portfolio.items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tokens}
        renderItem={({ item }) => <PortfolioItem item={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No tokens found in this wallet.</Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  summaryCard: {
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamily,
    marginTop: 4,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  listContent: {
    paddingBottom: 20,
  },
  errorText: {
    color: COLORS.errorRed || '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.greyMid,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default PortfolioView;
