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
  initiateCall,
  resetCall,
} from '../state/call/slice';
import { sendMessage } from '../state/chat/slice';
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
  private currentChatId: string | null = null;
  private isCaller: boolean = false;
  private callStartTime: number = 0;

  constructor() {
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    socketService.subscribeToEvent('call_offer', async (data: any) => {
      console.log('[CallService] Received call_offer', data);
      await this.handleOffer(data);
    });

    socketService.subscribeToEvent('call_answer', async (data: any) => {
      console.log('[CallService] Received call_answer', data);
      await this.handleAnswer(data);
    });

    socketService.subscribeToEvent('ice_candidate', async (data: any) => {
      await this.handleIceCandidate(data);
    });

    socketService.subscribeToEvent('call_hangup', () => {
      console.log('[CallService] Received call_hangup');
      this.handleRemoteHangup();
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

  public async startCall(remoteUser: any, isVideo: boolean, chatId?: string) {
    try {
      const state = store.getState();
      const userId = state.auth.address;
      if (!userId) {
        console.error('[CallService] No user address found, cannot start call');
        return;
      }

      this.remoteUserId = remoteUser.id;
      this.currentChatId = chatId || state.chat.selectedChatId;
      this.isCaller = true;
      this.callStartTime = Date.now();
      this.iceCandidatesQueue = [];

      const recipientPublicKey = remoteUser.public_encryption_key;
      if (!recipientPublicKey) {
        console.error('[CallService] Recipient has no encryption key');
        throw new Error('Recipient has no encryption key');
      }

      this.pc = new RTCPeerConnection(configuration);
      
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          try {
            const encrypted = this.encryptSignaling(JSON.stringify(event.candidate), recipientPublicKey);
            socketService.emit('ice_candidate', { to: this.remoteUserId, from: userId, ...encrypted });
          } catch (e) {
            console.error('[CallService] Error encrypting/sending ICE candidate', e);
          }
        }
      };

      this.pc.ontrack = (event) => {
        console.log('[CallService] Received remote track');
        store.dispatch(setRemoteStream(event.streams[0]));
      };

      try {
        this.localStream = await mediaDevices.getUserMedia({
          audio: true,
          video: isVideo ? { facingMode: 'user' } : false,
        });
        this.localStream.getTracks().forEach(track => this.pc?.addTrack(track, this.localStream!));
        store.dispatch(setLocalStream(this.localStream));
      } catch (e) {
        console.error('[CallService] Failed to get local media stream', e);
        // We can't really start a call without local media in this app's current design
        throw new Error('Failed to access camera or microphone');
      }

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const encryptedOffer = this.encryptSignaling(offer.sdp, recipientPublicKey);
      console.log('[CallService] Sending call_offer to', this.remoteUserId);
      
      if (!socketService.isConnected()) {
        console.error('[CallService] Socket not connected, cannot send call offer');
        throw new Error('Socket not connected');
      }
      
      const fromPublicKey = state.auth.publicEncryptionKey;
      socketService.emit('call_offer', { 
        to: this.remoteUserId, 
        from: userId, 
        fromPublicKey,
        isVideo, 
        ...encryptedOffer 
      });
    } catch (error: any) {
      console.error('[CallService] Error starting call:', error);
      this.cleanup();
      store.dispatch(endCall());
    }
  }

  private iceCandidatesQueue: any[] = [];

  private async handleOffer(data: any) {
    const { from, ciphertext, nonce, isVideo } = data;
    console.log(`[CallService] Handling offer from ${from}`);
    this.remoteUserId = from;
    this.isCaller = false;

    const state = store.getState();
    // Try to find user in any chat room participants
    let remoteUser = state.chat.chats.flatMap(c => c.participants).find(p => p.id === from);
    
    // Fallback: If not found, create a basic user object from the event data
    if (!remoteUser) {
      console.log(`[CallService] Remote user ${from} not found in chats, searching specifically...`);
      // You might want to fetch user profile here if available
      remoteUser = { id: from, username: 'Secure User', public_encryption_key: data.fromPublicKey } as any;
    }

    if (!remoteUser?.public_encryption_key) {
      console.error('[CallService] Cannot handle offer: Remote user has no encryption key');
      return;
    }

    try {
      const decryptedSdp = this.decryptSignaling(ciphertext, nonce, remoteUser.public_encryption_key);
      if (!decryptedSdp) {
        console.error('[CallService] Failed to decrypt signaling data');
        return;
      }

      this.pendingOffer = { sdp: decryptedSdp, isVideo };
      store.dispatch(incomingCall({ remoteUser: remoteUser as any, isVideo }));
    } catch (error) {
      console.error('[CallService] Error handling call offer:', error);
    }
  }

  private pendingOffer: any = null;

  public async joinCall(isVideo: boolean) {
    try {
      const state = store.getState();
      const userId = state.auth.address;
      const remoteUser = state.call.remoteUser;
      if (!userId || !remoteUser?.public_encryption_key || !this.pendingOffer) {
        console.error('[CallService] Missing data for joinCall', { userId, remoteUserExists: !!remoteUser, hasPendingOffer: !!this.pendingOffer });
        return;
      }

      this.pc = new RTCPeerConnection(configuration);
      
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          const encrypted = this.encryptSignaling(JSON.stringify(event.candidate), remoteUser.public_encryption_key!);
          socketService.emit('ice_candidate', { to: this.remoteUserId, from: userId, ...encrypted });
        }
      };

      this.pc.ontrack = (event) => {
        console.log('[CallService] Received remote track');
        store.dispatch(setRemoteStream(event.streams[0]));
      };

      // Add local tracks
      try {
        this.localStream = await mediaDevices.getUserMedia({
          audio: true,
          video: isVideo ? { facingMode: 'user' } : false,
        });
        this.localStream.getTracks().forEach(track => this.pc?.addTrack(track, this.localStream!));
        store.dispatch(setLocalStream(this.localStream));
      } catch (e) {
        console.error('[CallService] Failed to get local media stream', e);
        // Continue even if local media fails, or maybe abort? 
        // For now, let's try to proceed with just receiving.
      }

      await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: this.pendingOffer.sdp }));
      
      // Process any queued ICE candidates
      while (this.iceCandidatesQueue.length > 0) {
        const candidate = this.iceCandidatesQueue.shift();
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('Error adding queued ICE candidate', e));
      }

      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      const encryptedAnswer = this.encryptSignaling(answer.sdp, remoteUser.public_encryption_key!);
      socketService.emit('call_answer', { to: this.remoteUserId, from: userId, ...encryptedAnswer });

      this.pendingOffer = null;
      this.callStartTime = Date.now();
      store.dispatch(callConnected({ localStream: this.localStream, remoteStream: (this.pc as any)._remoteStreams?.[0] || null }));
    } catch (error) {
      console.error('[CallService] Error joining call:', error);
      this.cleanup();
      store.dispatch(endCall());
    }
  }

  public async handleAnswer(data: any) {
    if (!this.pc) return;
    try {
      const { from, ciphertext, nonce } = data;
      const remoteUser = store.getState().call.remoteUser;
      if (!remoteUser?.public_encryption_key) return;

      const decryptedSdp = this.decryptSignaling(ciphertext, nonce, remoteUser.public_encryption_key);
      if (!decryptedSdp) return;

      await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: decryptedSdp }));
      
      // Process any queued ICE candidates
      while (this.iceCandidatesQueue.length > 0) {
        const candidate = this.iceCandidatesQueue.shift();
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('Error adding queued ICE candidate', e));
      }

      this.callStartTime = Date.now();
      store.dispatch(callConnected({ localStream: this.localStream, remoteStream: (this.pc as any)._remoteStreams?.[0] || null }));
    } catch (error) {
      console.error('[CallService] Error handling call answer:', error);
    }
  }

  public async handleIceCandidate(data: any) {
    const { from, ciphertext, nonce } = data;
    const state = store.getState();
    const remoteUser = state.call.remoteUser || state.chat.chats.flatMap(c => c.participants).find(p => p.id === from);
    if (!remoteUser?.public_encryption_key) return;

    try {
      const decryptedCandidate = this.decryptSignaling(ciphertext, nonce, remoteUser.public_encryption_key);
      if (!decryptedCandidate) return;

      const candidate = JSON.parse(decryptedCandidate);
      
      if (this.pc && this.pc.remoteDescription) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        console.log('[CallService] Queuing ICE candidate as remote description not yet set');
        this.iceCandidatesQueue.push(candidate);
      }
    } catch (e) { 
      console.error('Error handling ICE candidate', e); 
    }
  }

  public hangup() {
    this.sendCallLog('ended');
    if (this.remoteUserId) {
      const userId = store.getState().auth.address;
      socketService.emit('call_hangup', { to: this.remoteUserId, from: userId });
    }
    this.cleanup();
    store.dispatch(endCall());
  }

  private handleRemoteHangup() {
    this.sendCallLog('ended');
    this.cleanup();
    store.dispatch(endCall());
  }

  private async sendCallLog(type: 'missed' | 'ended' | 'declined') {
    const state = store.getState();
    const { callStatus, remoteUser, isVideo } = state.call;
    const userId = state.auth.address;
    const cid = this.currentChatId || state.chat.selectedChatId;

    if (!userId || !remoteUser || !cid || callStatus === 'idle') return;

    let duration = 0;
    if (this.callStartTime > 0 && callStatus === 'connected') {
      duration = Math.floor((Date.now() - this.callStartTime) / 1000);
    }

    const durationStr = duration > 0 ? ` (${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')})` : '';
    const statusText = type === 'missed' ? 'Missed' : type === 'declined' ? 'Declined' : 'Ended';
    const content = `📞 ${isVideo ? 'Video' : 'Audio'} Call ${statusText}${durationStr}`;

    try {
      const result = await store.dispatch(sendMessage({
        chatId: cid,
        userId: userId,
        content: content,
        additionalData: { type: 'call_log', callType: isVideo ? 'video' : 'audio', status: type, duration }
      })).unwrap();
      
      if (result?.id) {
        socketService.sendMessage(cid, { ...result, senderId: userId, chatId: cid });
      }
    } catch (e) { console.error('Failed to send call log', e); }
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
    this.currentChatId = null;
    this.isCaller = false;
    this.callStartTime = 0;
    this.iceCandidatesQueue = [];
    this.pendingOffer = null;
  }
}

const callService = new CallService();
export default callService;
