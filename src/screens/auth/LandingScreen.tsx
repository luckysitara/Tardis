import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { useTardisMobileWallet } from '@/modules/wallet-providers/hooks/useTardisMobileWallet';
import { Colors } from '@/styles/theme'; // Import Colors from the newly created theme file
// Removed: import { useAppSelector } from '@/shared/hooks/useReduxHooks';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient'; // For background gradient

// Assuming the user places the image here
const TardisIconImage = require('@/assets/images/tardis_icon.png');

const { width, height } = Dimensions.get('window');

const LandingScreen: React.FC = () => {
  const { connectSeekerWallet } = useTardisMobileWallet();
  const navigation = useAppNavigation();
  // Removed: const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  // Animation for pulsing icon
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Removed: If already authenticated, navigate away
    // if (isAuthenticated) {
    //   // Small delay to allow initial render before navigation
    //   setTimeout(() => navigation.navigate('Authenticated' as never), 100);
    // }
  }, [navigation]); // Removed isAuthenticated from dependency array

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <ExpoLinearGradient
      colors={[Colors.deepSpace, Colors.tardisBlue]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View style={[styles.tardisIconContainer, animatedStyle]}>
            <Image source={TardisIconImage} style={styles.tardisIcon} resizeMode="contain" />
          </Animated.View>

          <Text style={styles.title}>Welcome to TARDIS</Text>
          <Text style={styles.subtitle}>High-security messaging for the Solana Seeker</Text>

          {Platform.OS === 'android' && (
            <TouchableOpacity style={styles.connectButton} onPress={connectSeekerWallet}>
              <Text style={styles.connectButtonText}>Connect Seeker</Text>
            </TouchableOpacity>
          )}
          {Platform.OS !== 'android' && (
            <Text style={styles.unsupportedText}>
              Solana Seeker connection is currently only available on Android devices.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </ExpoLinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background handled by ExpoLinearGradient
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  tardisIconContainer: {
    marginBottom: 50,
  },
  tardisIcon: {
    width: width * 0.4,
    height: width * 0.4,
    // No background needed for image
  },
  title: {
    fontSize: 32, // Increased font size
    fontWeight: 'bold',
    color: Colors.sonicCyan,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: Colors.sonicCyan + '50', // Subtle glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18, // Increased font size
    color: Colors.gray,
    marginBottom: 60, // Increased margin
    textAlign: 'center',
    lineHeight: 24,
  },
  connectButton: {
    backgroundColor: 'transparent', // Transparent background to show gradient from shadow
    borderWidth: 2,
    borderColor: Colors.sonicCyan,
    paddingVertical: 18, // Increased padding
    paddingHorizontal: 45, // Increased padding
    borderRadius: 35, // More rounded
    shadowColor: Colors.sonicCyan,
    shadowOffset: { width: 0, height: 0 }, // Changed shadow offset
    shadowOpacity: 0.8,
    shadowRadius: 15, // Increased shadow radius for glow
    elevation: 12,
    marginTop: 20,
  },
  connectButtonText: {
    color: Colors.white,
    fontSize: 20, // Increased font size
    fontWeight: 'bold',
    letterSpacing: 1, // Added letter spacing
  },
  unsupportedText: {
    color: Colors.gray,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default LandingScreen;
