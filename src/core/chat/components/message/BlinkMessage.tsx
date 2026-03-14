import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Blink, useAction } from '@dialectlabs/blinks-react-native';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { Connection } from '@solana/web3.js';
import { getRpcUrl } from '@/modules/data-module/utils/fetch';
import { TardisActionAdapter } from './TardisActionAdapter';
import COLORS from '@/assets/colors';

interface BlinkMessageProps {
  url: string;
}

const BlinkMessage: React.FC<BlinkMessageProps> = ({ url }) => {
  const { address, sendBase64Transaction, signMessage } = useWallet();
  const connection = useMemo(() => new Connection(getRpcUrl(), 'confirmed'), []);

  const actionAdapter = useMemo(() => {
    if (!address) return null;
    return new TardisActionAdapter({
      address,
      connection,
      sendTransaction: async (tx, conn, options) => {
        // Dialect library provides Transaction | VersionedTransaction
        // Our hook expects Transaction | VersionedTransaction and handles it
        // We can just proxy it through
        return sendBase64Transaction(
          Buffer.from(tx.serialize()).toString('base64'),
          conn,
          options
        );
      },
      signMessage,
    });
  }, [address, connection, sendBase64Transaction, signMessage]);

  const { action, isLoading } = useAction({
    url,
    adapter: actionAdapter!,
  });

  if (!address) return null;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.brandPrimary} />
      </View>
    );
  }

  if (!action) return null;

  return (
    <View style={styles.container}>
      <Blink 
        action={action} 
        websiteText={new URL(url).hostname}
        theme={{
          container: styles.blinkContainer,
          button: styles.button,
          input: styles.input,
          // Add more theme overrides as needed to match Tardis aesthetic
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  blinkContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(50, 212, 222, 0.2)',
    padding: 12,
  },
  button: {
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.white,
    borderRadius: 8,
  }
});

export default BlinkMessage;
