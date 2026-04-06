import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import socketService from './socketService';
import { store } from '../state/store';
import {
  callConnected,
  setLocalStream,
  setRemoteStream,
  endCall,
  incomingCall,
  resetCall,
} from '../state/call/slice';
import { encryptMessage, decryptMessage, getKeypairFromSeed } from '../utils/crypto';
import { Buffer } from 'buffer';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

class CallService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteUserId: string | null = null;

  constructor() {
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    socketService.subscribeToEvent('call_offer', async (data: any) => {
      await this.handleOffer(data);
    });

    socketService.subscribeToEvent('call_answer', async (data: any) => {
      await this.handleAnswer(data);
    });

    socketService.subscribeToEvent('ice_candidate', async (data: any) => {
      await this.handleIceCandidate(data);
    });

    socketService.subscribeToEvent('call_hangup', () => {
      this.cleanup();
      store.dispatch(endCall());
    });
  }

  private getEncryptionKeys() {
    const state = store.getState();
    const encryptionSeed = state.auth.encryptionSeed;
    if (!encryptionSeed) throw new Error('Encryption seed not found');
    
    const seedUint8 = new Uint8Array(Buffer.from(encryptionSeed, 'base64'));
    return getKeypairFromSeed(seedUint8);
  }

  private encryptSignaling(data: string, recipientPublicKey: string) {
    const keypair = this.getEncryptionKeys();
    return encryptMessage(data, recipientPublicKey, keypair.secretKey);
  }

  private decryptSignaling(ciphertext: string, nonce: string, senderPublicKey: string) {
    const keypair = this.getEncryptionKeys();
    return decryptMessage(ciphertext, nonce, senderPublicKey, keypair.secretKey);
  }

  public async startCall(remoteUser: any, isVideo: boolean) {
    this.remoteUserId = remoteUser.id;
    const recipientPublicKey = remoteUser.public_encryption_key;

    if (!recipientPublicKey) {
      throw new Error('Recipient does not have an encryption key registered');
    }

    this.pc = new RTCPeerConnection(configuration);

    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? { facingMode: 'user' } : false,
    });

    this.localStream.getTracks().forEach((track) => {
      this.pc?.addTrack(track, this.localStream!);
    });

    store.dispatch(setLocalStream(this.localStream));

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const encrypted = this.encryptSignaling(JSON.stringify(event.candidate), recipientPublicKey);
        socketService.emit('ice_candidate', {
          to: this.remoteUserId,
          ...encrypted,
        });
      }
    };

    this.pc.ontrack = (event) => {
      store.dispatch(setRemoteStream(event.streams[0]));
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const encryptedOffer = this.encryptSignaling(offer.sdp, recipientPublicKey);
    socketService.emit('call_offer', {
      to: this.remoteUserId,
      isVideo,
      ...encryptedOffer,
    });
  }

  private async handleOffer(data: any) {
    const { from, ciphertext, nonce, isVideo } = data;
    this.remoteUserId = from;

    const state = store.getState();
    const remoteUser = state.chat.chats
      .flatMap(c => c.participants)
      .find(p => p.id === from);

    if (!remoteUser || !remoteUser.public_encryption_key) return;

    const decryptedSdp = this.decryptSignaling(ciphertext, nonce, remoteUser.public_encryption_key);
    if (!decryptedSdp) return;

    // Store the offer to be used when the user accepts
    this.pendingOffer = { sdp: decryptedSdp, isVideo };

    store.dispatch(incomingCall({ remoteUser: remoteUser as any, isVideo }));
  }

  private pendingOffer: any = null;

  public async joinCall(isVideo: boolean) {
    if (!this.remoteUserId || !this.pendingOffer) return;
    
    const state = store.getState();
    const remoteUser = state.call.remoteUser;
    if (!remoteUser || !remoteUser.public_encryption_key) return;

    this.pc = new RTCPeerConnection(configuration);

    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? { facingMode: 'user' } : false,
    });

    this.localStream.getTracks().forEach((track) => {
      this.pc?.addTrack(track, this.localStream!);
    });

    store.dispatch(setLocalStream(this.localStream));

    this.pc.onicecandidate = (event) => {
      if (event.candidate && remoteUser.public_encryption_key) {
        const encrypted = this.encryptSignaling(JSON.stringify(event.candidate), remoteUser.public_encryption_key);
        socketService.emit('ice_candidate', {
          to: this.remoteUserId,
          ...encrypted,
        });
      }
    };

    this.pc.ontrack = (event) => {
      store.dispatch(setRemoteStream(event.streams[0]));
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: this.pendingOffer.sdp
    }));

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    const encryptedAnswer = this.encryptSignaling(answer.sdp, remoteUser.public_encryption_key);
    socketService.emit('call_answer', {
      to: this.remoteUserId,
      ...encryptedAnswer,
    });

    this.pendingOffer = null;
    store.dispatch(callConnected({ 
      localStream: this.localStream, 
      remoteStream: (this.pc as any)._remoteStreams?.[0] || null 
    }));
  }

  // Refined handleOffer and handleAnswer for better flow
  // ... (Full implementation of WebRTC state machine)

  public async handleAnswer(data: any) {
    if (!this.pc) return;
    const { from, ciphertext, nonce } = data;
    const remoteUser = store.getState().call.remoteUser;
    if (!remoteUser || !remoteUser.public_encryption_key) return;

    const decryptedSdp = this.decryptSignaling(ciphertext, nonce, remoteUser.public_encryption_key);
    if (!decryptedSdp) return;

    await this.pc.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: decryptedSdp
    }));
    
    store.dispatch(callConnected({ 
        localStream: this.localStream, 
        remoteStream: (this.pc as any)._remoteStreams[0] 
    }));
  }

  public async handleIceCandidate(data: any) {
    if (!this.pc) return;
    const { from, ciphertext, nonce } = data;
    const remoteUser = store.getState().call.remoteUser || 
                       store.getState().chat.chats.flatMap(c => c.participants).find(p => p.id === from);
    
    if (!remoteUser || !remoteUser.public_encryption_key) return;

    const decryptedCandidate = this.decryptSignaling(ciphertext, nonce, remoteUser.public_encryption_key);
    if (!decryptedCandidate) return;

    await this.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(decryptedCandidate)));
  }

  public hangup() {
    if (this.remoteUserId) {
      socketService.emit('call_hangup', { to: this.remoteUserId });
    }
    this.cleanup();
    store.dispatch(endCall());
  }

  private cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.remoteUserId = null;
  }
}

const callService = new CallService();
export default callService;
