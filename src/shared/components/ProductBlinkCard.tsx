import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { getRpcUrl } from '@/modules/data-module/utils/fetch';

interface ProductBlinkCardProps {
  url: string;
  mediaUrls?: string[];
}

export const ProductBlinkCard: React.FC<ProductBlinkCardProps> = ({ url, mediaUrls }) => {
  const { address, sendTransaction } = useWallet();
  const [isBuying, setIsBuying] = useState(false);

  console.log(`[ProductBlinkCard] Rendering for URL: ${url}`);

  const productData = useMemo(() => {
    try {
      if (!url.includes('?')) return null;
      
      const queryString = url.split('?')[1];
      const pairs = queryString.split('&');
      const result: any = {};
      
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        result[key] = decodeURIComponent(value || '');
      });

      console.log(`[ProductBlinkCard] Parsed Data:`, result);

      return {
        price: result.price || '0',
        title: result.title || 'Product',
        seller: result.seller || '',
      };
    } catch (e) {
      console.error(`[ProductBlinkCard] Parsing error:`, e);
      return null;
    }
  }, [url]);

  const handleBuy = async () => {
    if (!address) {
      Alert.alert("Authentication Required", "Please connect your wallet to buy.");
      return;
    }

    if (!productData || !productData.seller) {
      Alert.alert("Error", "Invalid product data.");
      return;
    }

    setIsBuying(true);
    try {
      const connection = new Connection(getRpcUrl(), 'confirmed');
      
      // Create a simple transfer transaction
      // In a real Blink, the server would return this transaction
      const lamports = Math.floor(parseFloat(productData.price) * LAMPORTS_PER_SOL);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(address),
          toPubkey: new PublicKey(productData.seller),
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      if (signature) {
        Alert.alert("Success", `Purchase successful! Signature: ${signature.slice(0, 8)}...`);
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      Alert.alert("Error", error.message || "Failed to complete purchase.");
    } finally {
      setIsBuying(false);
    }
  };

  if (!productData) return null;

  const productImage = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icons.Shield width={16} height={16} color={COLORS.brandPrimary} />
        <Text style={styles.headerText}>Solana Blink Listing</Text>
      </View>

      {productImage && (
        <Image source={{ uri: productImage }} style={styles.productImage} />
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{productData.title}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>{productData.price} SOL</Text>
        </View>

        <TouchableOpacity 
          style={styles.buyButton} 
          onPress={handleBuy}
          disabled={isBuying}
        >
          {isBuying ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Icons.WalletIcon width={18} height={18} color={COLORS.white} />
              <Text style={styles.buyButtonText}>Buy Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  headerText: {
    color: COLORS.brandPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  productImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  content: {
    padding: 15,
  },
  title: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceLabel: {
    color: COLORS.greyMid,
    fontSize: 14,
  },
  priceValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  buyButton: {
    backgroundColor: COLORS.brandPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  buyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
