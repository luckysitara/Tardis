import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, StatusBar, Platform, ActivityIndicator } from 'react-native';
import Animated, { 
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate, cancelAnimation, FadeIn, FadeOut 
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// YOUR CORE LOGIC
import { useTardisMobileWallet } from '@/modules/wallet-providers/hooks/useTardisMobileWallet';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { loginSuccess, setVerified } from '@/shared/state/auth/reducer';
import { verifyHardware, verifySGT } from '@/shared/services/VerificationService';
import { resolveTardisIdentity } from '@/shared/services/IdentityService';

const { width } = Dimensions.get('window');
const TardisIconImage = require('@/assets/images/tardis_icon.jpg');

const LandingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authorizeSeeker } = useTardisMobileWallet();
  const dispatch = useAppDispatch();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState('NODE_IDLE');

  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0); 

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2500 }), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 25000, easing: Easing.linear }), -1, false);
  }, []);

  useEffect(() => {
    cancelAnimation(rotation);
    const speed = isConnecting ? 1000 : 25000;
    rotation.value = withRepeat(withTiming(rotation.value + 360, { duration: speed, easing: Easing.linear }), -1, false);
    
    // Animate logo scale and opacity when connecting
    logoOpacity.value = withTiming(isConnecting ? 1 : 0, { duration: 800 });
    logoScale.value = withTiming(isConnecting ? 1 : 0.5, { duration: 800, easing: Easing.out(Easing.back()) });
  }, [isConnecting]);

  const animatedVortex = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const animatedGlow = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.2, 0.4]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.25]) }],
  }));

  const animatedLogo = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }]
  }));

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatus('SIGNING_MWA_REQUEST...');
    try {
      const auth = await authorizeSeeker();
      if (!auth) { setIsConnecting(false); setStatus('NODE_IDLE'); return; }
      
      setStatus('ATTESTING_HARDWARE_ENCLAVE...');
      const [hw, sgt] = await Promise.all([verifyHardware(), verifySGT(auth.address)]);

      if (hw && sgt) {
        setStatus('RESOLVING_.SKR_IDENTITY...');
        
        // Resolve the actual .skr handle from SNS, passing the wallet label as hint
        const resolvedUsername = await resolveTardisIdentity(auth.address, auth.label);
        console.log(`[Landing] Resolved identity for ${auth.address}: ${resolvedUsername}`);

        dispatch(loginSuccess({ 
          provider: 'mwa', 
          address: auth.address, 
          authToken: auth.authToken, 
          username: resolvedUsername 
        }));
        dispatch(setVerified(true));
      } else {
        setStatus('AUTH_FAILED: ACCESS_DENIED');
        setIsConnecting(false);
      }
    } catch (e) {
      setStatus('NETWORK_SIGNAL_LOST');
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. BACKGROUND VORTEX */}
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.vortexWrapper, animatedVortex]}>
          <LinearGradient colors={['#003B6F', '#020408', '#00F2FF']} style={styles.vortexGradient} />
        </Animated.View>
        <LinearGradient colors={['rgba(2,4,8,0.7)', '#020408']} style={StyleSheet.absoluteFill} />
      </View>

      <View style={[styles.layout, { paddingTop: insets.top + 45, paddingBottom: insets.bottom + 30 }]}>
        
        {/* 2. HEADER */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.header}>
          <Text style={styles.brandText}>TARDIS</Text>
          <View style={styles.skrBadge}>
             <Text style={styles.skrLabel}>SOLANA_MOBILE_SEEKER_V2</Text>
          </View>
        </Animated.View>

        {/* 3. CENTER: SCANNER WITH CIRCULAR LOGO CROP */}
        <View style={styles.coreContainer}>
          <Animated.View style={[styles.glowRing, animatedGlow]} />
          <BlurView intensity={15} tint="light" style={styles.glassCircle}>
            <TouchableOpacity 
                style={styles.touchArea} 
                onPress={handleConnect} 
                disabled={isConnecting} 
                activeOpacity={0.9}
            >
              {/* THE LOGO CROP: Nested View for circular masking */}
              <Animated.View style={[styles.logoCropContainer, animatedLogo]}>
                <Image 
                  source={TardisIconImage} 
                  style={styles.logoImage} 
                  resizeMode="cover" 
                />
              </Animated.View>
              
              {!isConnecting && (
                <Animated.View exiting={FadeOut} style={styles.idleScanner}>
                  <View style={styles.scannerLine} />
                  <Text style={styles.tapText}>HOLD TO SYNC</Text>
                </Animated.View>
              )}
              
              {isConnecting && (
                <ActivityIndicator color="#00F2FF" size="small" style={styles.loader} />
              )}
            </TouchableOpacity>
          </BlurView>
          <Text style={styles.coreStatus}>
            {isConnecting ? 'ESTABLISHING TRUSTED SESSION' : 'HARDWARE ATTESTATION REQUIRED'}
          </Text>
        </View>

        {/* 4. FOOTER */}
        <View style={styles.footer}>
          <View style={styles.terminal}>
             <Text style={styles.terminalText}>{`>> ${status}`}</Text>
             <Text style={styles.terminalSub}>SECURE ENCLAVE ACTIVE // SEED VAULT</Text>
          </View>

          <TouchableOpacity style={styles.mainBtn} onPress={handleConnect}>
            <BlurView intensity={20} tint="dark" style={styles.btnBlur}>
              <Text style={styles.btnText}>VALIDATE IDENTITY</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408' },
  vortexWrapper: { width: width * 2, height: width * 2, position: 'absolute', top: -width, left: -width/2, opacity: 0.1 },
  vortexGradient: { flex: 1, borderRadius: width },
  layout: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 50 },
  
  header: { alignItems: 'center' },
  brandText: { color: '#fff', fontSize: 36, fontWeight: '100', letterSpacing: 20 },
  skrBadge: { marginTop: 15, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 2, borderWidth: 0.5, borderColor: 'rgba(0, 242, 255, 0.4)' },
  skrLabel: { color: '#00F2FF', fontSize: 7, fontWeight: '900', letterSpacing: 2.5 },

  coreContainer: { alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(0, 242, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(0, 242, 255, 0.1)' },
  glassCircle: { width: 190, height: 190, borderRadius: 95, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  touchArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // CIRCULAR LOGO CROP LOGIC
  logoCropContainer: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, // Makes the crop a circle
    overflow: 'hidden', // Crops the rectangular image inside
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  logoImage: { 
    width: '100%', 
    height: '100%',
  },

  idleScanner: { position: 'absolute', alignItems: 'center' },
  scannerLine: { width: 25, height: 1, backgroundColor: '#00F2FF', marginBottom: 12, opacity: 0.8 },
  tapText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  loader: { position: 'absolute', bottom: 35 },

  coreStatus: { color: 'rgba(255,255,255,0.3)', marginTop: 45, fontSize: 10, fontWeight: '300', letterSpacing: 3, textAlign: 'center' },

  footer: { width: '100%' },
  terminal: { marginBottom: 35, borderLeftWidth: 1, borderLeftColor: '#00F2FF', paddingLeft: 20 },
  terminalText: { color: '#00F2FF', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terminalSub: { color: 'rgba(255,255,255,0.2)', fontSize: 7, marginTop: 5, letterSpacing: 2 },
  
  mainBtn: { height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  btnBlur: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '400', letterSpacing: 6 },
});

export default LandingScreen;
