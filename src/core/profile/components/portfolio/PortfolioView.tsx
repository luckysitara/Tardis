import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useFetchPortfolio } from '@/modules/data-module/hooks/useFetchTokens';
import PortfolioItem from './PortfolioItem';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { TouchableOpacity } from 'react-native-gesture-handler';

interface PortfolioViewProps {
  address: string;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ address }) => {
  const { portfolio, loading, error, refetch } = useFetchPortfolio(address);

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

  const tokens = portfolio.items.filter(item => item.assetType === 'token');

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <TouchableOpacity onPress={() => refetch()} disabled={loading}>
            <Icons.PlusCircleIcon width={20} height={20} fill={COLORS.white} style={{ transform: [{ rotate: '45deg' }] }} />
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryValue}>
          {portfolio.nativeBalance 
            ? `${(portfolio.nativeBalance.lamports / 1e9).toFixed(4)} SOL` 
            : '0.00 SOL'}
        </Text>
      </View>
      
      <Text style={styles.sectionTitle}>Tokens</Text>
      <FlatList
        data={tokens}
        renderItem={({ item }) => <PortfolioItem item={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false} // Since it's inside a ScrollView in Profile
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
    padding: 16,
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
