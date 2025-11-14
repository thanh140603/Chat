// Layout Components - RightPanel
import React, { useMemo, useState } from 'react';
import { Avatar } from '../ui/Avatar';
import type { Message } from '../chat/MessageList';
import { MediaViewerModal } from '../chat/MediaViewerModal';
import { FileListModal } from '../chat/FileListModal';

export interface RightPanelProps {
  conversation?: {
    id: string;
    name: string;
    description?: string;
    participants: Array<{
      id: string;
      name: string;
      avatar?: string;
      isOnline?: boolean;
    }>;
    mediaCount?: number;
    fileCount?: number;
  };
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  messages?: Message[];
  className?: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  conversation,
  currentUser,
  messages = [],
  className = '',
}) => {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);

  // Extract media (images and videos) from messages
  const media = useMemo(() => {
    const mediaItems: Array<{
      id: string;
      url: string;
      type: 'image' | 'video';
      thumbnail?: string;
      senderName: string;
      timestamp: string;
    }> = [];

    messages.forEach((msg) => {
      if (msg.type === 'image' && msg.metadata?.imageUrl) {
        mediaItems.push({
          id: msg.id,
          url: msg.metadata.imageUrl,
          type: 'image',
          thumbnail: msg.metadata.imageUrl,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
        });
      } else if (msg.type === 'file' && msg.metadata?.contentType?.startsWith('video/')) {
        mediaItems.push({
          id: msg.id,
          url: msg.metadata.fileUrl || '',
          type: 'video',
          thumbnail: msg.metadata.imageUrl,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
        });
      }
    });

    return mediaItems;
  }, [messages]);

  // Extract files and group by type
  const filesByType = useMemo(() => {
    const grouped: Record<string, Array<{
      id: string;
      name: string;
      downloadName?: string;
      size?: number;
      contentType?: string;
      url?: string;
      downloadUrl?: string;
      publicId?: string;
      senderName: string;
      timestamp: string;
    }>> = {};

    messages.forEach((msg) => {
      if (msg.type === 'file' && msg.metadata) {
        const contentType = msg.metadata.contentType || '';
        const fileName = msg.metadata.fileName || msg.metadata.downloadName || 'Unknown';
        
        // Skip videos (they're in media section)
        if (contentType.startsWith('video/')) return;
        
        // Determine file type
        let fileType = 'Documents';
        if (contentType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
          fileType = 'PDF';
        } else if (contentType.includes('zip') || contentType.includes('rar') || 
                   fileName.toLowerCase().endsWith('.zip') || fileName.toLowerCase().endsWith('.rar')) {
          fileType = 'ZIP';
        } else if (contentType.includes('word') || 
                   fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) {
          fileType = 'Word';
        } else if (contentType.includes('excel') || contentType.includes('spreadsheet') ||
                   fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx')) {
          fileType = 'Excel';
        } else if (contentType.includes('text') || fileName.toLowerCase().endsWith('.txt')) {
          fileType = 'Text';
        }

        if (!grouped[fileType]) {
          grouped[fileType] = [];
        }

        grouped[fileType].push({
          id: msg.id,
          name: fileName,
          downloadName: msg.metadata.downloadName,
          size: msg.metadata.fileSize ? parseInt(msg.metadata.fileSize.toString()) : undefined,
          contentType: msg.metadata.contentType,
          url: msg.metadata.fileUrl,
          downloadUrl: msg.metadata.downloadUrl,
          publicId: msg.metadata.publicId,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
        });
      }
    });

    return grouped;
  }, [messages]);

  // Extract videos separately
  const videos = useMemo(() => {
    return messages.filter(msg => 
      msg.type === 'file' && msg.metadata?.contentType?.startsWith('video/')
    );
  }, [messages]);

  if (!conversation) {
    return (
      <div className={`w-80 bg-dark-800 border-l border-dark-700 flex flex-col ${className}`}>
        <div className="flex-1 flex items-center justify-center text-dark-400 dark:text-dark-400 text-gray-600">
          <p>Select a conversation to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 bg-dark-800 dark:bg-dark-800 bg-white border-l border-dark-700 dark:border-dark-700 border-gray-200 flex flex-col ${className}`}>
      {/* User Profile Header */}
      {currentUser && (
        <div className="p-4 border-b border-dark-700 dark:border-dark-700 border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar
              name={currentUser.name}
              src={currentUser.avatar}
              size="sm"
              className="border-2 border-dark-600 dark:border-dark-600 border-gray-300"
            />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white dark:text-white text-gray-900">{currentUser.name}</h3>
              <p className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">Online</p>
            </div>
            <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {/* Conversation Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        {conversation.description && (
          <div>
            <h4 className="text-sm font-semibold text-white dark:text-white text-gray-900 mb-2">Description</h4>
            <p className="text-sm text-dark-300 dark:text-dark-300 text-gray-700">{conversation.description}</p>
          </div>
        )}

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white dark:text-white text-gray-900">Member ({conversation.participants.length})</h4>
            <button className="text-xs text-purple-400 dark:text-purple-400 text-purple-600 hover:text-purple-300 dark:hover:text-purple-300 hover:text-purple-700">Show all</button>
          </div>
          <div className="space-y-3">
            {conversation.participants.slice(0, 4).map((participant) => (
              <div key={participant.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar
                    name={participant.name}
                    src={participant.avatar}
                    size="sm"
                    className="border-2 border-dark-600 dark:border-dark-600 border-gray-300"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-white dark:text-white text-gray-900">{participant.name}</span>
                    <span className={`text-xs ${participant.isOnline ? 'text-green-400 dark:text-green-400 text-green-600' : 'text-dark-400 dark:text-dark-400 text-gray-600'}`}>
                      {participant.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="w-6 h-6 bg-dark-700 dark:bg-dark-700 bg-gray-200 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-300 transition-colors">
                    <svg className="w-3 h-3 text-dark-400 dark:text-dark-400 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                  </button>
                  <button className="w-6 h-6 bg-dark-700 dark:bg-dark-700 bg-gray-200 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-300 transition-colors">
                    <svg className="w-3 h-3 text-dark-400 dark:text-dark-400 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Media */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white dark:text-white text-gray-900">Media ({media.length})</h4>
            {media.length > 0 && (
              <button 
                onClick={() => setShowMediaModal(true)}
                className="text-xs text-purple-400 dark:text-purple-400 text-purple-600 hover:text-purple-300 dark:hover:text-purple-300 hover:text-purple-700"
              >
                Show all
              </button>
            )}
          </div>
          {media.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {media.slice(0, 6).map((item, index) => (
                <div
                  key={item.id}
                  className="aspect-square bg-dark-700 dark:bg-dark-700 bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                  onClick={() => setShowMediaModal(true)}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.thumbnail || item.url}
                      alt="Media"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-dark-900/50">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {media.length > 6 && (
                <div 
                  className="aspect-square bg-dark-700 dark:bg-dark-700 bg-gray-200 rounded-lg flex items-center justify-center relative cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowMediaModal(true)}
                >
                  <div className="absolute inset-0 bg-dark-900 dark:bg-dark-900 bg-gray-900 bg-opacity-70 dark:bg-opacity-70 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-white dark:text-white text-gray-900 font-medium">+{media.length - 6}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
                    <p className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">No media files</p>
          )}
        </div>

        {/* File Types */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white dark:text-white text-gray-900">
              File Type ({Object.values(filesByType).flat().length})
            </h4>
            {Object.values(filesByType).flat().length > 0 && (
              <button 
                onClick={() => setShowFileModal(true)}
                className="text-xs text-purple-400 dark:text-purple-400 text-purple-600 hover:text-purple-300 dark:hover:text-purple-300 hover:text-purple-700"
              >
                Show all
              </button>
            )}
          </div>
          {Object.keys(filesByType).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(filesByType)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 5)
                .map(([type, files]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-lg cursor-pointer hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors"
                    onClick={() => setShowFileModal(true)}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                              <span className="text-sm text-white dark:text-white text-gray-900">{type}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">{files.length} File{files.length !== 1 ? 's' : ''}</span>
                      <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">No files</p>
          )}
        </div>

        {/* Video */}
        {videos.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white dark:text-white text-gray-900 mb-3">Video ({videos.length})</h4>
            <div className="space-y-2">
              {videos.slice(0, 3).map((video) => (
                <div
                  key={video.id}
                  className="p-2 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-lg cursor-pointer hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    if (video.metadata?.fileUrl) {
                      window.open(video.metadata.fileUrl, '_blank');
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                    <span className="text-sm text-white dark:text-white text-gray-900 truncate">
                      {video.metadata?.fileName || video.metadata?.downloadName || 'Video'}
                    </span>
                  </div>
                </div>
              ))}
              {videos.length > 3 && (
                <div 
                  className="p-2 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-lg cursor-pointer hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors text-center"
                  onClick={() => setShowMediaModal(true)}
                >
                  <span className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">+{videos.length - 3} more</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showMediaModal && (
        <MediaViewerModal
          isOpen={showMediaModal}
          media={media}
          onClose={() => setShowMediaModal(false)}
        />
      )}
      {showFileModal && (
        <FileListModal
          isOpen={showFileModal}
          filesByType={filesByType}
          onClose={() => setShowFileModal(false)}
        />
      )}
    </div>
  );
};
