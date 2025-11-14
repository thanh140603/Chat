// Media Viewer Modal - View all media (images/videos) in a conversation
import React, { useState } from 'react';
import type { Message } from './MessageList';

export interface MediaViewerModalProps {
  isOpen: boolean;
  media: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    thumbnail?: string;
    senderName: string;
    timestamp: string;
  }>;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  media,
  onClose,
}) => {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedItem = selectedMedia ? media.find(m => m.id === selectedMedia) : null;

  return (
    <>
      {/* Main Grid Modal */}
      <div className="fixed inset-0 bg-black/95 z-50 flex flex-col backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700/50 bg-dark-900/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white dark:text-white text-gray-900">
                Media Gallery
              </h2>
              <p className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">{media.length} {media.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-dark-700/50 rounded-full flex items-center justify-center hover:bg-dark-600 transition-all hover:scale-110"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {media.map((item, index) => (
              <div
                key={item.id}
                className="aspect-square bg-dark-800 rounded-xl overflow-hidden cursor-pointer group relative transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
                onClick={() => setSelectedMedia(item.id)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.thumbnail || item.url}
                    alt="Media"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-dark-900/40 group-hover:bg-dark-900/20 transition-colors">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs font-medium text-white truncate mb-1">{item.senderName}</p>
                    <p className="text-xs text-dark-300">{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                {/* Type badge */}
                <div className="absolute top-2 right-2">
                  <div className={`px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
                    item.type === 'image' 
                      ? 'bg-blue-500/80 text-white' 
                      : 'bg-purple-500/80 text-white'
                  }`}>
                    {item.type === 'image' ? '📷' : '🎥'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox for selected media */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/98 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMedia(null);
              }}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-dark-800/80 rounded-full flex items-center justify-center hover:bg-dark-700 transition-all hover:scale-110 backdrop-blur-sm"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div 
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedItem.type === 'image' ? (
                <img
                  src={selectedItem.url}
                  alt="Media"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <video
                  src={selectedItem.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                />
              )}
            </div>

            {/* Info overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-dark-800/90 backdrop-blur-md rounded-lg p-4">
              <p className="text-sm font-semibold text-white mb-1">{selectedItem.senderName}</p>
              <p className="text-xs text-dark-300">{new Date(selectedItem.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

