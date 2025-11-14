// Call Modal Component - Incoming/Outgoing call UI
import React from 'react';
import { Avatar } from '../ui/Avatar';
import type { Call } from '../../services/callService';

export interface CallModalProps {
  call: Call | null;
  currentUserId: string;
  isIncoming: boolean; // true = incoming call, false = outgoing call
  onAnswer?: () => void;
  onReject?: () => void;
  onEnd?: () => void;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteAudioRef?: React.RefObject<HTMLAudioElement | null>;
  isVideoCall: boolean;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  call,
  currentUserId,
  isIncoming,
  onAnswer,
  onReject,
  onEnd,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  isVideoCall,
  isMuted = false,
  isVideoEnabled = true,
  onToggleMute,
  onToggleVideo,
}) => {
  if (!call) return null;

  const isCaller = call.callerId === currentUserId;
  const otherUser = isCaller
    ? { name: call.receiverName || 'Unknown', avatar: call.receiverAvatarUrl }
    : { name: call.callerName || 'Unknown', avatar: call.callerAvatarUrl };

  const callTypeLabel = call.type === 'VIDEO' ? 'Video' : 'Voice';
  const statusLabel = isIncoming
    ? `Incoming ${callTypeLabel} Call`
    : isCaller
    ? `Calling...`
    : `Connecting...`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className={`bg-dark-800 rounded-2xl border border-dark-700 w-full ${isVideoCall ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700 dark:border-dark-700 border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-dark-400 dark:text-dark-400 text-gray-600">{statusLabel}</span>
          </div>
          {!isIncoming && (
            <button
              onClick={onEnd}
              className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-200 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-300 transition-colors"
            >
              <svg className="w-4 h-4 text-white dark:text-white text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Video/Audio Content */}
        <div className="flex-1 relative bg-dark-900">
          {isVideoCall ? (
            <div className="relative w-full h-full">
              {/* Remote video (main) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ 
                  display: remoteVideoRef?.current?.srcObject ? 'block' : 'none',
                  backgroundColor: '#000'
                }}
              />

              {/* Local video (picture-in-picture) - Show if local stream exists */}
              {(localVideoRef?.current?.srcObject || (localVideoRef?.current && isVideoCall)) && (
                <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-dark-600 bg-dark-800">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Hidden audio element for video calls to play remote audio */}
              <audio
                ref={remoteAudioRef}
                autoPlay
                playsInline
                style={{ display: 'none' }}
              />

              {/* Fallback avatar when no video */}
              {!remoteVideoRef?.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Avatar
                    name={otherUser.name}
                    src={otherUser.avatar}
                    size="xl"
                    className="border-4 border-purple-500"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full relative">
              {/* Animated background circles */}
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              </div>
              
              {/* Main avatar with glow effect */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 opacity-30 blur-xl animate-pulse" style={{ 
                    width: 'calc(100% + 40px)', 
                    height: 'calc(100% + 40px)',
                    top: '-20px',
                    left: '-20px'
                  }} />
                  
                  {/* Avatar with gradient border */}
                  <div className="relative p-1 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500">
                    <div className="rounded-full bg-dark-800 p-1">
                      <Avatar
                        name={otherUser.name}
                        src={otherUser.avatar}
                        size="2xl"
                        className="border-0"
                      />
                    </div>
                  </div>
                  
                  {/* Pulsing ring animation */}
                  {call.status === 'INITIATED' || call.status === 'ANSWERED' ? (
                    <>
                      <div className="absolute inset-0 rounded-full border-4 border-purple-500/50 animate-ping" style={{ 
                        width: 'calc(100% + 20px)', 
                        height: 'calc(100% + 20px)',
                        top: '-10px',
                        left: '-10px'
                      }} />
                      <div className="absolute inset-0 rounded-full border-4 border-blue-500/50 animate-ping" style={{ 
                        width: 'calc(100% + 20px)', 
                        height: 'calc(100% + 20px)',
                        top: '-10px',
                        left: '-10px',
                        animationDelay: '0.5s'
                      }} />
                    </>
                  ) : null}
                </div>
                
                {/* User name and status */}
                <div className="mt-8 text-center">
                  <h3 className="text-3xl font-bold text-white dark:text-white text-gray-900 mb-2">{otherUser.name}</h3>
                  <p className="text-dark-400 dark:text-dark-400 text-gray-600 text-lg">{callTypeLabel} Call</p>
                  {call.status === 'ANSWERED' && call.duration !== undefined && call.duration > 0 && (
                    <p className="text-dark-500 text-sm mt-2">
                      {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Hidden audio element for voice calls */}
              <audio
                ref={remoteAudioRef}
                autoPlay
                playsInline
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* User info overlay - only for video calls */}
          {isVideoCall && (
            <div className="absolute bottom-20 left-0 right-0 text-center z-10">
              <h3 className="text-2xl font-semibold text-white dark:text-white text-gray-900 mb-1 drop-shadow-lg">{otherUser.name}</h3>
              <p className="text-dark-300 dark:text-dark-300 text-gray-700 drop-shadow-md">{callTypeLabel} Call</p>
              {call.status === 'ANSWERED' && call.duration !== undefined && call.duration > 0 && (
                <p className="text-dark-400 dark:text-dark-400 text-gray-600 text-sm mt-1">
                  {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-dark-800 border-t border-dark-700">
          {isIncoming && call.status !== 'ANSWERED' ? (
            <div className="flex items-center justify-center space-x-4">
              {/* Reject button */}
              <button
                onClick={onReject}
                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Answer button */}
              <button
                onClick={onAnswer}
                className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors shadow-lg"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-4">
              {/* Mute toggle (for active calls - both caller and receiver) */}
              {/* Show controls when call is active (not incoming unanswer) or answered */}
              {onToggleMute && (
                <button
                  onClick={onToggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isMuted
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-dark-700 hover:bg-dark-600'
                  }`}
                  title={isMuted ? 'Microphone đang tắt' : 'Microphone đang bật'}
                >
                  {isMuted ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Video toggle (only for video calls) */}
              {isVideoCall && onToggleVideo && (
                <button
                  onClick={onToggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors relative ${
                    isVideoEnabled
                      ? 'bg-dark-700 hover:bg-dark-600'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title={isVideoEnabled ? 'Camera đang bật' : 'Camera đang tắt'}
                >
                  {isVideoEnabled ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {/* Diagonal line to show camera is off */}
                      <svg className="w-6 h-6 text-white absolute" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(45deg)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {/* End call button */}
              <button
                onClick={onEnd}
                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

