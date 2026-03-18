import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { Connection } from '@solana/web3.js';
import { getRpcUrl } from '@/modules/data-module/utils/fetch';
import { IPFSAwareImage, getValidImageSource } from '../utils/IPFSImage';

interface ProductBlinkCardProps {
  url: string; // The solana-action: URL
  mediaUrls?: string[];
}

interface ActionMetadata {
  title: string;
  icon: string;
  description: string;
  label: string;
  error?: string;
}

export const ProductBlinkCard: React.FC<ProductBlinkCardProps> = ({ url, mediaUrls }) => {
  const { address, sendBase64Transaction } = useWallet();
  const [metadata, setMetadata] = useState<ActionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);

  // Clean the action URL (remove solana-action: prefix and ensure http protocol)
  const actionApiUrl = url.replace('solana-action:', '');

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        console.log(`[ProductBlinkCard] Fetching metadata from: ${actionApiUrl}`);
        const response = await fetch(actionApiUrl);
        if (!response.ok) {
          const text = await response.text();
          console.error(`[ProductBlinkCard] Metadata fetch failed with status ${response.status}: ${text.substring(0, 100)}`);
          throw new Error(`Failed to fetch action metadata: ${response.status}`);
        }
        const data = await response.json();
        setMetadata(data);
      } catch (e: any) {
        console.error(`[ProductBlinkCard] Metadata fetch error:`, e);
        Alert.alert("Error", `Failed to load product details: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (actionApiUrl) {
      fetchMetadata();
    }
  }, [actionApiUrl]);

  const handleAction = async () => {
    if (!address) {
      Alert.alert("Authentication Required", "Please connect your wallet to interact.");
      return;
    }

    setIsExecuting(true);
    try {
      console.log(`[ProductBlinkCard] Requesting transaction for account: ${address}`);
      
      // 1. Fetch the serialized transaction from the Action server
      const response = await fetch(actionApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: address }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[ProductBlinkCard] Action request failed with status ${response.status}: ${text.substring(0, 100)}`);
        // Check if it looks like HTML
        if (text.trim().startsWith('<')) {
          throw new Error(`Server error (HTTP ${response.status}). Please try again later.`);
        }
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
        } catch (parseError) {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.transaction) {
        throw new Error('No transaction returned from server');
      }

      // 2. Sign and send the transaction using our hardware-integrated wallet
      const connection = new Connection(getRpcUrl(), 'confirmed');
      const signature = await sendBase64Transaction(data.transaction, connection);

      if (signature) {
        Alert.alert("Success", `Transaction successful! ${data.message || ''}`);
        console.log(`[ProductBlinkCard] Transaction signature: ${signature}`);
      }
    } catch (error: any) {
      console.error("[ProductBlinkCard] Action error:", error);
      Alert.alert("Action Failed", error.message || "Failed to execute transaction.");
    } finally {
      setIsExecuting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="small" color={COLORS.brandPrimary} />
      </View>
    );
  }

  if (!metadata) return null;

  // Use mediaUrls from the post as first priority, then metadata icon as fallback
  const displayImage = (mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null) || metadata.icon;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icons.Shield width={16} height={16} color={COLORS.brandPrimary} />
        <Text style={styles.headerText}>Solana Action (Blink)</Text>
      </View>

      {displayImage && (
        <IPFSAwareImage 
          source={getValidImageSource(displayImage)} 
          style={styles.productImage} 
          resizeMode="cover"
        />
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{metadata.title}</Text>
        <Text style={styles.description}>{metadata.description}</Text>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleAction}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Icons.WalletIcon width={18} height={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>{metadata.label || 'Execute Action'}</Text>
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
    borderColor: 'rgba(50, 212, 222, 0.2)',
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 5,
  },
  centered: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(50, 212, 222, 0.1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  content: {
    padding: 15,
  },
  title: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  description: {
    color: COLORS.greyMid,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: COLORS.brandPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
