// Chat Components - ChatRoom
import React, { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import type { Message } from './MessageList';
import { MessageInput } from './MessageInput';
import type { AttachmentPayload } from './MessageInput';
import { Avatar } from '../ui/Avatar';
import { GroupManagementModal } from './GroupManagementModal';

export interface ConversationSearchResult {
  id: string;
  content: string;
  senderName: string;
  timestamp: string;
}

export interface ConversationSearchParams {
  query: string;
  senderId?: string;
  fromDate?: string;
  toDate?: string;
  reset?: boolean;
}

export interface ChatRoomProps {
  conversationId: string;
  conversationName: string;
  conversationType?: 'direct' | 'group';
  conversationAvatarUrl?: string | null;
  participants: Array<{
    id: string;
    name: string;
    username?: string;
    displayName?: string;
    avatar?: string;
    avatarUrl?: string;
    isOnline?: boolean;
    role?: 'admin' | 'member';
    joinedAt?: string;
    lastSeenAt?: string;
    lastReadMessageId?: string;
  }>;
  currentUserId: string;
  currentUserAvatar?: string;
  currentUserAliases?: string[];
  onSendMessage: (content: string, attachment?: AttachmentPayload) => void;
  onTyping: (isTyping: boolean) => void;
  messages: Message[];
  typingUserIds?: string[];
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onConversationUpdate?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  participantLastSeen?: Record<string, number>;
  participantLastReadMessageId?: Record<string, string>;
  onScrollToBottom?: () => void;
  className?: string;
  onForwardMessage?: (message: Message) => void;
  onPinMessage?: (message: Message) => void;
  onUnpinMessage?: (message: Message) => void;
  pinnedMessageId?: string | null;
  pinnedMessage?: Message | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onSearchMessages?: (params: ConversationSearchParams) => void;
  onSearchLoadMore?: () => void;
  onSearchResultSelect?: (result: ConversationSearchResult) => void;
  searchResults?: ConversationSearchResult[];
  searchLoading?: boolean;
  searchHasMore?: boolean;
  onInitiateCall?: (type: 'VOICE' | 'VIDEO') => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  conversationId,
  conversationName,
  conversationType = 'direct',
  conversationAvatarUrl,
  participants,
  currentUserId,
  currentUserAvatar,
  currentUserAliases,
  onSendMessage,
  onTyping,
  messages,
  typingUserIds = [],
  onEditMessage,
  onDeleteMessage,
  onConversationUpdate,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  participantLastSeen,
  participantLastReadMessageId,
  onScrollToBottom,
  className = '',
  onForwardMessage,
  onPinMessage,
  onUnpinMessage,
  pinnedMessageId,
  pinnedMessage,
  isFavorite,
  onToggleFavorite,
  isMuted,
  onToggleMute,
  onSearchMessages,
  onSearchLoadMore,
  onSearchResultSelect,
  searchResults = [],
  searchLoading = false,
  searchHasMore = false,
  onInitiateCall,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const lastSearchSignatureRef = React.useRef<string>('');
  const [hasExecutedSearch, setHasExecutedSearch] = useState(false);

  useEffect(() => {
    lastSearchSignatureRef.current = '';
    setSearchQuery('');
    setSelectedSenderId('');
    setFromDate('');
    setToDate('');
  }, [conversationId]);

  useEffect(() => {
    // Simulate connection status
    setIsConnected(true);
  }, [conversationId]);

  useEffect(() => {
    if (
      selectedSenderId &&
      !participants.some((participant) => participant.id === selectedSenderId)
    ) {
      setSelectedSenderId('');
    }
  }, [participants, selectedSenderId]);

  const searchTerm = searchQuery.trim();

  const toggleSearchPanel = () => {
    setShowSearch((prev) => {
      if (prev) {
        lastSearchSignatureRef.current = '';
        setSearchQuery('');
        setSelectedSenderId('');
        setFromDate('');
        setToDate('');
        setHasExecutedSearch(false);
        onSearchMessages?.({ query: '', reset: true });
      }
      return !prev;
    });
  };

  const handleApplySearch = () => {
    if (!onSearchMessages) return;
    if (searchTerm.length < 2) {
      return;
    }
    const signature = JSON.stringify({
      query: searchTerm,
      senderId: selectedSenderId || '',
      fromDate: fromDate || '',
      toDate: toDate || '',
    });
    if (signature === lastSearchSignatureRef.current) {
      return;
    }
    lastSearchSignatureRef.current = signature;
    setHasExecutedSearch(true);
    onSearchMessages({
      query: searchTerm,
      senderId: selectedSenderId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      reset: true,
    });
  };

  const handleClearSearch = () => {
    lastSearchSignatureRef.current = '';
    setSearchQuery('');
    setSelectedSenderId('');
    setFromDate('');
    setToDate('');
    setHasExecutedSearch(false);
    onSearchMessages?.({ query: '', reset: true });
  };

  const handleLoadMoreResults = () => {
    if (!hasExecutedSearch || !onSearchLoadMore || searchLoading || searchTerm.length < 2) return;
    onSearchLoadMore();
  };

  const highlightResultText = (text: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      return text;
    }
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, idx) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={`${part}-${idx}`} className="bg-amber-400/80 text-black rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={`${part}-${idx}`}>{part}</span>
          )
        )}
      </>
    );
  };

  const formatResultTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className={`flex flex-col h-full bg-dark-900 dark:bg-dark-900 bg-gray-50 ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 bg-dark-800 dark:bg-dark-800 bg-white border-b border-dark-700 dark:border-dark-700 border-gray-200 relative">
        <div className="flex items-center space-x-3">
          <Avatar
            src={conversationAvatarUrl || undefined}
            name={conversationName}
            size="sm"
            className="border-2 border-dark-600 dark:border-dark-600 border-gray-300"
          />
          <div>
            <h2 className="text-lg font-semibold text-white dark:text-white text-gray-900">{conversationName}</h2>
            <p className="text-sm text-dark-400 dark:text-dark-400 text-gray-600">
              {participants.length} members
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleFavorite}
            className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className={`w-4 h-4 ${isFavorite ? 'text-amber-400 dark:text-amber-400' : 'text-dark-400 dark:text-dark-400 text-gray-600'}`} viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a1 1 0 011.04 0l2.09 1.205 2.385.112a1 1 0 01.908.632l.81 2.2 1.652 1.79a1 1 0 01-.02 1.38l-1.61 1.83-.58 2.34a1 1 0 01-1.02.76l-2.36-.28-2.06 1.24a1 1 0 01-1.04 0l-2.06-1.24-2.36.28a1 1 0 01-1.02-.76l-.58-2.34-1.61-1.83a1 1 0 01-.02-1.38l1.65-1.79.81-2.2a1 1 0 01.91-.632l2.38-.112 2.09-1.205z" />
            </svg>
          </button>
          <button
            onClick={onToggleMute}
            className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors"
            title={isMuted ? 'Unmute conversation' : 'Mute conversation'}
          >
            {isMuted ? (
              <svg className="w-4 h-4 text-red-400 dark:text-red-400 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728M9 5l-.447.894A2 2 0 017.382 7H5a2 2 0 00-2 2v6a2 2 0 002 2h2.382a2 2 0 011.171.447L10 19m7-10h1a1 1 0 011 1v4a1 1 0 01-1 1h-1m-4 4v-5m0 0V5m0 9H9" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            )}
          </button>
          <button
            onClick={toggleSearchPanel}
            className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors"
            title="Search in conversation"
          >
            <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 110-16 8 8 0 010 16z" />
            </svg>
          </button>
          {/* Call buttons - only show for direct conversations */}
          {conversationType === 'direct' && onInitiateCall && (
            <>
              <button
                onClick={() => onInitiateCall('VIDEO')}
                className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors"
                title="Video call"
              >
                <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
              </button>
              <button
                onClick={() => onInitiateCall('VOICE')}
                className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors"
                title="Voice call"
              >
                <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </button>
            </>
          )}
          {conversationType === 'group' && (
            <button
              onClick={() => setShowGroupManagement(true)}
              className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors"
              title="Group Settings"
            >
              <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          )}
          <button className="w-8 h-8 bg-dark-700 dark:bg-dark-700 bg-gray-100 rounded-full flex items-center justify-center hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-dark-400 dark:text-dark-400 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {showSearch && (
          <div className="absolute right-4 top-full mt-2 w-[22rem] bg-dark-800 border border-dark-700 rounded-lg shadow-xl p-4 z-50 space-y-3">
            <div className="space-y-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHasExecutedSearch(false);
                }}
                placeholder="Search messages..."
                className="w-full px-3 py-2 rounded bg-dark-700 dark:bg-dark-700 bg-gray-100 border border-dark-600 dark:border-dark-600 border-gray-300 text-white dark:text-white text-gray-900 placeholder-dark-400 dark:placeholder-dark-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="grid grid-cols-1 gap-3 text-sm text-dark-200 dark:text-dark-200 text-gray-700">
                <div>
                  <label className="block mb-1 text-gray-900 dark:text-white">From</label>
                  <select
                    value={selectedSenderId}
                    onChange={(e) => {
                      setSelectedSenderId(e.target.value);
                      setHasExecutedSearch(false);
                    }}
                    className="w-full px-3 py-2 rounded bg-dark-700 dark:bg-dark-700 bg-gray-100 border border-dark-600 dark:border-dark-600 border-gray-300 text-white dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">All participants</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 text-gray-900 dark:text-white">From date</label>
                    <input
                      type="date"
                      value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setHasExecutedSearch(false);
                    }}
                      className="w-full px-3 py-2 rounded bg-dark-700 dark:bg-dark-700 bg-gray-100 border border-dark-600 dark:border-dark-600 border-gray-300 text-white dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-900 dark:text-white">To date</label>
                    <input
                      type="date"
                      value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setHasExecutedSearch(false);
                    }}
                      className="w-full px-3 py-2 rounded bg-dark-700 dark:bg-dark-700 bg-gray-100 border border-dark-600 dark:border-dark-600 border-gray-300 text-white dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={handleClearSearch}
                className="px-3 py-1.5 text-dark-200 dark:text-dark-200 text-gray-700 hover:text-white dark:hover:text-white hover:text-gray-900 hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-200 rounded transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleApplySearch}
                className="px-3 py-1.5 bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors"
              >
                Search
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchLoading && (
                <div className="flex items-center gap-2 text-dark-300 dark:text-dark-300 text-gray-700 px-3 py-2 text-sm">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Searching...
                </div>
              )}
              {!searchLoading && searchTerm.length === 0 && (
                <div className="text-sm text-dark-400 dark:text-dark-400 text-gray-600 px-3 py-2">
                  Type to search messages in this conversation
                </div>
              )}
              {!searchLoading && searchTerm.length > 0 && searchTerm.length < 2 && (
                <div className="text-sm text-dark-400 dark:text-dark-400 text-gray-600 px-3 py-2">
                  Enter at least 2 characters to search
                </div>
              )}
              {hasExecutedSearch && !searchLoading && searchTerm.length >= 2 && searchResults.length === 0 && (
                <div className="text-sm text-dark-400 dark:text-dark-400 text-gray-600 px-3 py-2">No results</div>
              )}
              {hasExecutedSearch && searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    setShowSearch(false);
                    setHasExecutedSearch(false);
                    if (onSearchResultSelect) {
                      onSearchResultSelect(result);
                    } else {
                      window.dispatchEvent(
                        new CustomEvent('chat:scroll-to-message', { detail: { messageId: result.id } })
                      );
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100 text-sm text-white dark:text-white text-gray-900 transition-colors"
                  title={formatResultTimestamp(result.timestamp)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 dark:text-amber-300 text-amber-600 font-semibold truncate mr-3">
                      {result.senderName}
                    </span>
                    <span className="text-xs text-dark-300 dark:text-dark-300 text-gray-600 whitespace-nowrap">
                      {formatResultTimestamp(result.timestamp)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-white dark:text-white text-gray-900 break-words">
                    {highlightResultText(result.content || 'Attachment')}
                  </div>
                </button>
              ))}
              {searchHasMore && (
                <button
                  onClick={handleLoadMoreResults}
                  disabled={!hasExecutedSearch || searchLoading}
                  className="w-full mt-2 px-3 py-2 text-sm font-medium rounded bg-dark-700 dark:bg-dark-700 bg-gray-200 hover:bg-dark-600 dark:hover:bg-dark-600 hover:bg-gray-300 text-white dark:text-white text-gray-900 transition-colors disabled:opacity-60"
                >
                  {searchLoading ? 'Loading more...' : 'Load more results'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {pinnedMessageId && pinnedMessage && (
        <div className="flex items-center justify-between bg-amber-400/10 dark:bg-amber-400/10 bg-amber-50 border border-amber-400 dark:border-amber-400 border-amber-300 mx-4 mt-3 mb-1 px-4 py-2 rounded-lg text-amber-100 dark:text-amber-100 text-amber-800">
          <div className="min-w-0 mr-3">
            <div className="text-xs uppercase tracking-wider text-amber-300 dark:text-amber-300 text-amber-700">Pinned message</div>
            <div className="text-sm truncate text-amber-200 dark:text-amber-200 text-amber-900">
              <span className="mr-1">{pinnedMessage.senderName}:</span>
              {pinnedMessage.content || (pinnedMessage.metadata?.fileName ?? 'Attachment')}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('chat:scroll-to-message', { detail: { messageId: pinnedMessage.id } })
                );
              }}
              className="text-xs px-2 py-1 rounded bg-amber-400 text-black hover:bg-amber-300"
            >
              View
            </button>
            {onUnpinMessage && (
              <button
                onClick={() => onUnpinMessage(pinnedMessage)}
                className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-200 hover:bg-amber-300/20"
              >
                Unpin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        currentUserAliases={currentUserAliases}
        currentUserAvatar={currentUserAvatar ?? participants.find(p => p.id === currentUserId)?.avatar}
        participants={participants}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        participantLastSeen={participantLastSeen}
        participantLastReadMessageId={participantLastReadMessageId}
        onScrollToBottom={onScrollToBottom}
        onForwardMessage={onForwardMessage}
        onPinMessage={onPinMessage}
        onUnpinMessage={onUnpinMessage}
        pinnedMessageId={pinnedMessageId}
        searchTerm={hasExecutedSearch ? searchTerm : undefined}
        className="flex-1"
      />

      <div
        className={`px-6 pb-2 text-xs text-purple-300 transition-opacity duration-150 ${
          typingUserIds.length > 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ minHeight: '1.5rem' }}
      >
        {typingUserIds.length > 0
          ? `${typingUserIds
              .map((id) => participants.find((p) => p.id === id)?.name || 'Someone')
              .join(', ')} ${typingUserIds.length === 1 ? 'is typing...' : 'are typing...'}`
          : '\u00A0'}
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTyping={onTyping}
        disabled={!isConnected}
        placeholder={`Write a Message...`}
      />

      {/* Group Management Modal */}
      {showGroupManagement && (
        <GroupManagementModal
          conversationId={conversationId}
          conversationName={conversationName}
          conversationAvatarUrl={conversationAvatarUrl || undefined}
          participants={participants.map(p => ({
            id: p.id,
            username: p.username || p.name,
            displayName: p.displayName || p.name,
            avatarUrl: p.avatar || p.avatarUrl,
            role: p.role || 'member',
            joinedAt: p.joinedAt || new Date().toISOString(),
          }))}
          currentUserId={currentUserId}
          isOpen={showGroupManagement}
          onClose={() => setShowGroupManagement(false)}
          onUpdate={() => {
            if (onConversationUpdate) {
              onConversationUpdate();
            }
            setShowGroupManagement(false);
          }}
        />
      )}
    </div>
  );
};
