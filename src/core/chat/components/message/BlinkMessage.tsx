import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Blink, useAction, ActionContainer } from '@dialectlabs/blinks-react-native';
import COLORS from '@/assets/colors';

interface BlinkMessageProps {
  url: string;
}

const BlinkMessage: React.FC<BlinkMessageProps> = ({ url }) => {
  const { action, isLoading } = useAction({ url });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.brandPrimary} />
        <Text style={styles.loadingText}>Fetching Action...</Text>
      </View>
    );
  }

  if (!action) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Blink 
        action={action} 
        theme={{
          container: styles.blinkContainer,
          button: styles.blinkButton,
          buttonText: styles.blinkButtonText,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blinkContainer: {
    padding: 12,
  },
  blinkButton: {
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 8,
    paddingVertical: 10,
  },
  blinkButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.greyMid,
    marginTop: 8,
    fontSize: 12,
  }
});

export default BlinkMessage;
