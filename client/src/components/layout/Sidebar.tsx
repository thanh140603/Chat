// Layout Components - Sidebar
import React from 'react';
import { Avatar } from '../ui/Avatar';

export interface Conversation {
  id: string;
  name: string;
  type?: 'direct' | 'group';
  avatarUrl?: string | null;
  lastMessage?: {
    content: string;
    timestamp: string;
    senderName: string;
  };
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeenAt?: string;
    lastReadMessageId?: string;
    role?: 'admin' | 'member';
  }>;
  unreadCount?: number;
  isFavorite?: boolean;
  isMuted?: boolean;
  pinnedMessageId?: string | null;
  pinnedAt?: string | null;
  pinnedByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation?: () => void;
  className?: string;
  onToggleFavorite?: (conversationId: string, isFavorite: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateConversation,
  className = '',
  onToggleFavorite,
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const isFavorite = (conv: Conversation) =>
    Boolean((conv as any).isFavorite ?? (conv as any).favorite);
  const favorites = conversations.filter(isFavorite);
  const allMessages = conversations.filter((conv) => !isFavorite(conv));

  return (
    <div className={`w-80 bg-dark-800 dark:bg-dark-800 bg-white flex flex-col border-r border-dark-700 dark:border-dark-700 border-gray-200 ${className}`}>
      {/* Search Bar */}
      <div className="p-4 border-b border-dark-700 dark:border-dark-700 border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-dark-400 dark:text-dark-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Find person, group name..."
            className="w-full pl-10 pr-4 py-2 bg-dark-700 dark:bg-dark-700 bg-gray-100 border border-dark-600 dark:border-dark-600 border-gray-300 rounded-lg text-white dark:text-white text-gray-900 placeholder-dark-400 dark:placeholder-dark-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Header with Messages title and New Chat button */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700 dark:border-dark-700 border-gray-200">
        <h2 className="text-lg font-bold text-white dark:text-white text-gray-900">Messages</h2>
        <button
          onClick={onCreateConversation}
          className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
        >
          <span className="text-lg">+</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-dark-700">
          <h3 className="text-sm font-semibold text-dark-300 dark:text-dark-300 text-gray-700 mb-3 flex items-center justify-between">
            <span>Favorites</span>
            {favorites.length > 0 && (
              <span className="text-xs text-dark-400 dark:text-dark-400 text-gray-500">{favorites.length}</span>
            )}
          </h3>
          {favorites.length === 0 ? (
            <div className="text-xs text-dark-400 dark:text-dark-400 text-gray-500 bg-dark-700/60 dark:bg-dark-700/60 bg-gray-100 rounded-lg px-3 py-4 text-center">
              Mark conversations as favorites to pin them here.
            </div>
          ) : (
            <div className="space-y-2">
              {favorites.map((conversation) => {
                const isActive = conversation.id === currentConversationId;
                
                return (
                  <div
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-purple-600 dark:bg-purple-600'
                        : 'hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar
                        src={conversation.avatarUrl || undefined}
                        name={conversation.name}
                        size="sm"
                        className="border-2 border-dark-600 dark:border-dark-600 border-gray-300"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <h3 className={`text-sm font-medium truncate ${
                              isActive ? 'text-white dark:text-white' : 'text-gray-900 dark:text-white'
                            }`}>
                              {conversation.name}
                            </h3>
                            {conversation.participants.some(p => p.isOnline) && (
                              <span className="inline-flex w-2 h-2 rounded-full bg-green-400" aria-hidden />
                            )}
                          </div>
                          {onToggleFavorite && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(conversation.id, !!conversation.isFavorite);
                              }}
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-dark-600 transition-colors"
                              title={conversation.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <svg
                                className={`w-3.5 h-3.5 ${conversation.isFavorite ? 'text-amber-400' : 'text-dark-400'}`}
                                viewBox="0 0 24 24"
                                fill={conversation.isFavorite ? 'currentColor' : 'none'}
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.48 3.499a1 1 0 011.04 0l2.09 1.205 2.385.112a1 1 0 01.908.632l.81 2.2 1.652 1.79a1 1 0 01-.02 1.38l-1.61 1.83-.58 2.34a1 1 0 01-1.02.76l-2.36-.28-2.06 1.24a1 1 0 01-1.04 0l-2.06-1.24-2.36.28a1 1 0 01-1.02-.76l-.58-2.34-1.61-1.83a1 1 0 01-.02-1.38l1.65-1.79.81-2.2a1 1 0 01.91-.632l2.38-.112 2.09-1.205z"
                                />
                              </svg>
                            </button>
                          )}
                          {conversation.lastMessage && (
                            <span className="text-xs text-dark-400 ml-2">
                              {formatTime(conversation.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs truncate ${
                            conversation.unreadCount && conversation.unreadCount > 0
                              ? 'text-white dark:text-white font-semibold'
                              : 'text-dark-400 dark:text-dark-400 text-gray-600'
                          }`}>
                            {conversation.lastMessage 
                              ? conversation.lastMessage.content
                              : 'No messages yet'
                            }
                          </p>
                          <div className="flex items-center space-x-1 ml-2">
                            {conversation.unreadCount && conversation.unreadCount > 0 && (
                              <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Messages Section */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-dark-300 mb-3">All Messages</h3>
          {allMessages.length === 0 ? (
            <div className="text-center text-dark-400 py-8">
              <p>No conversations yet</p>
              {onCreateConversation && (
                <button
                  onClick={onCreateConversation}
                  className="mt-2 text-purple-400 hover:text-purple-300 font-medium"
                >
                  Start a conversation
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {allMessages.map((conversation) => {
                const isActive = conversation.id === currentConversationId;
                const onlineCount = conversation.participants.filter(p => p.isOnline).length;
                
                return (
                  <div
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-purple-600'
                        : 'hover:bg-dark-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar
                        src={conversation.avatarUrl || undefined}
                        name={conversation.name}
                        size="sm"
                        className="border-2 border-dark-600"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <h3 className={`text-sm font-medium truncate ${
                              isActive ? 'text-white dark:text-white' : 'text-gray-900 dark:text-white'
                            }`}>
                              {conversation.name}
                            </h3>
                            {onlineCount > 0 && (
                              <span className="inline-flex w-2 h-2 rounded-full bg-green-400" aria-hidden />
                            )}
                          </div>
                          {onToggleFavorite && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(conversation.id, !!conversation.isFavorite);
                              }}
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-dark-600 transition-colors"
                              title={conversation.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <svg
                                className={`w-3.5 h-3.5 ${conversation.isFavorite ? 'text-amber-400' : 'text-dark-400'}`}
                                viewBox="0 0 24 24"
                                fill={conversation.isFavorite ? 'currentColor' : 'none'}
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.48 3.499a1 1 0 011.04 0l2.09 1.205 2.385.112a1 1 0 01.908.632l.81 2.2 1.652 1.79a1 1 0 01-.02 1.38l-1.61 1.83-.58 2.34a1 1 0 01-1.02.76l-2.36-.28-2.06 1.24a1 1 0 01-1.04 0l-2.06-1.24-2.36.28a1 1 0 01-1.02-.76l-.58-2.34-1.61-1.83a1 1 0 01-.02-1.38l1.65-1.79.81-2.2a1 1 0 01.91-.632l2.38-.112 2.09-1.205z"
                                />
                              </svg>
                            </button>
                          )}
                          {conversation.lastMessage && (
                            <span className="text-xs text-dark-400 ml-2">
                              {formatTime(conversation.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs truncate ${
                            conversation.unreadCount && conversation.unreadCount > 0
                              ? 'text-white dark:text-white font-semibold'
                              : 'text-dark-400 dark:text-dark-400 text-gray-600'
                          }`}>
                            {conversation.lastMessage 
                              ? conversation.lastMessage.content
                              : 'No messages yet'
                            }
                          </p>
                          <div className="flex items-center space-x-1 ml-2">
                            <div className={`w-2 h-2 rounded-full ${
                              onlineCount > 0 ? 'bg-green-500' : 'bg-dark-500'
                            }`}></div>
                            {conversation.unreadCount && conversation.unreadCount > 0 && (
                              <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
