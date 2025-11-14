// File List Modal - View all files grouped by type
import React, { useState } from 'react';

export interface FileListModalProps {
  isOpen: boolean;
  filesByType: Record<string, Array<{
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
  }>>;
  onClose: () => void;
}

const getFileTypeIcon = (contentType?: string, fileName?: string) => {
  if (!contentType && !fileName) {
    return (
      <div className="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center">
        <svg className="w-6 h-6 text-dark-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      </div>
    );
  }

  const type = contentType?.toLowerCase() || '';
  const name = fileName?.toLowerCase() || '';

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return (
      <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
        <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      </div>
    );
  }

  if (type.includes('zip') || type.includes('rar') || name.endsWith('.zip') || name.endsWith('.rar')) {
    return (
      <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
        <svg className="w-7 h-7 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      </div>
    );
  }

  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) {
    return (
      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
        <svg className="w-7 h-7 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      </div>
    );
  }

  if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) {
    return (
      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
        <svg className="w-7 h-7 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-dark-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
    </div>
  );
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileListModal: React.FC<FileListModalProps> = ({
  isOpen,
  filesByType,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  if (!isOpen) return null;

  const fileTypes = Object.keys(filesByType).sort();
  const displayFiles = selectedType ? filesByType[selectedType] : Object.values(filesByType).flat();

  const handleDownload = async (file: {
    id: string;
    name: string;
    downloadName?: string;
    downloadUrl?: string;
    publicId?: string;
    url?: string;
  }) => {
    if (downloadingFileId) return;
    
    setDownloadingFileId(file.id);
    try {
      const fileName = file.downloadName || file.name;
      const publicId = file.publicId;
      
      if (publicId) {
        // Use proxy API to download
        const downloadUrl = `/api/messages/download?proxy=true&publicId=${encodeURIComponent(publicId)}&filename=${encodeURIComponent(fileName)}`;
        const response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to download file');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (file.downloadUrl) {
        // Fallback to direct download URL
        window.open(file.downloadUrl, '_blank');
      }
    } catch (error) {
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-dark-700/50 bg-dark-900/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white dark:text-white text-gray-900">
              Files
            </h2>
            <p className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">{displayFiles.length} {displayFiles.length === 1 ? 'file' : 'files'}</p>
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

      {/* Type Filter */}
      {fileTypes.length > 1 && (
        <div className="p-4 border-b border-dark-700/50 bg-dark-800/30 backdrop-blur-sm">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                selectedType === null
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white'
              }`}
            >
              All ({Object.values(filesByType).flat().length})
            </button>
            {fileTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedType === type
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white'
                }`}
              >
                {type} ({filesByType[type].length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3 max-w-4xl mx-auto">
          {displayFiles.map((file, index) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl hover:bg-dark-700/50 transition-all duration-300 cursor-pointer group border border-dark-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transform hover:scale-[1.02]"
              onClick={() => handleDownload(file)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {getFileTypeIcon(file.contentType, file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                    {file.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-dark-700/50 text-dark-300">
                      {formatFileSize(file.size)}
                    </span>
                    <span className="text-xs text-dark-500">•</span>
                    <p className="text-xs text-dark-400 truncate">{file.senderName}</p>
                    <span className="text-xs text-dark-500">•</span>
                    <p className="text-xs text-dark-400">{new Date(file.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(file);
                }}
                disabled={downloadingFileId === file.id}
                className="ml-4 p-3 bg-dark-700/50 rounded-lg hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 group-hover:scale-110"
                title="Download"
              >
                {downloadingFileId === file.id ? (
                  <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-dark-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

