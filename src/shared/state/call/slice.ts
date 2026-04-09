import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MediaStream } from 'react-native-webrtc';
import { ChatParticipant } from '../chat/slice';

export type CallStatus = 'idle' | 'dialing' | 'ringing' | 'connected' | 'ended';

interface CallState {
  callStatus: CallStatus;
  isIncoming: boolean;
  isVideo: boolean;
  remoteUser: ChatParticipant | null;
  localStream: any | null; // MediaStream is not serializable, but we store it for UI
  remoteStream: any | null; // MediaStream is not serializable
  isMuted: boolean;
  isCameraOff: boolean;
  cameraType: 'front' | 'back';
}

const initialState: CallState = {
  callStatus: 'idle',
  isIncoming: false,
  isVideo: false,
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  cameraType: 'front',
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    initiateCall: (state, action: PayloadAction<{ remoteUser: ChatParticipant; isVideo: boolean }>) => {
      state.callStatus = 'ringing';
      state.remoteUser = action.payload.remoteUser;
      state.isVideo = action.payload.isVideo;
      state.isIncoming = false;
    },
    incomingCall: (state, action: PayloadAction<{ remoteUser: ChatParticipant; isVideo: boolean }>) => {
      state.callStatus = 'ringing';
      state.remoteUser = action.payload.remoteUser;
      state.isVideo = action.payload.isVideo;
      state.isIncoming = true;
    },
    acceptCall: (state) => {
      state.callStatus = 'connected';
    },
    callConnected: (state, action: PayloadAction<{ localStream: any; remoteStream: any }>) => {
      state.callStatus = 'connected';
      state.localStream = action.payload.localStream;
      state.remoteStream = action.payload.remoteStream;
    },
    setLocalStream: (state, action: PayloadAction<any>) => {
      state.localStream = action.payload;
    },
    setRemoteStream: (state, action: PayloadAction<any>) => {
      state.remoteStream = action.payload;
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    toggleCamera: (state) => {
      state.isCameraOff = !state.isCameraOff;
    },
    switchCamera: (state) => {
      state.cameraType = state.cameraType === 'front' ? 'back' : 'front';
    },
    endCall: (state) => {
      state.callStatus = 'ended';
      state.localStream = null;
      state.remoteStream = null;
      state.remoteUser = null;
      state.isMuted = false;
      state.isCameraOff = false;
      state.cameraType = 'front';
    },
    resetCall: (state) => {
      return initialState;
    },
  },
});

export const {
  initiateCall,
  incomingCall,
  acceptCall,
  callConnected,
  setLocalStream,
  setRemoteStream,
  toggleMute,
  toggleCamera,
  switchCamera,
  endCall,
  resetCall,
} = callSlice.actions;

export default callSlice.reducer;
