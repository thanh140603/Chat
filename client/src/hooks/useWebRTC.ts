// WebRTC Hook - Manages RTCPeerConnection and media streams
import { useCallback, useEffect, useRef, useState } from 'react';
import { websocketService } from '../services/websocketService';

export interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (callId: string | null, targetUserId: string | null, callType: 'VOICE' | 'VIDEO' | null) => {
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoEnabled: callType === 'VIDEO',
    connectionState: 'closed',
    iceConnectionState: 'closed',
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const isCallerRef = useRef<boolean>(false);
  const prevCallIdRef = useRef<string | null>(null);
  const iceCandidateCountRef = useRef<number>(0);

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }
    
    if (!callId || !targetUserId) {
      return null;
    }
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    // Handle remote stream
    pc.ontrack = (event) => {
      // Create or get existing remote stream
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      
      // Add track to stream (merge tracks from different events)
      if (!remoteStreamRef.current.getTracks().some(t => t.id === event.track.id)) {
        remoteStreamRef.current.addTrack(event.track);
      }
      
      // Update state with current stream
      setState((prev) => ({ 
        ...prev, 
        remoteStream: remoteStreamRef.current 
      }));
      
      // Log stream tracks summary
      const audioTracks = remoteStreamRef.current.getAudioTracks().length;
      const videoTracks = remoteStreamRef.current.getVideoTracks().length;
      if (audioTracks > 0 || videoTracks > 0) {
        // Stream has tracks
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const connectionState = pc.connectionState;
      setState((prev) => ({ ...prev, connectionState }));
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      const iceConnectionState = pc.iceConnectionState;
      setState((prev) => ({ ...prev, iceConnectionState }));

      if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected') {
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && callId && targetUserId) {
        // Only log first few ICE candidates to reduce noise
        const count = iceCandidateCountRef.current + 1;
        iceCandidateCountRef.current = count;
        if (count <= 3) {
        }
        websocketService.sendCallSignaling({
          type: 'call_ice_candidate',
          callId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };
    return pc;
  }, [callId, targetUserId]);

  // Get user media (audio/video)
  // requestVideo: true = request video (default for VIDEO calls), false = audio only
  // overrideCallType: override callType for this specific call
  const getUserMedia = useCallback(async (overrideCallId?: string | null, overrideTargetUserId?: string | null, requestVideo?: boolean, overrideCallType?: 'VOICE' | 'VIDEO' | null) => {
    try {
      // Cleanup any existing local stream before getting new media
      // This ensures camera is properly released before requesting again
      if (localStreamRef.current) {
        const tracks = [...localStreamRef.current.getTracks()]; // Create a copy to avoid modification during iteration
        tracks.forEach((track) => {
          track.stop();
        });
        localStreamRef.current = null;
      }
      
      // Use override values if provided, otherwise use hook values
      const effectiveCallId = overrideCallId !== undefined ? overrideCallId : callId;
      const effectiveTargetUserId = overrideTargetUserId !== undefined ? overrideTargetUserId : targetUserId;
      
      // Ensure callId and targetUserId are set
      if (!effectiveCallId || !effectiveTargetUserId) {
        throw new Error('Call ID and target user ID must be set before getting user media');
      }
      
      // Initialize peer connection first if not already initialized
      // Temporarily update callId/targetUserId for initialization if needed
      if (!peerConnectionRef.current) {
        // We need to initialize with the effective values, but initializePeerConnection uses closure values
        // So we'll create the connection directly here if needed
        if (!effectiveCallId || !effectiveTargetUserId) {
          throw new Error('Failed to initialize peer connection: callId or targetUserId not set');
        }
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionRef.current = pc;
        
        // Set up event handlers
        pc.ontrack = (event) => {
          // Create or get existing remote stream
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          
          // Add track to stream (merge tracks from different events)
          if (!remoteStreamRef.current.getTracks().some(t => t.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
          
          // Update state with current stream
          setState((prev) => ({ 
            ...prev, 
            remoteStream: remoteStreamRef.current 
          }));
          
          // Log stream tracks summary
          const audioTracks = remoteStreamRef.current.getAudioTracks().length;
          const videoTracks = remoteStreamRef.current.getVideoTracks().length;
          if (audioTracks > 0 || videoTracks > 0) {
            // Stream has tracks
          }
        };
        
        pc.onconnectionstatechange = () => {
          const connectionState = pc.connectionState;
          setState((prev) => ({ ...prev, connectionState }));
        };
        
        pc.oniceconnectionstatechange = () => {
          const iceConnectionState = pc.iceConnectionState;
          setState((prev) => ({ ...prev, iceConnectionState }));
          
          if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected') {
          }
        };
        
        pc.onicecandidate = (event) => {
          if (event.candidate && effectiveCallId && effectiveTargetUserId) {
            // Only log first few ICE candidates to reduce noise
            const count = iceCandidateCountRef.current + 1;
            iceCandidateCountRef.current = count;
            if (count <= 3) {
            }
            websocketService.sendCallSignaling({
              type: 'call_ice_candidate',
              callId: effectiveCallId,
              targetUserId: effectiveTargetUserId,
              candidate: event.candidate,
            });
          }
        };
      }
      
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }

      // Determine if we should request video
      // Use overrideCallType if provided, otherwise use hook's callType
      const effectiveCallType = overrideCallType !== undefined ? overrideCallType : callType;
      // If requestVideo is explicitly false, don't request video (for receiver)
      // Otherwise, request video if it's a VIDEO call
      const shouldRequestVideo = requestVideo !== false && effectiveCallType === 'VIDEO';
      
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: shouldRequestVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error: any) {
        // If video fails but it's a video call, try with audio only as fallback
        if (callType === 'VIDEO' && error.name === 'NotReadableError') {
          const audioOnlyConstraints: MediaStreamConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
        } else {
          throw error;
        }
      }
      // Log stream tracks summary
      const videoTracks = stream.getVideoTracks();
      
      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream, isVideoEnabled: callType === 'VIDEO' && videoTracks.length > 0 }));

      // Add tracks to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          try {
            peerConnectionRef.current?.addTrack(track, stream);
          } catch (error) {
          }
        });
        
        // Log sender tracks after adding
      } else {
      }

      return stream;
    } catch (error) {
      throw error;
    }
  }, [callType, callId, targetUserId]);

  // Create and send offer (caller)
  const createOffer = useCallback(async (overrideCallId?: string | null, overrideTargetUserId?: string | null) => {
    // Use override values if provided, otherwise use hook values
    const effectiveCallId = overrideCallId !== undefined ? overrideCallId : callId;
    const effectiveTargetUserId = overrideTargetUserId !== undefined ? overrideTargetUserId : targetUserId;
    
    if (!effectiveCallId || !effectiveTargetUserId) {
      throw new Error('Call ID and target user ID must be set before creating offer');
    }
    
    // Initialize peer connection if not already initialized
    if (!peerConnectionRef.current) {
      // Create connection directly if not already created
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;
      
      // Set up event handlers (same as in getUserMedia)
      pc.ontrack = (event) => {
        // Create or get existing remote stream
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        
        // Add track to stream (merge tracks from different events)
        if (!remoteStreamRef.current.getTracks().some(t => t.id === event.track.id)) {
          remoteStreamRef.current.addTrack(event.track);
        }
        
        // Update state with current stream
        setState((prev) => ({ 
          ...prev, 
          remoteStream: remoteStreamRef.current 
        }));
        
        // Log stream tracks summary
        const audioTracks = remoteStreamRef.current.getAudioTracks().length;
        const videoTracks = remoteStreamRef.current.getVideoTracks().length;
        if (audioTracks > 0 || videoTracks > 0) {
        }
      };
      
      pc.onconnectionstatechange = () => {
        const connectionState = pc.connectionState;
        setState((prev) => ({ ...prev, connectionState }));
      };
      
      pc.oniceconnectionstatechange = () => {
        const iceConnectionState = pc.iceConnectionState;
        setState((prev) => ({ ...prev, iceConnectionState }));
        
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected') {
        }
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate && effectiveCallId && effectiveTargetUserId) {
          // Only log first few ICE candidates to reduce noise
          iceCandidateCountRef.current++;
          if (iceCandidateCountRef.current <= 3) {
          }
          websocketService.sendCallSignaling({
            type: 'call_ice_candidate',
            callId: effectiveCallId,
            targetUserId: effectiveTargetUserId,
            candidate: event.candidate,
          });
        }
      };
    }
    
    if (!peerConnectionRef.current) {
      throw new Error('Peer connection not initialized');
    }

    try {
      isCallerRef.current = true;
      
      // Ensure we have local stream with tracks before creating offer
      if (!localStreamRef.current) {
        throw new Error('Local stream not available. Call getUserMedia first.');
      }
      
      // Log current senders before creating offer
      const sendersBefore = peerConnectionRef.current.getSenders();
      
      // Always ensure all tracks from local stream are added to peer connection
      // This is important because tracks might not have been added in getUserMedia
      if (localStreamRef.current) {
        const existingTrackIds = new Set(sendersBefore.map(s => s.track?.id).filter(Boolean));
        const tracksToAdd = localStreamRef.current.getTracks().filter(track => !existingTrackIds.has(track.id));
        
        if (tracksToAdd.length > 0) {
          tracksToAdd.forEach((track) => {
            try {
              peerConnectionRef.current?.addTrack(track, localStreamRef.current!);
            } catch (error) {
            }
          });
        } else {
        }
        
        // Warn if video call but no video track
        if (callType === 'VIDEO' && localStreamRef.current.getVideoTracks().length === 0) {
        }
      }
      
      const offer = await peerConnectionRef.current.createOffer();
      
      // Log offer SDP to check if it includes video
      
      // Log senders after creating offer
      
      await peerConnectionRef.current.setLocalDescription(offer);
      websocketService.sendCallSignaling({
        type: 'call_offer',
        callId: effectiveCallId,
        targetUserId: effectiveTargetUserId,
        offer: offer,
      });
      return offer;
    } catch (error) {
      throw error;
    }
  }, [callId, targetUserId]);

  // Create and send answer (receiver)
  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current || !callId || !targetUserId) {
      throw new Error('Peer connection not initialized');
    }

    try {
      // Check if remote description is already set
      if (peerConnectionRef.current.remoteDescription) {
        return null;
      }
      
      // Check signaling state - must be stable (receiver hasn't set remote description yet)
      const signalingState = peerConnectionRef.current.signalingState;
      if (signalingState !== 'stable') {
        // If already have-remote-offer, it means we already processed this offer
        if (signalingState === 'have-remote-offer') {
          return null;
        }
        throw new Error(`Cannot set remote description in signaling state: ${signalingState}`);
      }
      
      // Log offer SDP to check if it includes video BEFORE setting remote description
      // IMPORTANT: Add recvonly video transceiver BEFORE setRemoteDescription
      // This ensures receiver can receive video even if caller sends video later
      // For video calls, always add recvonly transceiver to be ready to receive video
      if (callType === 'VIDEO') {
        try {
          const transceivers = peerConnectionRef.current.getTransceivers();
          const hasVideoTransceiver = transceivers.some(t => t.receiver.track?.kind === 'video' || t.receiver.track === null);
          
          if (!hasVideoTransceiver) {
            peerConnectionRef.current.addTransceiver('video', { direction: 'recvonly' });
          } else {
          }
        } catch (error) {
        }
      }
      
      // Add local tracks (audio + video if available) to peer connection before creating answer
      // This ensures receiver can send video to caller
      if (localStreamRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const existingTrackIds = new Set(senders.map(s => s.track?.id).filter(Boolean));
        const tracksToAdd = localStreamRef.current.getTracks().filter(track => !existingTrackIds.has(track.id));
        
        if (tracksToAdd.length > 0) {
          tracksToAdd.forEach((track) => {
            try {
              peerConnectionRef.current?.addTrack(track, localStreamRef.current!);
            } catch (error) {
            }
          });
        } else {
        }
        
        // Log local stream tracks for debugging
      }
      
      // Now set remote description
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Check if local description is already set
      if (peerConnectionRef.current.localDescription) {
        return peerConnectionRef.current.localDescription.toJSON();
      }
      
      const answer = await peerConnectionRef.current.createAnswer();
      
      // Log answer SDP to check if it includes video
      await peerConnectionRef.current.setLocalDescription(answer);
      websocketService.sendCallSignaling({
        type: 'call_answer',
        callId,
        targetUserId,
        answer: answer,
      });
      return answer;
    } catch (error) {
      throw error;
    }
  }, [callId, targetUserId]);

  // Handle received offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) {
      initializePeerConnection();
    }
    if (peerConnectionRef.current) {
      await createAnswer(offer);
    }
  }, [initializePeerConnection, createAnswer]);

  // Handle received answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      throw error;
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      // Don't log every ICE candidate to reduce noise
    } catch (error) {
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) {
      // If no local stream, try to get user media with video
      if (callId && targetUserId && callType === 'VIDEO') {
        try {
          await getUserMedia(callId, targetUserId, true, callType); // true = request video
          setState((prev) => ({ ...prev, isVideoEnabled: true }));
        } catch (error) {
          alert('Không thể bật camera. Camera có thể đang được sử dụng bởi tab/browser khác.');
        }
      }
      return;
    }

    const videoTracks = localStreamRef.current.getVideoTracks();
    
    if (videoTracks.length === 0) {
      // No video tracks, try to get video
      if (callId && targetUserId && callType === 'VIDEO') {
        try {
          // Get new stream with video
          const constraints: MediaStreamConstraints = {
            audio: false, // Don't request audio again, we already have it
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
          };
          
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          const newVideoTracks = newStream.getVideoTracks();
          
          if (newVideoTracks.length > 0 && localStreamRef.current) {
            // Add video track to existing local stream
            newVideoTracks.forEach((track) => {
              localStreamRef.current!.addTrack(track);
              // Add track to peer connection
              if (peerConnectionRef.current) {
                try {
                  peerConnectionRef.current.addTrack(track, localStreamRef.current!);
                } catch (error) {
                }
              }
            });
            
            // Update state - this will trigger useEffect in useCall to update video element
            setState((prev) => ({ 
              ...prev, 
              localStream: localStreamRef.current,
              isVideoEnabled: true 
            }));
          }
        } catch (error) {
          alert('Không thể bật camera. Camera có thể đang được sử dụng bởi tab/browser khác.');
        }
      }
    } else {
      // Toggle existing video tracks
      const isCurrentlyEnabled = videoTracks[0]?.enabled ?? false;
      videoTracks.forEach((track) => {
        track.enabled = !isCurrentlyEnabled;
      });
      setState((prev) => ({ ...prev, isVideoEnabled: !isCurrentlyEnabled }));
    }
  }, [callId, targetUserId, callType, getUserMedia]);

  // Cleanup
  const cleanup = useCallback(() => {
    // Stop and release local stream tracks
    if (localStreamRef.current) {
      const tracks = [...localStreamRef.current.getTracks()]; // Create a copy to avoid modification during iteration
      tracks.forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Stop and release remote stream tracks
    if (remoteStreamRef.current) {
      const tracks = [...remoteStreamRef.current.getTracks()]; // Create a copy to avoid modification during iteration
      tracks.forEach((track) => {
        track.stop();
      });
      remoteStreamRef.current = null;
    }

    // Remove all tracks from peer connection senders
    if (peerConnectionRef.current) {
      const senders = peerConnectionRef.current.getSenders();
      senders.forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
        peerConnectionRef.current!.removeTrack(sender);
      });
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset refs
    isCallerRef.current = false;
    iceCandidateCountRef.current = 0;

    // Reset state
    setState({
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoEnabled: false,
      connectionState: 'closed',
      iceConnectionState: 'closed',
    });
  }, []);

  // Cleanup on unmount or when call ends
  useEffect(() => {
    const prevCallId = prevCallIdRef.current;
    
    // Only cleanup when callId changes from non-null to null (call ended)
    // Don't cleanup when callId changes from null to a value (call starting)
    if (prevCallId && !callId && peerConnectionRef.current) {
      cleanup();
    }
    
    // Update previous callId for next render
    prevCallIdRef.current = callId;
  }, [callId, cleanup]);

  return {
    state,
    getUserMedia,
    createOffer,
    createAnswer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    toggleVideo,
    cleanup,
  };
};

