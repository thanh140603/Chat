// Chat Components - MessageList
import React, { useEffect, useRef } from 'react';
import { Avatar } from '../ui/Avatar';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'audio';
  originalCreatedAt?: string;
  updatedAt?: string;
  readBy?: string[]; // List of user IDs who have read this message
  metadata?: {
    fileName?: string;
    downloadName?: string;
    fileSize?: string;
    fileUrl?: string;
    downloadUrl?: string;
    contentType?: string;
    imageUrl?: string;
    audioUrl?: string;
    duration?: string;
    publicId?: string;
  };
  forwardedFromSenderName?: string;
  forwardedFromSenderId?: string;
  forwardedFromMessageId?: string;
  forwardedAt?: string;
  forwardedFromConversationId?: string;
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  currentUserAliases?: string[];
  currentUserAvatar?: string;
  participants?: Array<{ id: string; name: string; avatar?: string }>;
  className?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onLoadMore?: () => void;
      hasMore?: boolean;
      isLoadingMore?: boolean;
      participantLastSeen?: Record<string, number>;
      participantLastReadMessageId?: Record<string, string>;
      onScrollToBottom?: () => void;
      onForwardMessage?: (message: Message) => void;
      onPinMessage?: (message: Message) => void;
      onUnpinMessage?: (message: Message) => void;
      pinnedMessageId?: string | null;
      searchTerm?: string;
    }

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  currentUserAliases = [],
  currentUserAvatar,
  participants = [],
  className = '',
  onEditMessage,
  onDeleteMessage,
  onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      participantLastSeen = {},
      participantLastReadMessageId = {},
      onScrollToBottom,
      onForwardMessage,
      onPinMessage,
      onUnpinMessage,
      pinnedMessageId,
      searchTerm,
    }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState<string>('');
  const [originalContent, setOriginalContent] = React.useState<string>(''); // Store original content before editing
  const [contextMenuMessageId, setContextMenuMessageId] = React.useState<string | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = React.useRef<number>(0);
  const shouldScrollToBottomRef = React.useRef<boolean>(true);
  const [showJumpToLatest, setShowJumpToLatest] = React.useState<boolean>(false);
  const messageRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle scroll to detect when user scrolls to top (for infinite scroll)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !onLoadMore) {
      return;
    }

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let isLoading = false;

    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        
        // Check if user is near the bottom (within 200px)
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;
        shouldScrollToBottomRef.current = isNearBottom;
        setShowJumpToLatest(!isNearBottom);
        setShowJumpToLatest(!isNearBottom);
        
        // If user scrolls to bottom, trigger mark as seen callback
        if (isNearBottom && onScrollToBottom) {
          onScrollToBottom();
        }

        // Check if user is near the top (within 100px) and can load more
        if (scrollTop < 100 && hasMore && !isLoadingMore && !isLoading && onLoadMore) {
          isLoading = true;
          // Save current scroll position
          previousScrollHeightRef.current = scrollHeight;
          onLoadMore();
          // Reset loading flag after a delay to prevent multiple triggers
          setTimeout(() => {
            isLoading = false;
          }, 1000);
        }
      }, 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [onLoadMore, hasMore, isLoadingMore]);

  // Restore scroll position after loading more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || previousScrollHeightRef.current === 0) {
      return;
    }

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const newScrollHeight = container.scrollHeight;
      const scrollDifference = newScrollHeight - previousScrollHeightRef.current;
      
      if (scrollDifference > 0) {
        container.scrollTop = scrollDifference;
        previousScrollHeightRef.current = 0;
      }
    });
  }, [messages.length]);

  // Filtering by search query
  const normalizedQuery = React.useMemo(() => (searchTerm ?? '').trim().toLowerCase(), [searchTerm]);
  const visibleMessages = React.useMemo(() => {
    if (!normalizedQuery) return messages;
    return messages.filter((m) => (m.content || '').toLowerCase().includes(normalizedQuery));
  }, [messages, normalizedQuery]);

  const highlightText = (text: string) => {
    if (!normalizedQuery) return <>{text}</>;
    const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, idx) =>
          part.toLowerCase() === normalizedQuery ? (
            <mark key={idx} className="bg-amber-400 text-black rounded px-0.5">{part}</mark>
          ) : (
            <span key={idx}>{part}</span>
          )
        )}
      </>
    );
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for scroll-to-message events from search
  useEffect(() => {
    const handleScrollToMessage = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageId: string }>;
      const messageId = customEvent.detail?.messageId;
      if (!messageId) return;

      // Find the message element
      const messageElement = messageRefs.current.get(messageId);
      if (messageElement && messagesContainerRef.current) {
        // Scroll to message
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the message
        setHighlightedMessageId(messageId);
        
        // Auto-remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 3000);
      }
    };

    window.addEventListener('chat:scroll-to-message', handleScrollToMessage);
    return () => {
      window.removeEventListener('chat:scroll-to-message', handleScrollToMessage);
    };
  }, []);

  const canEditMessage = (message: Message): boolean => {
    if (!message.timestamp) return false;
    const messageTime = new Date(message.timestamp).getTime();
    const now = Date.now();
    const hoursSinceCreation = (now - messageTime) / (1000 * 60 * 60);
    return hoursSinceCreation < 1; // Can only edit within 1 hour
  };

  const handleEdit = (message: Message) => {
    if (!canEditMessage(message)) {
      alert('Message can only be edited within 1 hour of creation');
      return;
    }
    setEditingMessageId(message.id);
    setEditContent(message.content);
    setOriginalContent(message.content); // Store original content to compare later
    setContextMenuMessageId(null);
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editContent.trim() && onEditMessage) {
      // Only call onEditMessage if content actually changed
      const trimmedContent = editContent.trim();
      if (trimmedContent !== originalContent.trim()) {
        onEditMessage(editingMessageId, trimmedContent);
      }
      setEditingMessageId(null);
      setEditContent('');
      setOriginalContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
    setOriginalContent('');
  };

  const handleDelete = (messageId: string) => {
    if (onDeleteMessage && confirm('Are you sure you want to delete this message?')) {
      onDeleteMessage(messageId);
      setContextMenuMessageId(null);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today, ' + date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
  };

  const normalize = (value?: string) => (value ?? '').trim().toLowerCase();
  const aliasSet = React.useMemo(() => {
    const normalized = currentUserAliases
      .concat(currentUserId)
      .map(alias => normalize(alias))
      .filter(alias => alias.length > 0);
    normalized.push('you');
    return new Set(normalized);
  }, [currentUserAliases, currentUserId]);

  // Read receipt avatars component (Messenger style)
  // Show below the last message that others have read (for each sender)
  const ReadReceiptAvatars: React.FC<{
    message: Message;
    messages: Message[];
    messageIndex: number;
    participants: Array<{ id: string; name: string; avatar?: string }>;
    participantLastSeen: Record<string, number>;
    participantLastReadMessageId: Record<string, string>;
    currentUserId: string;
    currentUserAliases: string[];
  }> = ({ message, messages, messageIndex, participants, participantLastSeen, participantLastReadMessageId, currentUserId }) => {
    const normalize = (value?: string) => (value ?? '').trim().toLowerCase();
    const messageSenderId = normalize(message.senderId);
    
    // Get other participants (excluding current user AND sender)
    const otherParticipants = participants.filter(p => {
      const normalizedPId = normalize(p.id);
      return normalizedPId !== normalize(currentUserId) && normalizedPId !== messageSenderId;
    });
    
    if (otherParticipants.length === 0) {
      return null;
    }
    const messageTime = new Date(message.timestamp).getTime();
    
    // Calculate who has read this message (excluding the sender)
    const readBySet = new Set<string>();
    
    // Add users from readBy array (excluding sender and current user if it's own message)
    if (message.readBy) {
      message.readBy.forEach(userId => {
        const normalizedUserId = normalize(userId);
        // Don't include sender or current user
        if (normalizedUserId !== messageSenderId && normalizedUserId !== normalize(currentUserId)) {
          readBySet.add(userId);
        }
      });
    }
    
    // Also add participants who have read this message (using lastReadMessageId or lastSeenAt)
    otherParticipants.forEach(p => {
      const normalizedPId = normalize(p.id);
      // Don't include sender or current user
      if (normalizedPId === messageSenderId || normalizedPId === normalize(currentUserId)) return;
      
      // First check if participant has read this specific message (using lastReadMessageId)
      // Add null check for participantLastReadMessageId
      const lastReadMessageId = participantLastReadMessageId?.[p.id];
      if (lastReadMessageId && message.id === lastReadMessageId) {
        // Participant has read this exact message
        readBySet.add(p.id);
      } else if (lastReadMessageId) {
        // Check if this message was sent before the last read message
        // Find the last read message in the messages list
        const lastReadMessage = messages.find(m => m.id === lastReadMessageId);
        if (lastReadMessage) {
          const lastReadTime = new Date(lastReadMessage.timestamp).getTime();
          // If this message was sent before or at the same time as the last read message, it's been read
          if (messageTime <= lastReadTime) {
            readBySet.add(p.id);
          }
        }
      } else {
        // Fallback to lastSeenAt timestamp if lastReadMessageId is not available
        const lastSeenTime = participantLastSeen[p.id];
        if (lastSeenTime && messageTime <= lastSeenTime) {
          readBySet.add(p.id);
        }
      }
    });
    
    // If no one has read, don't show anything
    if (readBySet.size === 0) {
      return null;
    }
    
    // Find the last message from this sender that others have read
    let lastReadMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgSenderId = normalize(msg.senderId);
      
      // Only check messages from the same sender
      if (msgSenderId !== messageSenderId) continue;
      
      const msgTime = new Date(msg.timestamp).getTime();
      let hasRead = false;
      
      // Check if anyone has read this message (excluding sender)
      if (msg.readBy && msg.readBy.some(userId => {
        const normalizedUserId = normalize(userId);
        return normalizedUserId !== msgSenderId && normalizedUserId !== normalize(currentUserId);
      })) {
        hasRead = true;
      } else {
        // Check participantLastReadMessageId or participantLastSeen
        for (const p of otherParticipants) {
          const normalizedPId = normalize(p.id);
          if (normalizedPId === msgSenderId) continue; // Skip sender
          
          // First check lastReadMessageId
          // Add null check for participantLastReadMessageId
          const lastReadMessageId = participantLastReadMessageId?.[p.id];
          if (lastReadMessageId && msg.id === lastReadMessageId) {
            hasRead = true;
            break;
          } else if (lastReadMessageId) {
            // Check if this message was sent before the last read message
            const lastReadMessage = messages.find(m => m.id === lastReadMessageId);
            if (lastReadMessage) {
              const lastReadTime = new Date(lastReadMessage.timestamp).getTime();
              if (msgTime <= lastReadTime) {
                hasRead = true;
                break;
              }
            }
          } else {
            // Fallback to lastSeenAt
            const lastSeenTime = participantLastSeen[p.id];
            if (lastSeenTime && msgTime <= lastSeenTime) {
              hasRead = true;
              break;
            }
          }
        }
      }
      
      if (hasRead) {
        lastReadMessageIndex = i;
        break;
      }
    }
    
    // Only show on the last message from this sender that others have read
    if (messageIndex !== lastReadMessageIndex) {
      return null;
    }
    
    // Get avatars of users who have read this specific message
    // Double-check: exclude sender from read receipts
    const readByParticipants = Array.from(readBySet)
      .filter(userId => {
        // Exclude sender - double check to ensure sender is never included
        const normalizedUserId = normalize(userId);
        return normalizedUserId !== messageSenderId && normalizedUserId !== normalize(currentUserId);
      })
      .map(userId => otherParticipants.find(p => {
        const normalizedPId = normalize(p.id);
        // Also exclude sender when mapping from participants
        return p.id === userId && normalizedPId !== messageSenderId;
      }))
      .filter((p): p is { id: string; name: string; avatar?: string } => p !== undefined)
      .slice(0, 3); // Limit to 3 avatars max (like Messenger)
    
    if (readByParticipants.length === 0) {
      return null;
    }
    
    // Render avatars - positioned below message bubble, aligned with message content
    const isOwnMessage = messageSenderId === normalize(currentUserId);
    return (
      <div className={`flex flex-row items-center gap-0.5 mt-1 w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        {readByParticipants.map((p, idx) => (
          <div
            key={p.id}
            className="relative"
            style={{ marginLeft: idx > 0 ? '-4px' : '0', zIndex: readByParticipants.length - idx }}
          >
            <Avatar
              name={p.name}
              src={p.avatar}
              size="xs"
              className="border-2 border-dark-800"
            />
          </div>
        ))}
        {readBySet.size > 3 && (
          <span className="text-xs text-dark-400 dark:text-dark-400 text-gray-600 ml-1">+{readBySet.size - 3}</span>
        )}
      </div>
    );
  };

  const idToParticipant = React.useMemo(() => {
    const map = new Map<string, { name: string; avatar?: string }>();
    for (const p of participants) {
      map.set(normalize(p.id), { name: p.name, avatar: p.avatar });
    }
    return map;
  }, [participants]);

  const getAvatarFor = (senderId: string): string | undefined => {
    const info = idToParticipant.get(normalize(senderId));
    if (info?.avatar && info.avatar.trim().length > 0) return info.avatar;
    if (aliasSet.has(senderId)) return currentUserAvatar;
    return undefined;
  };

  const getFileIcon = (contentType?: string, fileName?: string) => {
    const extension = (fileName || '').split('.').pop()?.toLowerCase();
    const type = contentType || '';

    if (extension === 'pdf' || type.includes('pdf')) {
      return {
        bg: 'bg-red-700/30 text-red-300 border border-red-500/40',
        label: 'PDF',
      };
    }

    if (['doc', 'docx'].includes(extension ?? '') || type.includes('word')) {
      return {
        bg: 'bg-blue-700/30 text-blue-300 border border-blue-500/40',
        label: 'DOC',
      };
    }

    if (['xls', 'xlsx', 'csv'].includes(extension ?? '') || type.includes('excel') || type.includes('spreadsheet')) {
      return {
        bg: 'bg-green-700/30 text-green-300 border border-green-500/40',
        label: 'XLS',
      };
    }

    if (['ppt', 'pptx'].includes(extension ?? '') || type.includes('powerpoint')) {
      return {
        bg: 'bg-orange-700/30 text-orange-300 border border-orange-500/40',
        label: 'PPT',
      };
    }

    if (['zip', 'rar', '7z'].includes(extension ?? '') || type.includes('zip') || type.includes('compressed')) {
      return {
        bg: 'bg-yellow-700/30 text-yellow-300 border border-yellow-500/40',
        label: 'ZIP',
      };
    }

    if (extension === 'txt' || type.includes('text/plain')) {
      return {
        bg: 'bg-slate-700/30 text-slate-200 border border-slate-500/40',
        label: 'TXT',
      };
    }

    return {
      bg: 'bg-dark-600 text-dark-200 border border-dark-500/40',
      label: (extension || 'FILE').toUpperCase().slice(0, 3),
    };
  };

  const renderMessage = (message: Message, index: number) => {
    const senderId = normalize(message.senderId);
    const senderName = normalize(message.senderName);

    const isOwn = aliasSet.has(senderId) || aliasSet.has(senderName);
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

    // Split chains not only by sender, but also by time gap (e.g., > 5 minutes)
    const GAP_MS = 5 * 60 * 1000;
    const prevGapBreak = (() => {
      if (!prevMessage) return true;
      if (prevMessage.senderId !== message.senderId) return true;
      const prevTime = new Date(prevMessage.timestamp).getTime();
      const curTime = new Date(message.timestamp).getTime();
      return curTime - prevTime > GAP_MS;
    })();
    const nextGapBreak = (() => {
      if (!nextMessage) return true;
      if (nextMessage.senderId !== message.senderId) return true;
      const curTime = new Date(message.timestamp).getTime();
      const nextTime = new Date(nextMessage.timestamp).getTime();
      return nextTime - curTime > GAP_MS;
    })();

    const showSenderName = prevGapBreak; // Show name on first message of a chain/time-block
    const showAvatarAtEnd = nextGapBreak; // Show avatar on last message of a chain/time-block
    const showDate = !prevMessage || formatDate(prevMessage.timestamp) !== formatDate(message.timestamp);

    return (
      <div
        key={message.id}
        data-mid={message.id}
        ref={(el) => {
          if (el) {
            messageRefs.current.set(message.id, el);
          } else {
            messageRefs.current.delete(message.id);
          }
        }}
        className="w-full"
      >
        {showDate && (
          <div className="flex justify-center my-4">
            <span className="text-xs text-dark-400 dark:text-dark-400 text-gray-600 bg-dark-800 dark:bg-dark-800 bg-gray-100 px-3 py-1 rounded-full">
              {formatDate(message.timestamp)}
            </span>
          </div>
        )}
        
        {/* Message container - own messages on right, others on left */}
        {showSenderName && (
          <div className="w-full flex justify-center mb-1 px-2">
            <span className="text-xs text-dark-400 dark:text-dark-400 text-gray-600 px-1">{message.senderName}</span>
          </div>
        )}
        <div className={`flex w-full mb-1 ${isOwn ? 'justify-end' : 'justify-start'} px-2 items-end`}>
          {!isOwn && (
            <div className="flex items-end mr-2 self-end">
              {showAvatarAtEnd ? (
                <Avatar
                  name={message.senderName}
                  src={getAvatarFor(message.senderId)}
                  size="xs"
                  className="mb-0"
                />
              ) : (
                <div className="w-6" />
              )}
            </div>
          )}
          
          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
            <div className={`flex items-end gap-2 ${isOwn ? 'flex-row' : 'flex-row'} group relative group/message-item`}>
              {editingMessageId === message.id ? (
                <div className={`flex-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                  <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    className="w-full px-3 py-2 bg-dark-800 dark:bg-dark-800 bg-white border border-purple-500 dark:border-purple-500 border-purple-400 rounded-lg text-white dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-dark-700 dark:bg-dark-700 bg-gray-300 text-white dark:text-white text-gray-900 rounded hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-400 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenuMessageId(prev => (prev === message.id ? null : message.id));
                    }}
                    className={`absolute -top-3 ${isOwn ? 'left-0' : 'right-0'} transform -translate-y-1/2 bg-dark-800 border border-dark-600 rounded-full p-1 opacity-0 group-hover/message-item:opacity-100 transition-opacity`}
                    title="Message actions"
                    type="button"
                  >
                    <svg className="w-3.5 h-3.5 text-dark-300 dark:text-dark-300 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                    </svg>
                  </button>
                  <div
                    className={`px-3 py-2 rounded-lg transition-all duration-500 ${
                      isOwn
                        ? 'bg-purple-600 text-white rounded-tr-none self-end'
                        : 'bg-dark-700 dark:bg-dark-700 bg-gray-200 text-white dark:text-white text-gray-900 rounded-tl-none self-start'
                    } ${
                      highlightedMessageId === message.id
                        ? 'ring-8 ring-amber-400 ring-opacity-100 shadow-2xl scale-[1.05] bg-amber-500/20 animate-pulse'
                        : ''
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuMessageId(message.id);
                    }}
                  >
                    {message.forwardedFromSenderName && (
                      <div className="flex items-center gap-1 text-xs text-amber-200 mb-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h8a4 4 0 010 8H7m8 0l-3-3m3 3l-3 3" />
                        </svg>
                        <span>Forwarded from {message.forwardedFromSenderName}</span>
                      </div>
                    )}
                    {message.type === 'text' && (
                      <p className={`text-sm whitespace-pre-wrap break-words ${isOwn ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {highlightText(message.content || '')}
                        {(() => {
                          // Show "(edited)" if updatedAt exists and is significantly later than original time
                          if (!message.updatedAt || !message.updatedAt.trim()) return null;
                          const originalTime = message.originalCreatedAt 
                            ? new Date(message.originalCreatedAt).getTime()
                            : new Date(message.timestamp).getTime();
                          const updatedTime = new Date(message.updatedAt).getTime();
                          if (updatedTime > originalTime + 1000) {
                            return <span className={`ml-2 text-xs opacity-75 ${isOwn ? 'text-white/75' : 'text-gray-600 dark:text-white/75'}`}>(edited)</span>;
                          }
                          return null;
                        })()}
                      </p>
                    )}
                
                {message.type === 'image' && message.metadata?.imageUrl && (
                  <div className="space-y-2">
                    <img
                      src={message.metadata.imageUrl}
                      alt="Shared image"
                      className="max-w-xs rounded-lg"
                    />
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                )}
                
                {message.type === 'audio' && (
                  <div className="flex items-center space-x-2">
                    <button className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                    <div className="flex-1">
                      <div className="w-full h-1 bg-white bg-opacity-20 rounded-full">
                        <div className="w-1/3 h-1 bg-white rounded-full"></div>
                      </div>
                      <p className="text-xs mt-1">{message.metadata?.duration || '2:30'}</p>
                    </div>
                  </div>
                )}
                
                {message.type === 'file' && message.metadata?.fileUrl && (
                  <a
                    href={message.metadata?.downloadUrl || message.metadata?.fileUrl}
                    onClick={async (e) => {
                      if (!message.metadata) return;
                      const cloudinaryUrl = message.metadata.downloadUrl || message.metadata.fileUrl;
                      const downloadName = message.metadata.downloadName || message.metadata.fileName || 'download';
                      const publicId = message.metadata.publicId;
                      if (cloudinaryUrl) {
                        e.preventDefault();
                        try {
                          // Use proxy API to stream file directly (avoid 401 errors from direct Cloudinary access)
                          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                          const token = localStorage.getItem('accessToken');
                          let proxyUrl = `${apiUrl}/api/messages/download?url=${encodeURIComponent(cloudinaryUrl)}&filename=${encodeURIComponent(downloadName)}&proxy=true`;
                          if (publicId) {
                            proxyUrl += `&publicId=${encodeURIComponent(publicId)}`;
                          }
                          
                          const proxyResponse = await fetch(proxyUrl, {
                            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                          });
                          
                          if (!proxyResponse.ok) {
                            const errorText = await proxyResponse.text();
                            throw new Error(`Failed to download file: ${errorText}`);
                          }
                          
                          // Server streams the file directly with proper Content-Disposition header
                          const blob = await proxyResponse.blob();
                          const blobUrl = window.URL.createObjectURL(blob);
                          
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = downloadName;
                          link.rel = 'noopener';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                          alert('Failed to download file. Please try again.');
                        }
                      }
                    }}
                    className="block bg-dark-700 dark:bg-dark-700 bg-gray-100 border border-dark-600 dark:border-dark-600 border-gray-300 rounded-lg px-4 py-3 hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {(() => {
                        const icon = getFileIcon(message.metadata?.contentType, message.metadata?.fileName);
                        return (
                          <div className={`w-12 h-14 rounded-md flex items-center justify-center ${icon.bg}`}>
                            <span className="text-sm font-semibold">{icon.label}</span>
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white dark:text-white text-gray-900 truncate">
                          {message.metadata.fileName || 'Download file'}
                        </div>
                        <div className="text-xs text-dark-300 dark:text-dark-300 text-gray-600 mt-0.5">
                          {(() => {
                            const ext = message.metadata?.fileName?.split('.').pop()?.toUpperCase();
                            const size = message.metadata?.fileSize;
                            if (ext && size) return `${ext} · ${size}`;
                            if (ext) return ext;
                            if (size) return size;
                            return 'File attachment';
                          })()}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                  </a>
                )}
                  </div>
                  {/* Edit/Delete buttons - visible on hover for own messages */}
                  {isOwn && (
                    <div className={`absolute ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-0 opacity-0 group-hover/message-item:opacity-100 transition-opacity flex items-center gap-1 bg-dark-800 dark:bg-dark-800 bg-white border border-dark-600 dark:border-dark-600 border-gray-300 rounded-lg p-1 shadow-lg z-10`}>
                      {canEditMessage(message) && (
                        <button
                          onClick={() => handleEdit(message)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100 rounded transition-colors"
                          title="Edit message"
                        >
                          <svg className="w-4 h-4 text-dark-300 dark:text-dark-300 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(message.id)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100 rounded transition-colors"
                        title="Delete message"
                      >
                        <svg className="w-4 h-4 text-red-400 dark:text-red-400 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Context menu - fallback for right-click */}
                  {contextMenuMessageId === message.id && (
                    <div
                      ref={contextMenuRef}
                      className="absolute right-0 top-0 mt-8 bg-dark-800 dark:bg-dark-800 bg-white border border-dark-600 dark:border-dark-600 border-gray-300 rounded-lg shadow-xl z-50 min-w-[120px]"
                    >
                      {canEditMessage(message) && (
                        <button
                          onClick={() => handleEdit(message)}
                          className="w-full px-4 py-2 text-left text-sm text-white dark:text-white text-gray-900 hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100 rounded-t-lg flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      )}
                      {onForwardMessage && (
                        <button
                          onClick={() => {
                            onForwardMessage(message);
                            setContextMenuMessageId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-white dark:text-white text-gray-900 hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          Forward
                        </button>
                      )}
                      {onPinMessage && pinnedMessageId !== message.id && (
                        <button
                          onClick={() => {
                            onPinMessage(message);
                            setContextMenuMessageId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-white dark:text-white text-gray-900 hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7l-1-5H9L8 7m8 0H8m8 0l3 7H5m12 0l1 5H6l1-5" />
                          </svg>
                          Pin message
                        </button>
                      )}
                      {onUnpinMessage && pinnedMessageId === message.id && (
                        <button
                          onClick={() => {
                            onUnpinMessage(message);
                            setContextMenuMessageId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-white dark:text-white text-gray-900 hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12l3-3m0 0l-3-3m3 3H9m7 6l-1 5H9l-1-5m8-6L8 19" />
                          </svg>
                          Unpin message
                        </button>
                      )}
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(message.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-400 dark:text-red-400 text-red-600 hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100 rounded-b-lg flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {isOwn ? (
                <div className="flex items-center gap-1 order-first">
                  <span className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-dark-400 dark:text-dark-400 text-gray-600">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Read receipts avatars (Messenger style) - show below message, for all messages */}
            <ReadReceiptAvatars
              message={message}
              messages={messages}
              messageIndex={index}
              participants={participants}
              participantLastSeen={participantLastSeen}
              participantLastReadMessageId={participantLastReadMessageId}
              currentUserId={currentUserId}
              currentUserAliases={currentUserAliases}
            />
          </div>
          
          {isOwn && (
            <div className="flex items-end ml-2 self-end">
              {showAvatarAtEnd ? (
                <Avatar
                  name={message.senderName}
                  src={getAvatarFor(message.senderId)}
                  size="xs"
                  className="mb-0"
                />
              ) : (
                <div className="w-6" />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={messagesContainerRef}
      className={`flex-1 overflow-y-auto p-4 bg-dark-900 dark:bg-dark-900 bg-gray-50 relative ${className}`}
    >
      {/* Search box removed per request */}
      {/* Loading indicator at top when loading more */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="flex items-center space-x-2 text-dark-400 dark:text-dark-400 text-gray-500">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Loading more messages...</span>
          </div>
        </div>
      )}

      {visibleMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-dark-400 dark:text-dark-400 text-gray-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>{normalizedQuery ? 'No results' : 'No messages yet'}</p>
            <p className="text-sm">{normalizedQuery ? 'Try a different keyword' : 'Start the conversation!'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1 w-full">
          {visibleMessages.map((message, index) => renderMessage(message, index))}
        </div>
      )}
      <div ref={messagesEndRef} />

      {showJumpToLatest && (
        <div className="sticky bottom-4 z-50 flex justify-end pr-2 pointer-events-none">
          <button
            onClick={scrollToBottom}
            className="pointer-events-auto inline-flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500 text-black hover:bg-amber-400 shadow-lg ring-1 ring-black/10"
            title="Jump to latest"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            <span className="text-sm font-semibold">Latest</span>
          </button>
        </div>
      )}
    </div>
  );
};