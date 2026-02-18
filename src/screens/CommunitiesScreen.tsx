import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from '@/assets/colors';

const CommunitiesScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Communities Screen - Discover Gated Communities</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    color: COLORS.white,
    fontSize: 20,
  },
});

export default CommunitiesScreen;
