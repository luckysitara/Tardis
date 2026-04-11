import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import callService from '@/shared/services/callService';
import { toggleMute, toggleCamera, switchCamera } from '@/shared/state/call/slice';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';

const { width, height } = Dimensions.get('window');

const CallScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const {
    callStatus,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    cameraType,
    isVideo,
  } = useAppSelector((state) => state.call);

  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (callStatus === 'ended' || callStatus === 'idle') {
      navigation.goBack();
    }
  }, [callStatus, navigation]);

  const toggleControls = () => {
    setControlsVisible(!controlsVisible);
    Animated.timing(fadeAnim, {
      toValue: controlsVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleHangup = () => {
    callService.hangup();
  };

  const handleToggleMute = () => {
    dispatch(toggleMute());
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = isMuted; // Toggle based on PREVIOUS state
      });
    }
  };

  const handleToggleCamera = () => {
    dispatch(toggleCamera());
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = isCameraOff;
      });
    }
  };

  const handleSwitchCamera = () => {
    dispatch(switchCamera());
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        track._switchCamera();
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Main Remote Video View */}
      <View style={styles.backgroundWrapper}>
        {isVideo && remoteStream && remoteStream.toURL() ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <IPFSAwareImage
              source={getValidImageSource(remoteUser?.profile_picture_url || '')}
              style={styles.placeholderAvatar}
            />
            <Text style={styles.placeholderName}>{remoteUser?.username || 'User'}</Text>
            <Text style={styles.callStatusText}>
              {callStatus === 'dialing' ? 'Dialing...' :
               callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}
            </Text>
          </View>
        )}
      </View>

      {/* Local Video Overlay */}
      {isVideo && localStream && localStream.toURL() && !isCameraOff && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
          objectFit="cover"
          zOrder={1} // Ensure local video is on top
        />
      )}

      {/* Controls Overlay */}
      <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          activeOpacity={1} 
          style={StyleSheet.absoluteFill} 
          onPress={toggleControls}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleHangup} style={styles.backButton}>
               <Icons.ArrowLeftIcon width={24} height={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
               <Text style={styles.headerTitle}>{remoteUser?.username || 'Secure Call'}</Text>
               <View style={styles.encryptionBadge}>
                 <Icons.Shield width={12} height={12} color={COLORS.brandPrimary} />
                 <Text style={styles.encryptionText}>End-to-End Encrypted</Text>
               </View>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.controlsRow}>
              <TouchableOpacity 
                style={[styles.controlButton, isMuted && styles.controlButtonActive]} 
                onPress={handleToggleMute}
              >
                <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={COLORS.white} />
              </TouchableOpacity>

              {isVideo && (
                <>
                  <TouchableOpacity 
                    style={[styles.controlButton, isCameraOff && styles.controlButtonActive]} 
                    onPress={handleToggleCamera}
                  >
                    <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={28} color={COLORS.white} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.iconButtonSmall} 
                    onPress={handleSwitchCamera}
                  >
                    <Ionicons name="camera-reverse" size={28} color={COLORS.white} />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity 
                style={[styles.controlButton, styles.hangupButton]} 
                onPress={handleHangup}
              >
                <Ionicons name="call" size={28} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.darkerBackground,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkerBackground,
  },
  placeholderAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  placeholderName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  callStatusText: {
    fontSize: 16,
    color: COLORS.brandPrimary,
    marginTop: 10,
    fontWeight: '600',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    padding: 10,
  },
  headerInfo: {
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  encryptionText: {
    fontSize: 12,
    color: COLORS.brandPrimary,
    marginLeft: 6,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 40,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  iconButtonSmall: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  controlButtonActive: {
    backgroundColor: COLORS.brandPrimary,
  },
  hangupButton: {
    backgroundColor: '#FF3B30',
    transform: [{ rotate: '135deg' }],
  },
});

export default CallScreen;
