import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useAppSelector } from '@/shared/hooks/useReduxHooks';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import callService from '@/shared/services/callService';

const FloatingCallBar = () => {
  const navigation = useNavigation<any>();
  const { callStatus, remoteUser, isVideo } = useAppSelector((state) => state.call);
  
  // Get current screen name to hide the bar when on CallScreen
  const currentRouteName = useNavigationState((state) => {
    if (!state) return '';
    return state.routes[state.index].name;
  });

  const [duration, setDuration] = useState(0);
  const slideAnim = useMemo(() => new Animated.Value(-100), []);

  const isVisible = useMemo(() => {
    return (callStatus === 'connected' || callStatus === 'ringing') && currentRouteName !== 'CallScreen';
  }, [callStatus, currentRouteName]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 0 : -100,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [isVisible, slideAnim]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    navigation.navigate('CallScreen');
  };

  const handleHangup = () => {
    callService.hangup();
  };

  if (callStatus === 'idle' || callStatus === 'ended') return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity 
        style={styles.content} 
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.left}>
          <IPFSAwareImage
            source={getValidImageSource(remoteUser?.profile_picture_url || '')}
            style={styles.avatar}
          />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {remoteUser?.display_name || remoteUser?.username || 'Secure Call'}
            </Text>
            <Text style={styles.status}>
              {callStatus === 'ringing' ? 'Ringing...' : formatDuration(duration)}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          <TouchableOpacity style={styles.hangupButton} onPress={handleHangup}>
            <Ionicons name="call" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 10,
    right: 10,
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 25, 35, 0.95)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.brandPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkerBackground,
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  status: {
    color: COLORS.brandPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hangupButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
});

export default FloatingCallBar;
