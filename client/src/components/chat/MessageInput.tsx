// Chat Components - MessageInput
import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import messageService from '../../services/messageService';

export interface AttachmentPayload {
  url: string;
  downloadUrl: string;
  name: string;
  downloadName?: string;
  size: number;
  contentType: string;
  isImage: boolean;
  previewDataUrl?: string;
  publicId?: string;
}

export interface MessageInputProps {
  onSendMessage: (content: string, attachment?: AttachmentPayload) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Write a Message...',
  className = '',
}) => {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = React.useRef<number | null>(null);
  const typingPingIntervalRef = React.useRef<number | null>(null);
  const TYPING_IDLE_MS = 1800;
  const TYPING_PING_MS = 900; // keep-alive while typing
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [attachment, setAttachment] = useState<AttachmentPayload | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const stopTyping = () => {
    if (!onTyping) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typingPingIntervalRef.current) {
      clearInterval(typingPingIntervalRef.current);
      typingPingIntervalRef.current = null;
    }
    onTyping(false);
  };

  const resetAttachment = () => {
    setAttachment(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    const hasAttachment = Boolean(attachment);

    if ((!trimmedMessage && !hasAttachment) || disabled || isUploading) {
      return;
    }

    onSendMessage(trimmedMessage, attachment || undefined);
    setMessage('');
    resetAttachment();
    stopTyping();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scheduleTypingStop = () => {
    if (!onTyping) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, TYPING_IDLE_MS);

    // Ensure we keep sending 'typing' while the user is active
    if (!typingPingIntervalRef.current) {
      typingPingIntervalRef.current = window.setInterval(() => {
        onTyping(true);
      }, TYPING_PING_MS);
    }
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    if (disabled || !onTyping) return;

    if (value.trim()) {
      onTyping(true);
      scheduleTypingStop();
    } else {
      stopTyping();
    }
  };

  const handleKeyDownImmediate = () => {
    if (disabled || !onTyping) return;
    onTyping(true); // fire immediately on first keydown
    scheduleTypingStop();
  };

  const handleFocus = () => {
    if (disabled || !onTyping) return;
    onTyping(true); // optimistic start on focus
    scheduleTypingStop();
  };

  React.useEffect(() => {
    return () => {
      stopTyping();
    };
  }, []);

  return (
    <div className={`flex items-center space-x-2 p-4 border-t border-dark-700 dark:border-dark-700 border-gray-200 bg-dark-800 dark:bg-dark-800 bg-white ${className}`}>
      <div className="flex-1">
        <input
          type="text"
          value={message}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDownImmediate}
          onFocus={handleFocus}
          onBlur={stopTyping}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 bg-dark-700 dark:bg-dark-700 bg-gray-100 border border-dark-600 dark:border-dark-600 border-gray-300 rounded-lg text-white dark:text-white text-gray-900 placeholder-dark-400 dark:placeholder-dark-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-dark-800 dark:disabled:bg-dark-800 disabled:bg-gray-200 disabled:cursor-not-allowed"
        />
        {attachment && (
          <div className="mt-2 flex items-center gap-3 p-3 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-lg">
            {attachment.isImage && attachment.previewDataUrl ? (
              <img src={attachment.previewDataUrl} alt="preview" className="w-20 h-20 object-cover rounded" />
            ) : (
              <div className="w-20 h-20 bg-dark-600 dark:bg-dark-600 bg-gray-200 rounded flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-400 dark:text-dark-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white dark:text-white text-gray-900 mb-1 truncate">{attachment.name}</div>
              <div className="w-full bg-dark-600 dark:bg-dark-600 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-xs text-dark-400 dark:text-dark-400 text-gray-600 mt-1">
                {isUploading
                  ? `Uploading... ${uploadProgress}%`
                  : uploadProgress >= 100
                  ? attachment.isImage
                    ? 'Image ready to send'
                    : 'File ready to send'
                  : 'Preparing...'}
              </div>
            </div>
            {(uploadProgress >= 100 || !isUploading) && (
              <button
                onClick={() => {
                  resetAttachment();
                }}
                className="w-6 h-6 bg-dark-600 dark:bg-dark-600 bg-gray-300 hover:bg-dark-500 dark:hover:bg-dark-500 hover:bg-gray-400 rounded-full flex items-center justify-center transition-colors"
                title="Remove"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            
            // Validate file size: Cloudinary free plan limits
            // - Images and raw files: 10MB max
            // - Videos: 100MB max
            const maxSizeBytes = file.type.startsWith('video/') 
              ? 100 * 1024 * 1024  // 100MB for videos
              : 10 * 1024 * 1024;   // 10MB for images and other files
            
            if (file.size > maxSizeBytes) {
              const maxSizeMB = maxSizeBytes / (1024 * 1024);
              alert(`File size exceeds limit. Maximum allowed: ${maxSizeMB}MB (Cloudinary free plan limit)`);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
              return;
            }
            
            setIsUploading(true);
            setUploadProgress(0);

            const baseAttachment: AttachmentPayload = {
              url: '',
              downloadUrl: '',
              name: file.name,
              downloadName: file.name,
              size: file.size,
              contentType: file.type,
              isImage: file.type.startsWith('image/'),
            };
            setAttachment(baseAttachment);
            
            let previewDataUrl: string | undefined;
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                previewDataUrl = dataUrl;
                setAttachment((prev) =>
                  prev
                    ? { ...prev, previewDataUrl: dataUrl, isImage: true }
                    : {
                        url: '',
                        downloadUrl: '',
                        name: file.name,
                        size: file.size,
                        contentType: file.type,
                        isImage: true,
                        previewDataUrl: dataUrl,
                      }
                );
              };
              reader.readAsDataURL(file);
            }
            
            try {
              const uploadResult = await messageService.uploadFile(file, (progress) => {
                setUploadProgress(progress);
              });
              
              setAttachment((prev) => ({
                url: uploadResult.secureUrl,
                downloadUrl: uploadResult.downloadUrl,
                name: uploadResult.originalFilename || file.name,
                downloadName: uploadResult.sanitizedFilename || uploadResult.originalFilename || file.name,
                size: uploadResult.size ?? file.size,
                contentType: uploadResult.contentType || file.type,
                isImage: (uploadResult.contentType || file.type).startsWith('image/'),
                previewDataUrl: prev?.previewDataUrl ?? previewDataUrl,
                publicId: uploadResult.publicId,
              }));
              setIsUploading(false);
              setUploadProgress(100);
            } catch (error) {
              setIsUploading(false);
              setUploadProgress(0);
              resetAttachment();
              alert('Failed to upload file. Please try again.');
            } finally {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-200 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-300 transition-colors"
          title="Attach image/file"
        >
          <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3.16-2.44 5.7-5.3 5.7S6.7 14.16 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        </button>
        
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !attachment) || disabled || isUploading}
          className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors disabled:bg-dark-700 dark:disabled:bg-dark-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
};
