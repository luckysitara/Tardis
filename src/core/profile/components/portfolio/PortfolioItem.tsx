import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { AssetItem } from '@/modules/data-module/types/assetTypes';
import { fixImageUrl } from '@/modules/data-module/hooks/useFetchTokens';
import { useNavigation } from '@react-navigation/native';

interface PortfolioItemProps {
  item: AssetItem;
}

const PortfolioItem: React.FC<PortfolioItemProps> = ({ item }) => {
  const navigation = useNavigation<any>();
  const balance = item.token_info?.balance 
    ? (item.token_info.balance / Math.pow(10, item.token_info.decimals || 0)).toFixed(4)
    : '0';

  const price = item.token_info?.price_info?.total_price 
    ? `$${item.token_info.price_info.total_price.toFixed(2)}`
    : '';

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <Image 
          source={{ uri: fixImageUrl(item.image || 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png') }} 
          style={styles.tokenIcon} 
        />
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenName}>{item.name}</Text>
          <View style={styles.symbolRow}>
            <Text style={styles.tokenSymbol}>{item.symbol}</Text>
            <TouchableOpacity 
              style={styles.swapBadge}
              onPress={() => navigation.navigate('Swap', { inputMint: item.id })}
            >
              <Text style={styles.swapBadgeText}>Swap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.rightContent}>
        <Text style={styles.tokenBalance}>{balance}</Text>
        <Text style={styles.tokenPrice}>{price}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.darkerBackground,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
  },
  tokenInfo: {
    marginLeft: 12,
  },
  tokenName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  tokenSymbol: {
    color: COLORS.greyMid,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  swapBadge: {
    backgroundColor: 'rgba(50, 212, 222, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
  },
  swapBadgeText: {
    color: COLORS.brandPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  tokenPrice: {
    color: COLORS.brandPrimary,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
});

export default PortfolioItem;
