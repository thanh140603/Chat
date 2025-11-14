// Call Hook - Manages call state and WebRTC
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebRTC } from './useWebRTC';
import { useWebSocket } from './useWebSocket';
import callService, { type Call, type CallType } from '../services/callService';

export interface CallState {
  activeCall: Call | null;
  isIncoming: boolean;
  isCalling: boolean;
}

export const useCall = (currentUserId: string) => {
  const [callState, setCallState] = useState<CallState>({
    activeCall: null,
    isIncoming: false,
    isCalling: false,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const processedOffersRef = useRef<Set<string>>(new Set());
  const { subscribeToUserMessages } = useWebSocket();

  const webRTC = useWebRTC(
    callState.activeCall?.id || null,
    callState.activeCall
      ? callState.activeCall.callerId === currentUserId
        ? callState.activeCall.receiverId
        : callState.activeCall.callerId
      : null,
    callState.activeCall?.type || null
  );

  // Use refs to store handlers to avoid re-subscribing
  const handlersRef = useRef({
    handleIncomingCall: null as ((data: any) => Promise<void>) | null,
    handleCallAnswered: null as (() => void) | null,
    handleCallRejected: null as (() => void) | null,
    handleCallEnded: null as (() => void) | null,
    handleCallMissed: null as (() => void) | null,
    handleWebRTCOffer: null as ((data: any) => Promise<void>) | null,
    handleWebRTCAnswer: null as ((data: any) => Promise<void>) | null,
    handleWebRTCIceCandidate: null as ((data: any) => Promise<void>) | null,
  });

  // Subscribe to call events via WebSocket
  useEffect(() => {
    if (!currentUserId) return;

    let cleanup: (() => void) | undefined;

    subscribeToUserMessages(currentUserId, (event: any) => {
      const eventType = event?.eventType || event?.type;
      const data = event?.data || event;
      
      switch (eventType) {
        case 'CALL_INITIATED':
          handlersRef.current.handleIncomingCall?.(data);
          break;
        case 'CALL_ANSWERED':
          handlersRef.current.handleCallAnswered?.();
          break;
        case 'CALL_REJECTED':
          handlersRef.current.handleCallRejected?.();
          break;
        case 'CALL_ENDED':
          handlersRef.current.handleCallEnded?.();
          break;
        case 'CALL_MISSED':
          handlersRef.current.handleCallMissed?.();
          break;
        case 'call_offer':
          handlersRef.current.handleWebRTCOffer?.(data);
          break;
        case 'call_answer':
          handlersRef.current.handleWebRTCAnswer?.(data);
          break;
        case 'call_ice_candidate':
          handlersRef.current.handleWebRTCIceCandidate?.(data);
          break;
      }
    }).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [currentUserId, subscribeToUserMessages]);

  // Handle incoming call
  const handleIncomingCall = useCallback(async (data: any) => {
    const callId = data.callId;
    if (!callId) return;

    try {
      const call = await callService.getCallById(callId);
      setCallState({
        activeCall: call,
        isIncoming: true,
        isCalling: false,
      });
    } catch (error) {
    }
  }, []);

  // Handle call answered
  const handleCallAnswered = useCallback(() => {
    setCallState((prev) => ({
      ...prev,
      activeCall: prev.activeCall
        ? { ...prev.activeCall, status: 'ANSWERED' as const }
        : null,
      isIncoming: false,
    }));
  }, []);

  // Handle call rejected
  const handleCallRejected = useCallback(() => {
    setCallState({
      activeCall: null,
      isIncoming: false,
      isCalling: false,
    });
    webRTC.cleanup();
  }, [webRTC]);

  // Handle call ended
  const handleCallEnded = useCallback(() => {
    setCallState({
      activeCall: null,
      isIncoming: false,
      isCalling: false,
    });
    webRTC.cleanup();
  }, [webRTC]);

  // Handle call missed
  const handleCallMissed = useCallback(() => {
    setCallState({
      activeCall: null,
      isIncoming: false,
      isCalling: false,
    });
    webRTC.cleanup();
  }, [webRTC]);

  // Handle WebRTC offer
  const handleWebRTCOffer = useCallback(
    async (data: any) => {
      if (data.callId === callState.activeCall?.id && data.offer) {
        // Create a unique key for this offer to avoid processing duplicates
        const offerKey = `${data.callId}-${data.offer.sdp?.substring(0, 50)}`;
        if (processedOffersRef.current.has(offerKey)) {
          return;
        }
        processedOffersRef.current.add(offerKey);
        
        try {
          await webRTC.handleOffer(data.offer);
        } catch (error: any) {
          // Remove from processed set if processing failed so it can be retried
          processedOffersRef.current.delete(offerKey);
          throw error;
        }
      } else {
      }
    },
    [callState.activeCall?.id, webRTC]
  );

  // Handle WebRTC answer
  const handleWebRTCAnswer = useCallback(
    async (data: any) => {
      if (data.callId === callState.activeCall?.id && data.answer) {
        await webRTC.handleAnswer(data.answer);
      } else {
      }
    },
    [callState.activeCall?.id, webRTC]
  );

  // Handle WebRTC ICE candidate
  const handleWebRTCIceCandidate = useCallback(
    async (data: any) => {
      // Don't log every ICE candidate to reduce noise
      if (data.callId === callState.activeCall?.id && data.candidate) {
        await webRTC.handleIceCandidate(data.candidate);
      }
    },
    [callState.activeCall?.id, webRTC]
  );

  // Update handlers ref when handlers change (after all handlers are defined)
  useEffect(() => {
    handlersRef.current.handleIncomingCall = handleIncomingCall;
    handlersRef.current.handleCallAnswered = handleCallAnswered;
    handlersRef.current.handleCallRejected = handleCallRejected;
    handlersRef.current.handleCallEnded = handleCallEnded;
    handlersRef.current.handleCallMissed = handleCallMissed;
    handlersRef.current.handleWebRTCOffer = handleWebRTCOffer;
    handlersRef.current.handleWebRTCAnswer = handleWebRTCAnswer;
    handlersRef.current.handleWebRTCIceCandidate = handleWebRTCIceCandidate;
  }, [handleIncomingCall, handleCallAnswered, handleCallRejected, handleCallEnded, handleCallMissed, handleWebRTCOffer, handleWebRTCAnswer, handleWebRTCIceCandidate]);

  // Initiate call
  const initiateCall = useCallback(
    async (conversationId: string, receiverId: string, type: CallType) => {
      try {
        const call = await callService.initiateCall({
          conversationId,
          receiverId,
          type,
        });
        setCallState({
          activeCall: call,
          isIncoming: false,
          isCalling: true,
        });

        // Get user media first, then create offer
        // Pass callId, receiverId, and callType directly to avoid race condition with state updates
        const localStream = await webRTC.getUserMedia(call.id, receiverId, undefined, call.type);
        await webRTC.createOffer(call.id, receiverId);

        // Attach local stream to video element
        if (localVideoRef.current && webRTC.state.localStream) {
          localVideoRef.current.srcObject = webRTC.state.localStream;
        }
      } catch (error) {
        setCallState({
          activeCall: null,
          isIncoming: false,
          isCalling: false,
        });
        throw error;
      }
    },
    [webRTC]
  );

  // Answer call
  const answerCall = useCallback(async () => {
    if (!callState.activeCall) return;

    try {
      // Get user media (audio + video for video calls, audio only for voice calls)
      // Receiver should have full functionality including video
      const callId = callState.activeCall.id;
      const targetUserId = callState.activeCall.callerId;
      const callType = callState.activeCall.type;
      try {
        // Request video if it's a video call, audio only if voice call
        // Pass callType to ensure correct media is requested
        await webRTC.getUserMedia(callId, targetUserId, undefined, callType);
      } catch (error: any) {
        // If video fails but it's a video call, try with audio only as fallback
        if (callType === 'VIDEO' && error.name === 'NotReadableError') {
          try {
            await webRTC.getUserMedia(callId, targetUserId, false, callType); // false = no video
          } catch (fallbackError) {
          }
        } else {
        }
      }

      // Answer call in backend
      await callService.answerCall(callState.activeCall.id);

      // Attach local stream to video element
      if (localVideoRef.current && webRTC.state.localStream) {
        localVideoRef.current.srcObject = webRTC.state.localStream;
        localVideoRef.current.play().catch((error) => {
        });
      }

      // Update call status to ANSWERED immediately so controls are shown
      setCallState((prev) => ({
        ...prev,
        activeCall: prev.activeCall
          ? { ...prev.activeCall, status: 'ANSWERED' as const }
          : null,
        isIncoming: false,
        isCalling: false,
      }));
    } catch (error) {
      throw error;
    }
  }, [callState.activeCall, webRTC]);

  // Reject call
  const rejectCall = useCallback(async () => {
    if (!callState.activeCall) return;

    try {
      // Cleanup WebRTC first (stop camera/microphone if any)
      webRTC.cleanup();
      
      // Clear video/audio element refs
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
      
      // Reject call in backend
      await callService.rejectCall(callState.activeCall.id);
      
      // Reset call state
      setCallState({
        activeCall: null,
        isIncoming: false,
        isCalling: false,
      });
    } catch (error) {
      // Still cleanup even if backend call fails
      webRTC.cleanup();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
      setCallState({
        activeCall: null,
        isIncoming: false,
        isCalling: false,
      });
      throw error;
    }
  }, [callState.activeCall, webRTC]);

  // End call
  const endCall = useCallback(async () => {
    if (!callState.activeCall) return;

    try {
      // Cleanup WebRTC first (stop camera/microphone)
      webRTC.cleanup();
      
      // Clear video/audio element refs
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
      
      // End call in backend
      await callService.endCall(callState.activeCall.id);
      
      // Reset call state
      setCallState({
        activeCall: null,
        isIncoming: false,
        isCalling: false,
      });
    } catch (error) {
      // Still cleanup even if backend call fails
      webRTC.cleanup();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
      setCallState({
        activeCall: null,
        isIncoming: false,
        isCalling: false,
      });
      throw error;
    }
  }, [callState.activeCall, webRTC]);

  // Update video/audio refs when streams change
  useEffect(() => {
    // Attach local stream to video element (for video calls)
    if (localVideoRef.current && webRTC.state.localStream) {
      localVideoRef.current.srcObject = webRTC.state.localStream;
      // Force play to ensure video is visible
      localVideoRef.current.play().catch((error) => {
      });
    }
    
    // Attach remote stream to video element (for video calls)
    if (remoteVideoRef.current && webRTC.state.remoteStream) {
      const stream = webRTC.state.remoteStream;
      const hasVideoTracks = stream.getVideoTracks().length > 0;
      
      if (hasVideoTracks) {
        remoteVideoRef.current.srcObject = stream;
        // Force play to ensure video is visible
        remoteVideoRef.current.play().catch((error) => {
        });
      } else if (callState.activeCall?.type === 'VIDEO') {
      }
    }
    
    // Attach remote stream to audio element (for both voice and video calls)
    // Video calls need audio element too because video element may not play audio properly
    if (remoteAudioRef.current && webRTC.state.remoteStream) {
      remoteAudioRef.current.srcObject = webRTC.state.remoteStream;
      remoteAudioRef.current.play().catch((error) => {
      });
    }
  }, [webRTC.state.localStream, webRTC.state.remoteStream, callState.activeCall?.type]);

  return {
    callState,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute: webRTC.toggleMute,
    toggleVideo: webRTC.toggleVideo,
    isMuted: webRTC.state.isMuted,
    isVideoEnabled: webRTC.state.isVideoEnabled,
    connectionState: webRTC.state.connectionState,
    iceConnectionState: webRTC.state.iceConnectionState,
  };
};

