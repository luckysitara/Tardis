import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import callService from '@/shared/services/callService';
import { acceptCall } from '@/shared/state/call/slice';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import { navigationRef } from '@/shared/hooks/useAppNavigation';

const { width } = Dimensions.get('window');

const IncomingCallModal = () => {
  const dispatch = useAppDispatch();
  const { callStatus, remoteUser, isVideo, isIncoming } = useAppSelector((state) => state.call);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (callStatus === 'ringing' && isIncoming) {
      // Start vibration loop: 500ms on, 1000ms off
      Vibration.vibrate([500, 1000], true);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Vibration.cancel();
      pulseAnim.setValue(1);
    }

    return () => {
      Vibration.cancel();
    };
  }, [callStatus, isIncoming, pulseAnim]);

  const handleAccept = () => {
    dispatch(acceptCall());
    callService.joinCall(isVideo);
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate('CallScreen');
    }
  };

  const handleDecline = () => {
    callService.hangup();
  };

  if (callStatus !== 'ringing' || !isIncoming) return null;

  return (
    <Modal transparent animationType="fade" visible={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
            <IPFSAwareImage
              source={getValidImageSource(remoteUser?.profile_picture_url || '')}
              style={styles.avatar}
            />
          </Animated.View>
          
          <Text style={styles.callerName}>{remoteUser?.display_name || remoteUser?.username || 'Secure Caller'}</Text>
          <Text style={styles.callType}>{isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...'}</Text>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.declineButton]} 
              onPress={handleDecline}
            >
               <Ionicons name="close" size={32} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]} 
              onPress={handleAccept}
            >
               <Ionicons name="call" size={32} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    padding: 30,
    borderRadius: 30,
    backgroundColor: COLORS.darkerBackground,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    marginBottom: 20,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.brandPrimary,
  },
  callerName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    marginBottom: 8,
  },
  callType: {
    fontSize: 14,
    color: COLORS.brandPrimary,
    fontWeight: '600',
    marginBottom: 30,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
});

export default IncomingCallModal;
