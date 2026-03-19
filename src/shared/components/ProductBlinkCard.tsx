import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { Connection } from '@solana/web3.js';
import { getRpcUrl } from '@/modules/data-module/utils/fetch';
import { IPFSAwareImage, getValidImageSource } from '../utils/IPFSImage';
import { SERVER_BASE_URL } from '@/shared/config/server';

interface ProductBlinkCardProps {
  url: string; // The solana-action: URL
  mediaUrls?: string[];
  postId?: string; // Optional: ID of the post containing this listing
}

interface ActionParameter {
  name: string;
  label: string;
  required?: boolean;
}

interface ActionMetadata {
  title: string;
  icon: string;
  description: string;
  label: string;
  error?: string;
  links?: {
    actions: Array<{
      label: string;
      href: string;
      parameters?: ActionParameter[];
    }>;
  };
}

export const ProductBlinkCard: React.FC<ProductBlinkCardProps> = ({ url, mediaUrls, postId }) => {
  const { address, sendBase64Transaction } = useWallet();
  const [metadata, setMetadata] = useState<ActionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

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

    // Check if required parameters are filled
    const action = metadata?.links?.actions?.[0];
    if (action?.parameters) {
      for (const p of action.parameters) {
        if (p.required && !params[p.name]) {
          Alert.alert("Information Required", `Please enter ${p.label}`);
          return;
        }
      }
    }

    setIsExecuting(true);
    try {
      console.log(`[ProductBlinkCard] Requesting transaction for account: ${address}`);
      
      // 1. Fetch the serialized transaction from the Action server
      const response = await fetch(actionApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          account: address,
          data: params // Pass the parameters as 'data' per Action spec
        }),
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
        setShowForm(false);
        
        // 3. Record the purchase in our database
        try {
          // Extract product details from the action URL
          // If actionApiUrl is just /api/actions/buy..., prepend base URL
          const fullUrl = actionApiUrl.startsWith('http') 
            ? actionApiUrl 
            : `${SERVER_BASE_URL.startsWith('http') ? '' : 'https://'}${SERVER_BASE_URL}${actionApiUrl.startsWith('/') ? '' : '/'}${actionApiUrl}`;
          
          const queryString = fullUrl.includes('?') ? fullUrl.split('?')[1] : '';
          const params = new URLSearchParams(queryString);
          
          const seller = params.get('seller');
          const price = params.get('price');
          const title = params.get('title') || metadata?.title || 'Product';
          const mint = params.get('mint');

          if (address && seller && price) {
            console.log('[ProductBlinkCard] Recording purchase in database...');
            await fetch(`${SERVER_BASE_URL}/api/actions/record-purchase`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                buyer: address,
                seller,
                productTitle: decodeURIComponent(title),
                price,
                tokenMint: mint,
                signature,
                postId: postId,
                shippingName: params['full_name'],
                shippingAddress: params['shipping_address'],
                contactInfo: params['contact']
              }),
            });
          }
        } catch (recordError) {
          console.error('[ProductBlinkCard] Failed to record purchase:', recordError);
          // Don't alert the user, the blockchain transaction succeeded anyway
        }
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

        {/* Dynamic Parameters (Shipping Info, etc) - Only show if user clicked Buy */}
        {showForm && metadata.links?.actions?.[0]?.parameters?.map((p: any) => (
          <View key={p.name} style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>{p.label}{p.required ? '*' : ''}</Text>
            <TextInput
              style={styles.parameterInput}
              placeholderTextColor={COLORS.greyMid}
              value={params[p.name] || ''}
              onChangeText={(val) => setParams(prev => ({ ...prev, [p.name]: val }))}
              editable={!isExecuting}
            />
          </View>
        ))}

        <View style={styles.buttonContainer}>
          {showForm && (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowForm(false)}
              disabled={isExecuting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionButton, showForm ? { flex: 2 } : { width: '100%' }]} 
            onPress={() => {
              const hasParams = (metadata.links?.actions?.[0]?.parameters?.length ?? 0) > 0;
              if (hasParams && !showForm) {
                setShowForm(true);
              } else {
                handleAction();
              }
            }}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Icons.WalletIcon width={18} height={18} color={COLORS.white} />
                <Text style={styles.actionButtonText}>
                  {showForm ? 'Confirm & Pay' : (metadata.label || 'Buy Now')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    height: 250,
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
  parameterContainer: {
    marginBottom: 12,
  },
  parameterLabel: {
    color: COLORS.greyMid,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  parameterInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    color: COLORS.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

