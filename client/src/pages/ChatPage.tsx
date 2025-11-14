// Pages - ChatPage
import React, { useState, useEffect, useMemo } from 'react';
import { NavigationSidebar } from '../components/layout/NavigationSidebar';
import { Sidebar } from '../components/layout/Sidebar';
import type { Conversation } from '../components/layout/Sidebar';
import { RightPanel } from '../components/layout/RightPanel';
import { ChatRoom } from '../components/chat/ChatRoom';
import type { ConversationSearchResult } from '../components/chat/ChatRoom';
import { ForwardMessageModal } from '../components/chat/ForwardMessageModal';
import { ProfilePage } from './ProfilePage';
import { SocialPage } from './SocialPage';
import type { Message } from '../components/chat/MessageList';
import messageService, { type Message as ApiMessage } from '../services/messageService';
import { authService } from '../services/authService';
import { friendService } from '../services/friendService';
import conversationService from '../services/conversationService';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePresence } from '../hooks/usePresence';
import { useReadReceipts } from '../hooks/useReadReceipts';
import { useCall } from '../hooks/useCall';
import { CallModal } from '../components/chat/CallModal';
import type { AttachmentPayload } from '../components/chat/MessageInput';

interface ParsedAttachment {
  url: string;
  downloadUrl?: string;
  name?: string;
  downloadName?: string;
  size?: number;
  contentType?: string;
  publicId?: string;
}

interface ParsedContentResult {
  text: string;
  attachment?: ParsedAttachment;
}

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const extractFileMetadataFromContent = (raw?: string): ParsedContentResult => {
  if (!raw) return { text: '' };

  // Try JSON payload first
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.__file__) {
      const attachmentData = parsed.__file__ as ParsedAttachment;
      const attachment: ParsedAttachment = {
        url: attachmentData.url,
        downloadUrl: attachmentData.downloadUrl || attachmentData.url,
        name: attachmentData.name,
        downloadName: attachmentData.downloadName,
        size: attachmentData.size,
        contentType: attachmentData.contentType,
        publicId: attachmentData.publicId,
      };
      const text = typeof parsed.text === 'string' ? parsed.text : '';
      return {
        text,
        attachment,
      };
    }
  } catch (_) {
    // ignore - fall back to legacy parsing
  }

  // Legacy format: plain content with URL
  const tokens = raw.trim().split(/\s+/);
  const urlToken = tokens.find((token) => /^https?:\/\//i.test(token));
  if (urlToken) {
    let fileName: string | undefined;
    try {
      const url = new URL(urlToken);
      fileName = decodeURIComponent(url.pathname.substring(url.pathname.lastIndexOf('/') + 1));
    } catch (_) {}

    const remainingText = raw.replace(urlToken, '').trim();
    const downloadUrl = fileName
      ? `${urlToken}?fl=attachment:${encodeURIComponent(fileName)}`
      : `${urlToken}?fl=attachment`;

    return {
      text: remainingText,
      attachment: {
        url: urlToken,
        downloadUrl,
        name: fileName,
        downloadName: fileName,
      },
    };
  }

  return { text: raw };
};

const mapConversationResponseToSidebar = (response: any): Conversation => {
  const resolveBoolean = (value: any, fallback?: boolean) => {
    if (value === undefined || value === null) return fallback;
    return Boolean(value);
  };

  const isFavorite = resolveBoolean(
    response.favorite,
    resolveBoolean(response.isFavorite, false)
  );
  const isMuted = resolveBoolean(
    response.muted,
    resolveBoolean(response.isMuted, false)
  );

  return {
    id: response.id,
    name: response.name || response.groupName || 'Conversation',
    type: (response.type || 'DIRECT').toString().toLowerCase() === 'group' ? 'group' : 'direct',
    participants: (response.participants || []).map((participant: any) => ({
      id: participant.id,
      name: participant.displayName || participant.username || participant.id,
      avatar: participant.avatarUrl,
      isOnline: false,
      lastSeenAt: participant.lastSeenAt,
      lastReadMessageId: participant.lastReadMessageId,
      username: participant.username,
      displayName: participant.displayName || participant.username || participant.id,
      role: ((participant.role || 'member') as string).toLowerCase() as 'admin' | 'member',
      joinedAt: participant.joinedAt,
    })),
    lastMessage: response.lastMessageContent
      ? {
          content: response.lastMessageContent,
          timestamp: response.lastMessageCreatedAt || response.updatedAt || response.createdAt,
          senderName: response.lastMessageSenderName || 'Someone',
        }
      : undefined,
    unreadCount: typeof response.unreadCount === 'number' ? response.unreadCount : 0,
    createdAt: response.createdAt || new Date().toISOString(),
    updatedAt: response.updatedAt || response.createdAt || new Date().toISOString(),
    isFavorite,
    isMuted,
    avatarUrl: response.avatarUrl ?? response.groupAvatarUrl ?? null,
    pinnedMessageId: response.pinnedMessageId ?? null,
    pinnedAt: response.pinnedAt ?? null,
    pinnedByUserId: response.pinnedByUserId ?? null,
  };
};


export interface ChatPageProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    username?: string;
    email?: string;
    bio?: string;
    phone?: string;
  };
  conversations: Conversation[];
  onSendMessage: (conversationId: string, content: string) => void;
  onTyping: (conversationId: string, isTyping: boolean) => void;
  onCreateConversation?: () => void;
  onLogout?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  user,
  conversations,
  onSendMessage,
  onTyping,
  onLogout,
}) => {
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('messages');
  const [showProfile, setShowProfile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = React.useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [friends, setFriends] = useState<Array<{ id: string; username?: string; displayName?: string; avatar?: string }>>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const currentPageRef = React.useRef(0);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  const [hasMore, setHasMore] = useState(true);
  const hasMoreRef = React.useRef(true);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [conversationList, setConversationList] = useState<Conversation[]>(() =>
    conversations.map((conv) => mapConversationResponseToSidebar(conv))
  );
  const [forwardState, setForwardState] = useState<{ open: boolean; messages: Message[] }>({ open: false, messages: [] });
  const [isForwarding, setIsForwarding] = useState(false);
  const [searchState, setSearchState] = useState<{
    params: { query: string; senderId?: string; fromDate?: string; toDate?: string };
    results: Array<{ id: string; content: string; senderName: string; timestamp: string }>;
    loading: boolean;
    hasMore: boolean;
    page: number;
  }>({
    params: { query: '', senderId: undefined, fromDate: undefined, toDate: undefined },
    results: [],
    loading: false,
    hasMore: false,
    page: 0,
  });
  const PAGE_SIZE = 20;
  const markAsSeenTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutsRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const typingMetaRef = React.useRef<Map<string, { lastStart: number; lastStop: number }>>(new Map());
  const TYPING_ACTIVE_TIMEOUT_MS = 2000;
  const TYPING_STOP_GRACE_MS = 200;

  const {
    subscribeToConversation,
    sendTypingIndicator,
  } = useWebSocket();
  
  const presence = usePresence(user.id);
  const receipts = useReadReceipts();
  const {
    setParticipantLastSeen,
    setParticipantLastReadMessageId,
    applyReadReceipts,
  } = receipts;
  
  // Sử dụng dữ liệu API
  const effectiveUserId = user.id || user.username || user.name || '';
  
  // Call functionality
  const call = useCall(effectiveUserId);
  const userAliases = useMemo(() => {
    const baseAliases = [user.id, user.username, user.name, user.email, 'you', 'me'];
    return baseAliases.filter((alias): alias is string => Boolean(alias && alias.trim().length > 0));
  }, [user]);

  useEffect(() => {
    const prevMap = new Map(conversationList.map((conv) => [conv.id, conv]));
    const mappedList = conversations.map((convRaw) => {
      const mapped = mapConversationResponseToSidebar(convRaw);
      const existing = prevMap.get(mapped.id);
      if (!existing) {
        return {
          ...mapped,
          isFavorite: mapped.isFavorite ?? false,
          isMuted: mapped.isMuted ?? false,
        };
      }
      return {
        ...mapped,
        isFavorite:
          mapped.isFavorite ??
          existing.isFavorite ??
          ((existing as unknown as { favorite?: boolean }).favorite ?? false),
        isMuted:
          mapped.isMuted ??
          existing.isMuted ??
          ((existing as unknown as { muted?: boolean }).muted ?? false),
        pinnedMessageId: mapped.pinnedMessageId ?? existing.pinnedMessageId,
        pinnedAt: mapped.pinnedAt ?? existing.pinnedAt,
        pinnedByUserId: mapped.pinnedByUserId ?? existing.pinnedByUserId,
      };
    });
    setConversationList(mappedList);
  }, [conversations]);

  const baseConversations = conversationList;

  // Load friends to show friend entries even with no prior messages
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const list = await friendService.getFriends();
        // Backend returns FriendResponseDTO: { id, username, displayName, avatarUrl }
        setFriends(
          (list || []).map((u: any) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatar: u.avatarUrl,
          }))
        );
      } catch (err) {
      }
    };
    loadFriends();
  }, []);

  const friendsWithStatus = useMemo(() => {
    return friends.map((friend) => ({
      ...friend,
      isOnline: presence.onlineFriends[friend.id]?.status === 'online',
      lastSeen: presence.onlineFriends[friend.id]?.lastSeen,
    }));
  }, [friends, presence.onlineFriends]);

      // Conversations hiển thị
  const displayConversations: Conversation[] = useMemo(() => {
    return baseConversations.map((conv) => ({
      ...conv,
      participants: (conv.participants || []).map((participant) => ({
        ...participant,
        isOnline: participant.id === user.id ? true : presence.onlineFriends[participant.id]?.status === 'online',
      })),
    }));
  }, [baseConversations, presence.onlineFriends, user.id]);

  // Set first conversation as active if none selected
  useEffect(() => {
    if (!currentConversationId && displayConversations.length > 0) {
      setCurrentConversationId(displayConversations[0].id);
    }
  }, [displayConversations.length, currentConversationId]);

  // Get current conversation; fallback to first available to avoid empty welcome state
  const currentConversation = displayConversations.find(c => c.id === currentConversationId) || displayConversations[0];

  const enrichedConversation = useMemo(() => {
    if (!currentConversation) return undefined;
    return {
      ...currentConversation,
      participants: currentConversation.participants.map(p => {
        const friend = friendsWithStatus.find(f => f.id === p.id);
        const avatarFallback = p.id === user.id ? user.avatar : friend?.avatar;
        // Use presence state directly
        const isOnlineFromState = presence.onlineFriends[p.id]?.status === 'online';
        const isOnline = p.id === user.id ? true : (presence.onlineFriends[p.id] !== undefined ? isOnlineFromState : (p.isOnline ?? false));
        return {
          ...p,
          avatar: p.avatar || avatarFallback,
          isOnline,
        };
      }),
    };
  }, [currentConversation, friendsWithStatus, presence.onlineFriends, user.avatar, user.id]);

  const enrichedConversationRef = React.useRef(enrichedConversation);
  useEffect(() => {
    enrichedConversationRef.current = enrichedConversation;
  }, [enrichedConversation]);

  const pinnedMessage = useMemo(() => {
    if (!currentConversation || !currentConversation.pinnedMessageId) {
      return null;
    }
    return messages.find((msg) => msg.id === currentConversation.pinnedMessageId) || null;
  }, [messages, currentConversation]);

  useEffect(() => {
    typingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    typingTimeoutsRef.current.clear();
    typingMetaRef.current.clear();
    setTypingUserIds([]);
  }, [currentConversationId]);

  // Initialize read-receipts state from current conversation participants
  useEffect(() => {
    if (!currentConversationId || !enrichedConversation) return;
    const participants = (enrichedConversation.participants || []).map((p: any) => ({
      id: p.id,
      lastSeenAt: p.lastSeenAt,
      lastReadMessageId: p.lastReadMessageId,
    }));
    // Only init if mapping actually differs to avoid loops
    const nextSeen: Record<string, number> = {};
    const nextRead: Record<string, string> = {};
    for (const p of participants) {
      if (p.lastSeenAt) nextSeen[p.id] = new Date(p.lastSeenAt).getTime();
      if (p.lastReadMessageId) nextRead[p.id] = p.lastReadMessageId;
    }
    const sameSeen = JSON.stringify(Object.entries(nextSeen).sort()) === JSON.stringify(Object.entries(receipts.participantLastSeen).sort());
    const sameRead = JSON.stringify(Object.entries(nextRead).sort()) === JSON.stringify(Object.entries(receipts.participantLastReadMessageId).sort());
    if (!sameSeen) {
      receipts.setParticipantLastSeen((prev) => ({ ...prev, ...nextSeen }));
    }
    if (!sameRead) {
      receipts.setParticipantLastReadMessageId((prev) => ({ ...prev, ...nextRead }));
    }
  }, [currentConversationId]);

  // Recalculate readBy when read-receipt maps change
  useEffect(() => {
    if (!currentConversationId || !enrichedConversation) return;
    setMessages((prev) => receipts.applyReadReceipts(prev, enrichedConversation.participants || [], user.id));
  }, [receipts.participantLastSeen, receipts.participantLastReadMessageId, currentConversationId, enrichedConversation, user.id]);

  // Load messages when switching conversation
  useEffect(() => {
    if (!currentConversationId) return;
    // reset pagination and load first page
    setCurrentPage(0);
    setHasMore(true);
    (async () => {
      try {
        await loadMessages(currentConversationId, 0, true);
      } catch (err) {
      }
    })();
  }, [currentConversationId]);

  useEffect(() => {
    setSearchState({
      params: { query: '', senderId: undefined, fromDate: undefined, toDate: undefined },
      results: [],
      loading: false,
      hasMore: false,
      page: 0,
    });
  }, [currentConversationId]);

  // Auto mark as seen when user is viewing the conversation (scroll to bottom, tab visible)
  useEffect(() => {
    if (!currentConversationId) return;

    // Mark as seen when conversation is active and tab is visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentConversationId) {
        // Debounce mark as seen calls
        if (markAsSeenTimeoutRef.current) {
          clearTimeout(markAsSeenTimeoutRef.current);
        }
        markAsSeenTimeoutRef.current = setTimeout(() => {
          conversationService.markAsSeen(currentConversationId).catch((err) => {
          });
        }, 500); // Wait 500ms after tab becomes visible
      }
    };

    // Mark as seen immediately when conversation changes and tab is visible
    if (document.visibilityState === 'visible') {
      conversationService.markAsSeen(currentConversationId).catch((err) => {
      });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (markAsSeenTimeoutRef.current) {
        clearTimeout(markAsSeenTimeoutRef.current);
      }
    };
  }, [currentConversationId]);

  // Auto mark as seen when new messages arrive and user is viewing
  useEffect(() => {
    if (!currentConversationId || messages.length === 0) return;

    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.senderId === user.id) return;

    // Debounce mark as seen calls
    if (markAsSeenTimeoutRef.current) {
      clearTimeout(markAsSeenTimeoutRef.current);
    }
    markAsSeenTimeoutRef.current = setTimeout(() => {
      // Only mark as seen if tab is visible
      if (document.visibilityState === 'visible') {
        conversationService.markAsSeen(currentConversationId).catch((err) => {
        });
      }
    }, 1000); // Wait 1 second after new message arrives

    return () => {
      if (markAsSeenTimeoutRef.current) {
        clearTimeout(markAsSeenTimeoutRef.current);
      }
    };
  }, [messages.length, currentConversationId, user.id]);

  // Listen to image/file send events from MessageInput (legacy - no longer needed)
  // Cleanup: handled directly via MessageInput onSendMessage callback

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isActive = true;

    if (currentConversationId) {
      setTypingUserIds([]);
      subscribeToConversation(currentConversationId, (event) => {
        if (!isActive) {
          return;
        }

        const eventType = event?.eventType || event?.type;
        const eventData = event.data || event.payload || {};
        if (eventType === 'MESSAGE_SENT') {
          const contentFromEvent = eventData.content || '';
          const parsed = extractFileMetadataFromContent(contentFromEvent);
          const isImageMessage = Boolean(eventData.imageUrl);
          const isFileMessage = !isImageMessage && Boolean(parsed.attachment);
          const newMessage: Message = {
            id: eventData.messageId || event.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            content: isImageMessage ? contentFromEvent : parsed.text,
            senderId: eventData.senderId,
            senderName: eventData.senderName || eventData.displayName || eventData.senderId || 'Unknown',
            timestamp: eventData.createdAt || event.timestamp || new Date().toISOString(),
            type: isImageMessage ? 'image' : isFileMessage ? 'file' : 'text',
            metadata: isImageMessage
              ? { imageUrl: eventData.imageUrl }
              : isFileMessage && parsed.attachment
                ? {
                    fileUrl: parsed.attachment.url,
                    downloadUrl: parsed.attachment.downloadUrl,
                    fileName: parsed.attachment.name,
                    downloadName: parsed.attachment.downloadName || parsed.attachment.name,
                    fileSize: parsed.attachment.size ? formatFileSize(parsed.attachment.size) : undefined,
                    contentType: parsed.attachment.contentType,
                    publicId: parsed.attachment.publicId,
                  }
                : undefined,
            originalCreatedAt: eventData.originalCreatedAt || eventData.createdAt,
            updatedAt: eventData.updatedAt,
            readBy: [],
            forwardedFromSenderName: eventData.forwardedFromSenderName,
            forwardedFromSenderId: eventData.forwardedFromSenderId,
            forwardedFromMessageId: eventData.forwardedFromMessageId,
            forwardedFromConversationId: eventData.forwardedFromConversationId,
            forwardedAt: eventData.forwardedAt,
          };

          if (eventData.senderId) {
            setTypingUserIds((prev) => prev.filter((id) => id !== eventData.senderId));
            typingMetaRef.current.delete(eventData.senderId);
            const timeout = typingTimeoutsRef.current.get(eventData.senderId);
            if (timeout) {
              clearTimeout(timeout);
              typingTimeoutsRef.current.delete(eventData.senderId);
            }
          }

          setMessages((prev) => {
            if (!newMessage.id || prev.some((msg) => msg.id === newMessage.id)) {
              return prev;
            }
            const next = [...prev, newMessage];
            next.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            return next;
          });
          
          // Auto mark as seen when user is in the conversation and a new message arrives
          // Only mark as seen if the message is not from current user
          if (eventData.senderId && eventData.senderId !== user.id) {
            // Mark conversation as seen automatically when user is viewing it
            conversationService.markAsSeen(currentConversationId)
              .then(() => {
              })
              .catch((err) => {
              });
          }
        } else if (eventType === 'MESSAGE_UPDATED') {
          const data = event.data || {};
          const messageId = data.messageId || event.id;
          if (messageId) {
            setMessages((prev) => {
              // Find original message to check if content actually changed
              const originalMsg = prev.find(msg => msg.id === messageId);
              const newContent = data.content || originalMsg?.content || '';
              
              // Only update if content actually changed
              if (originalMsg && originalMsg.content.trim() === newContent.trim()) {
                return prev;
              }
              
              // Update message and move it to the end (newest)
              const updated = prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      content: newContent,
                      updatedAt: data.updatedAt || (originalMsg?.content !== newContent ? new Date().toISOString() : msg.updatedAt), // Only set updatedAt if content changed
                      originalCreatedAt: data.originalCreatedAt || msg.originalCreatedAt || msg.timestamp, // Keep original creation time
                      timestamp: data.createdAt || msg.timestamp, // Update timestamp to move to bottom
                    }
                  : msg
              );
              // Sort by timestamp to move edited message to bottom
              return updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            });
          }
        } else if (eventType === 'MESSAGE_DELETED') {
          const data = event.data || {};
          const messageId = data.messageId || event.id;
          if (messageId) {
            setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
          }
        } else if (eventType === 'MESSAGE_SEEN') {
          const data = event.data || {};
          const seenByUserId = data.userId || data.seenByUserId;
          const lastSeenAt = data.lastSeenAt;
          const lastReadMessageId = data.lastReadMessageId;
          
          // Update participant last seen timestamp and last read message ID via receipts hook
          if (seenByUserId && lastSeenAt) {
            const lastSeenTime = typeof lastSeenAt === 'number' ? lastSeenAt : new Date(lastSeenAt).getTime();
            setParticipantLastSeen((prev) => ({
              ...prev,
              [seenByUserId]: lastSeenTime,
            }));
          }
          
          if (seenByUserId && lastReadMessageId) {
            setParticipantLastReadMessageId((prev) => ({
              ...prev,
              [seenByUserId]: lastReadMessageId,
            }));
          }
          
          // Re-apply read receipts to messages for current conversation
          const conversation = enrichedConversationRef.current;
          if (conversation) {
            setMessages((prev) => applyReadReceipts(prev, conversation.participants || [], user.id));
          }
        } else if ((eventType === 'typing_start' || eventType === 'typing') && (event.userId || event.senderId || event.uid || eventData?.userId || eventData?.senderId)) {
          const uid = (event.userId || event.senderId || event.uid || eventData?.userId || eventData?.senderId) as string;
          if (!uid || uid === user.id) {
            return;
          }
          const isTypingFlag = typeof event.isTyping === 'boolean'
            ? event.isTyping
            : typeof event.typing === 'boolean'
              ? event.typing
              : true;
          const eventConversationId = event.conversationId
            || eventData?.conversationId
            || event.conversation?.id
            || eventData?.conversation?.id;
          if (eventConversationId && currentConversationId && eventConversationId !== currentConversationId) {
            return;
          }
          if (isTypingFlag) {
            setTypingUserIds((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
            const currentTimeout = typingTimeoutsRef.current.get(uid);
            if (currentTimeout) {
              clearTimeout(currentTimeout);
            }
            const meta = typingMetaRef.current.get(uid) ?? { lastStart: 0, lastStop: 0 };
            typingMetaRef.current.set(uid, { ...meta, lastStart: Date.now() });
            const timeoutId = window.setTimeout(() => {
              setTypingUserIds((prev) => prev.filter((id) => id !== uid));
              typingTimeoutsRef.current.delete(uid);
              typingMetaRef.current.delete(uid);
            }, TYPING_ACTIVE_TIMEOUT_MS);
            typingTimeoutsRef.current.set(uid, timeoutId);
          } else {
            const currentTimeout = typingTimeoutsRef.current.get(uid);
            if (currentTimeout) {
              clearTimeout(currentTimeout);
            }
            const meta = typingMetaRef.current.get(uid) ?? { lastStart: 0, lastStop: 0 };
            const now = Date.now();
            typingMetaRef.current.set(uid, { ...meta, lastStop: now });
            const timeoutId = window.setTimeout(() => {
              setTypingUserIds((prev) => prev.filter((id) => id !== uid));
              typingTimeoutsRef.current.delete(uid);
              typingMetaRef.current.delete(uid);
            }, TYPING_STOP_GRACE_MS);
            typingTimeoutsRef.current.set(uid, timeoutId);
          }
        } else if (eventType === 'typing_stop' && (event.userId || event.senderId || event.uid || eventData?.userId || eventData?.senderId)) {
          const uid = (event.userId || event.senderId || event.uid || eventData?.userId || eventData?.senderId) as string;
          if (!uid) {
            return;
          }
          const eventConversationId = event.conversationId || eventData?.conversationId || event.conversation?.id || eventData?.conversation?.id;
          if (eventConversationId && currentConversationId && eventConversationId !== currentConversationId) {
            return;
          }
          typingMetaRef.current.set(uid, { lastStart: Date.now(), lastStop: Date.now() });
          const currentTimeout = typingTimeoutsRef.current.get(uid);
          if (currentTimeout) {
            clearTimeout(currentTimeout);
          }
          const timeoutId = window.setTimeout(() => {
            setTypingUserIds((prev) => prev.filter((id) => id !== uid));
            typingTimeoutsRef.current.delete(uid);
            typingMetaRef.current.delete(uid);
          }, TYPING_STOP_GRACE_MS);
          typingTimeoutsRef.current.set(uid, timeoutId);
        }
      }).then((cleanup) => {
        if (isActive) {
          unsubscribe = cleanup;
        } else if (cleanup) {
          cleanup();
        }
      }).catch((error) => {
      });
    } else {
      setTypingUserIds([]);
    }

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
      typingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      typingTimeoutsRef.current.clear();
      typingMetaRef.current.clear();
      setTypingUserIds([]);
    };
  }, [currentConversationId, subscribeToConversation, user.id, setParticipantLastSeen, setParticipantLastReadMessageId, applyReadReceipts]);

  const loadMessages = async (conversationId: string, page: number = 0, reset: boolean = false) => {
    try {
      const apiMessages = await messageService.getMessages(conversationId, page, PAGE_SIZE);
      // Convert API messages to UI messages (resolve sender display name from participants if possible)
      const conv = displayConversations.find(c => c.id === conversationId);
      const uiMessages: Message[] = apiMessages.map((msg: ApiMessage): Message => {
        const parsed = extractFileMetadataFromContent(msg.content || '');
        const messageType = msg.imageUrl ? 'image' : parsed.attachment ? 'file' : 'text';
        const msgTime = new Date(msg.createdAt).getTime();
        const readBy: string[] = [];
        
        // Check each participant's lastSeenAt
        if (conv && conv.participants) {
          conv.participants.forEach(p => {
            // Skip sender and current user
            if (p.id === msg.senderId || p.id === user.id) return;
            
            const lastSeenTime = receipts.participantLastSeen[p.id];
            // If participant has lastSeenAt and it's after message timestamp, they've read it
            if (lastSeenTime && msgTime <= lastSeenTime) {
              readBy.push(p.id);
            }
          });
        }
        
        return {
          id: msg.id,
          content: msg.imageUrl ? msg.content || '' : parsed.text,
          senderId: msg.senderId,
          senderName: conv?.participants.find(p => p.id === msg.senderId)?.name || msg.senderId,
          timestamp: msg.createdAt,
          type: messageType,
          metadata: msg.imageUrl
            ? { imageUrl: msg.imageUrl }
            : parsed.attachment
              ? {
                  fileUrl: parsed.attachment.url,
                  downloadUrl: parsed.attachment.downloadUrl,
                  fileName: parsed.attachment.name,
                  downloadName: parsed.attachment.downloadName || parsed.attachment.name,
                  fileSize: parsed.attachment.size ? formatFileSize(parsed.attachment.size) : undefined,
                  contentType: parsed.attachment.contentType,
                  publicId: parsed.attachment.publicId,
                }
              : undefined,
          originalCreatedAt: (msg as any).originalCreatedAt || msg.createdAt, // Fallback to createdAt if originalCreatedAt not available
          updatedAt: msg.updatedAt,
          readBy,
          forwardedFromSenderName: (msg as any).forwardedFromSenderName,
          forwardedFromSenderId: (msg as any).forwardedFromSenderId,
          forwardedFromMessageId: (msg as any).forwardedFromMessageId,
          forwardedFromConversationId: (msg as any).forwardedFromConversationId,
          forwardedAt: (msg as any).forwardedAt,
        };
      })
      // Ensure chronological order (oldest -> newest)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (reset) {
      setMessages(uiMessages);
      } else {
        // Prepend older messages to the beginning
        setMessages(prev => {
          const combined = [...uiMessages, ...prev];
          // Remove duplicates by message ID
          const unique = combined.filter((msg, index, self) =>
            index === self.findIndex(m => m.id === msg.id)
          );
          return unique.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
      }
      
      // Check if there are more messages to load
      setHasMore(apiMessages.length === PAGE_SIZE);
      setCurrentPage(page);
    } catch (err) {
      if (reset) {
      setMessages([]);
      }
      setHasMore(false);
    }
  };

  const handleLoadMore = async () => {
    if (!currentConversationId || isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      await loadMessages(currentConversationId, nextPage, false);
    } catch (err) {
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSendMessage = async (content: string, attachment?: AttachmentPayload) => {
    if (!currentConversationId) return;

    try {
      let payloadContent = content.trim();
      let imgUrl: string | undefined;
      let metadataForMessage: Message['metadata'] = undefined;
      let messageType: Message['type'] = 'text';

      if (attachment) {
        if (attachment.isImage) {
          imgUrl = attachment.url;
          metadataForMessage = { imageUrl: attachment.url };
          messageType = 'image';
        } else {
          const filePayload = {
            url: attachment.url,
            downloadUrl: attachment.downloadUrl,
            name: attachment.name,
            downloadName: attachment.downloadName,
            size: attachment.size,
            contentType: attachment.contentType,
            publicId: attachment.publicId,
          };
          payloadContent = JSON.stringify({ __file__: filePayload, text: payloadContent });
          metadataForMessage = {
            fileUrl: attachment.url,
            downloadUrl: attachment.downloadUrl,
            fileName: attachment.name,
            downloadName: attachment.downloadName,
            fileSize: attachment.size ? formatFileSize(attachment.size) : undefined,
            contentType: attachment.contentType,
            publicId: attachment.publicId,
          };
          messageType = 'file';
        }
      }
      const sentMessage = await messageService.sendMessage({
        conversationId: currentConversationId,
        content: payloadContent || undefined,
        imgUrl,
      });
      
      const newMessage: Message = {
        id: sentMessage.id,
        content: messageType === 'image' ? sentMessage.content || '' : messageType === 'file' ? content.trim() : sentMessage.content || content.trim(),
        senderId: sentMessage.senderId,
        senderName: user.name,
        timestamp: sentMessage.createdAt,
        type: messageType,
        metadata: metadataForMessage,
        originalCreatedAt: sentMessage.createdAt,
        updatedAt: sentMessage.updatedAt,
        readBy: [],
      };
      
      // Add message to local state immediately for better UX
      setMessages(prev => {
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }
        const next = [...prev, newMessage];
        next.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return next;
      });

      // Wait a bit for backend to persist, then refresh to sync with server
      setTimeout(async () => {
        await loadMessages(currentConversationId, 0, true);
        
        // Ensure the just-sent message is present even if API response lags
        setMessages(prev => {
          const hasMessage = prev.some(msg => msg.id === newMessage.id);
          if (hasMessage) {
            return prev;
          }
          const next = [...prev, newMessage];
          next.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          return next;
        });
      }, 500);

      // Call parent handler for any additional logic
      onSendMessage(currentConversationId, payloadContent || '');
    } catch (err) {
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (currentConversationId) {
      onTyping(currentConversationId, isTyping);
      sendTypingIndicator(currentConversationId, isTyping);
    }
  };

  const handleForwardMessageRequest = (message: Message) => {
    setForwardState({ open: true, messages: [message] });
  };

  const handleCloseForwardModal = () => {
    setForwardState({ open: false, messages: [] });
  };

  const handleForwardSubmit = async (targetConversationId: string, comment: string) => {
    if (forwardState.messages.length === 0) {
      return;
    }

    try {
      setIsForwarding(true);
      await messageService.forwardMessages({
        messageIds: forwardState.messages.map((msg) => msg.id),
        targetConversationId,
        comment: comment || undefined,
      });

      if (targetConversationId === currentConversationId) {
        await loadMessages(currentConversationId, 0, true);
      }

      setForwardState({ open: false, messages: [] });
      alert('Message forwarded successfully.');
    } catch (err) {
      alert('Failed to forward message. Please try again.');
    } finally {
      setIsForwarding(false);
    }
  };

  const handlePinMessage = async (message: Message) => {
    if (!currentConversationId) return;
    try {
      const response = await conversationService.pinMessage(currentConversationId, message.id);
      const mapped = mapConversationResponseToSidebar(response);
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.id === mapped.id
            ? {
                ...conv,
                pinnedMessageId: mapped.pinnedMessageId,
                pinnedAt: mapped.pinnedAt,
                pinnedByUserId: mapped.pinnedByUserId,
              }
            : conv
        )
      );
    } catch (err) {
      alert('Failed to pin message.');
    }
  };

  const handleUnpinMessage = async (_message?: Message) => {
    if (!currentConversationId) return;
    try {
      const response = await conversationService.unpinMessage(currentConversationId);
      const mapped = mapConversationResponseToSidebar(response);
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.id === mapped.id
            ? {
                ...conv,
                pinnedMessageId: mapped.pinnedMessageId,
                pinnedAt: mapped.pinnedAt,
                pinnedByUserId: mapped.pinnedByUserId,
              }
            : conv
        )
      );
    } catch (err) {
      alert('Failed to unpin message.');
    }
  };

  const handleToggleFavoriteConversation = async (conversationId: string, isCurrentlyFavorite: boolean) => {
    setConversationList((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, isFavorite: !isCurrentlyFavorite } : conv
      )
    );

    try {
      const response = await conversationService.toggleFavorite(conversationId);
      const mapped = mapConversationResponseToSidebar(response);
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.id === mapped.id
            ? {
                ...conv,
                isFavorite: mapped.isFavorite,
                pinnedMessageId: mapped.pinnedMessageId,
                pinnedAt: mapped.pinnedAt,
                pinnedByUserId: mapped.pinnedByUserId,
              }
            : conv
        )
      );
    } catch (err) {
      // Revert optimistic update
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, isFavorite: isCurrentlyFavorite } : conv
        )
      );
    }
  };

  const handleToggleMuteConversation = async () => {
    if (!currentConversationId) return;
    const currentConv = conversationList.find((conv) => conv.id === currentConversationId);
    const currentMuted = currentConv?.isMuted ?? false;

    setConversationList((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId ? { ...conv, isMuted: !currentMuted } : conv
      )
    );

    try {
      const response = await conversationService.toggleMute(currentConversationId);
      const mapped = mapConversationResponseToSidebar(response);
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.id === mapped.id ? { ...conv, isMuted: mapped.isMuted } : conv
        )
      );
    } catch (err) {
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId ? { ...conv, isMuted: currentMuted } : conv
        )
      );
    }
  };

  const SEARCH_PAGE_SIZE = 20;

  const handleSearchMessages = async ({
    query,
    senderId,
    fromDate,
    toDate,
    reset = true,
  }: {
    query: string;
    senderId?: string;
    fromDate?: string;
    toDate?: string;
    reset?: boolean;
  }) => {
    if (!currentConversationId) {
      setSearchState({
        params: { query: '', senderId: undefined, fromDate: undefined, toDate: undefined },
        results: [],
        loading: false,
        hasMore: false,
        page: 0,
      });
      return;
    }

    const trimmed = (query || '').trim();
    const normalizedParams = {
      query: trimmed,
      senderId: senderId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    };

    if (!trimmed || trimmed.length < 2) {
      setSearchState({
        params: normalizedParams,
        results: [],
        loading: false,
        hasMore: false,
        page: 0,
      });
      return;
    }

    const nextPage = reset ? 0 : searchState.page + 1;

    setSearchState((prev) => ({
      params: normalizedParams,
      results: reset ? [] : prev.results,
      loading: true,
      hasMore: prev.hasMore,
      page: prev.page,
    }));

    try {
      const results = await messageService.searchMessages(currentConversationId, {
        query: normalizedParams.query,
        senderId: normalizedParams.senderId,
        fromDate: normalizedParams.fromDate,
        toDate: normalizedParams.toDate,
        page: nextPage,
        size: SEARCH_PAGE_SIZE,
      });

      const participants =
        enrichedConversationRef.current?.participants ||
        currentConversation?.participants ||
        [];

      const mapped = results.map((msg) => {
        const participant = participants.find((p: any) => p.id === msg.senderId);
        const parsed = extractFileMetadataFromContent(msg.content || '');
        let preview = parsed.text || '';
        if (!preview) {
          if (msg.imageUrl) {
            preview = '[Image]';
          } else if (parsed.attachment?.name) {
            preview = parsed.attachment.name;
          } else {
            preview = 'Attachment';
          }
        }
        return {
          id: msg.id,
          content: preview,
          senderName: participant?.name || msg.senderId,
          timestamp: msg.createdAt,
        };
      });

      setSearchState((prev) => ({
        params: normalizedParams,
        results: reset ? mapped : [...prev.results, ...mapped],
        loading: false,
        hasMore: results.length === SEARCH_PAGE_SIZE,
        page: nextPage,
      }));
    } catch (err) {
      setSearchState((prev) => ({
        ...prev,
        loading: false,
        hasMore: false,
        page: reset ? 0 : prev.page,
      }));
    }
  };

  const handleSearchLoadMore = async () => {
    if (!searchState.hasMore || searchState.loading) return;
    await handleSearchMessages({
      ...searchState.params,
      reset: false,
    });
  };

  const ensureMessageVisible = async (messageId: string) => {
    if (!currentConversationId) return;

    if (messagesRef.current.some((msg) => msg.id === messageId)) {
      return;
    }

    const MAX_ITERATIONS = 50;
    let iterations = 0;

    while (!messagesRef.current.some((msg) => msg.id === messageId) && hasMoreRef.current && iterations < MAX_ITERATIONS) {
      const nextPage = currentPageRef.current + 1;
      await loadMessages(currentConversationId, nextPage, false);
      currentPageRef.current = nextPage;
      iterations += 1;

      // Allow state updates to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (!hasMoreRef.current) {
        break;
      }
    }
  };

  const handleSelectSearchResult = async (result: ConversationSearchResult) => {
    if (!currentConversationId) return;
    await ensureMessageVisible(result.id);
    window.dispatchEvent(
      new CustomEvent('chat:scroll-to-message', { detail: { messageId: result.id } })
    );
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      // Find original message to compare content
      const originalMessage = messages.find(msg => msg.id === messageId);
      if (!originalMessage) {
        return;
      }
      
      // Only update if content actually changed
      if (originalMessage.content.trim() === newContent.trim()) {
        return;
      }
      
      await messageService.updateMessage(messageId, newContent);
      // Message will be updated via WebSocket event
      // Also update locally immediately for better UX
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: newContent,
                updatedAt: new Date().toISOString(), // Only set updatedAt if content changed
                originalCreatedAt: msg.originalCreatedAt || msg.timestamp, // Keep original creation time
                timestamp: new Date().toISOString(), // Update timestamp to move to bottom
              }
            : msg
        );
        // Sort by timestamp to move edited message to bottom
        return updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update message. Message can only be edited within 1 hour of creation.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageService.deleteMessage(messageId);
      // Message will be removed via WebSocket event
    } catch (err) {
      alert('Failed to delete message');
    }
  };

  const handleShowProfile = () => {
    setShowProfile(true);
    setActiveTab('profile');
  };

  const handleBackToChat = () => {
    setShowProfile(false);
    setActiveTab('messages');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      setShowProfile(true);
    } else {
      setShowProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      if (onLogout) {
        onLogout();
      }
    } catch (err) {
    }
  };

  const openCreateGroupModal = () => {
    setGroupName('');
    setSelectedMemberIds([]);
    setShowGroupModal(true);
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreateGroup = async () => {
    // Need at least 2 friends selected (with you it becomes 3+)
    if (selectedMemberIds.length < 2) return;
    try {
      const created = await conversationService.createConversation({
        type: 'GROUP',
        groupName: groupName || 'New Group',
        memberIds: selectedMemberIds,
      });
      setShowGroupModal(false);
      setCurrentConversationId(created.id);
    } catch (err) {
    }
  };

  return (
    <div className="h-screen flex bg-dark-900 dark:bg-dark-900 bg-gray-50">
      {/* Navigation Sidebar */}
      <NavigationSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onShowProfile={handleShowProfile}
        onLogout={handleLogout}
        currentUser={user}
      />
      
      {/* Messages Sidebar - Only show for messages tab */}
      {activeTab === 'messages' && (
        <Sidebar
          conversations={displayConversations}
          currentConversationId={currentConversationId}
          onSelectConversation={async (id) => {
            setCurrentConversationId(id);
          }}
          onCreateConversation={openCreateGroupModal}
          onToggleFavorite={handleToggleFavoriteConversation}
        />
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'profile' ? (
          <ProfilePage
            user={user}
            onBack={handleBackToChat}
          />
        ) : activeTab === 'social' ? (
          <SocialPage
            currentUser={user}
            onBack={handleBackToChat}
            onSelectConversation={(id) => {
              setCurrentConversationId(id);
              setActiveTab('messages'); // Switch to messages tab to show the conversation
            }}
          />
        ) : (
          <ChatRoom
            conversationId={enrichedConversation?.id || currentConversationId || ''}
            conversationName={enrichedConversation?.name || ''}
            conversationType={enrichedConversation?.type || 'direct'}
            conversationAvatarUrl={enrichedConversation?.avatarUrl ?? null}
            participants={enrichedConversation?.participants || []}
            currentUserId={effectiveUserId}
            currentUserAvatar={user.avatar}
            currentUserAliases={userAliases}
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            messages={messages}
                typingUserIds={typingUserIds}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onConversationUpdate={() => {
                  // Reload conversations to get updated data
                  window.location.reload();
                }}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                participantLastSeen={receipts.participantLastSeen}
                participantLastReadMessageId={receipts.participantLastReadMessageId}
                onScrollToBottom={() => {
                  // Mark as seen when user scrolls to bottom
                  if (currentConversationId && document.visibilityState === 'visible') {
                    if (markAsSeenTimeoutRef.current) {
                      clearTimeout(markAsSeenTimeoutRef.current);
                    }
                    markAsSeenTimeoutRef.current = setTimeout(() => {
                      conversationService.markAsSeen(currentConversationId).catch((err) => {
                      });
                    }, 500); // Debounce 500ms
                  }
                }}
            onForwardMessage={handleForwardMessageRequest}
            onPinMessage={handlePinMessage}
            onUnpinMessage={handleUnpinMessage}
            pinnedMessageId={currentConversation?.pinnedMessageId ?? null}
            pinnedMessage={pinnedMessage}
            isFavorite={currentConversation?.isFavorite ?? false}
            onToggleFavorite={() => {
              if (currentConversation) {
                handleToggleFavoriteConversation(currentConversation.id, !!currentConversation.isFavorite);
              }
            }}
            isMuted={currentConversation?.isMuted ?? false}
            onToggleMute={handleToggleMuteConversation}
            onSearchMessages={handleSearchMessages}
            onSearchLoadMore={handleSearchLoadMore}
            onSearchResultSelect={handleSelectSearchResult}
            searchResults={searchState.results}
            searchLoading={searchState.loading}
            searchHasMore={searchState.hasMore}
            onInitiateCall={async (type) => {
              if (!enrichedConversation || enrichedConversation.type !== 'direct') {
                return;
              }
              // Find receiver (the other participant)
              const receiver = enrichedConversation.participants.find(p => p.id !== effectiveUserId);
              if (!receiver) {
                return;
              }
              try {
                await call.initiateCall(
                  enrichedConversation.id,
                  receiver.id,
                  type
                );
              } catch (error) {
                alert('Failed to start call. Please try again.');
              }
            }}
          />
        )}
        
        {/* Call Modal */}
        {call.callState.activeCall && (
          <CallModal
            call={call.callState.activeCall}
            currentUserId={effectiveUserId}
            isIncoming={call.callState.isIncoming}
            onAnswer={call.answerCall}
            onReject={call.rejectCall}
            onEnd={call.endCall}
            localVideoRef={call.localVideoRef as React.RefObject<HTMLVideoElement | null>}
            remoteVideoRef={call.remoteVideoRef as React.RefObject<HTMLVideoElement | null>}
            remoteAudioRef={call.remoteAudioRef as React.RefObject<HTMLAudioElement | null>}
            isVideoCall={call.callState.activeCall.type === 'VIDEO'}
            isMuted={call.isMuted}
            isVideoEnabled={call.isVideoEnabled}
            onToggleMute={call.toggleMute}
            onToggleVideo={call.toggleVideo}
          />
        )}
      </div>

      {/* Right Panel - Only show for messages tab */}
      {activeTab === 'messages' && !showProfile && (
        <RightPanel
          conversation={enrichedConversation}
          currentUser={user}
          messages={messages}
        />
      )}

      <ForwardMessageModal
        isOpen={forwardState.open}
        conversations={displayConversations.map((conv) => ({
          id: conv.id,
          name: conv.name,
          isFavorite: conv.isFavorite,
        }))}
        onClose={handleCloseForwardModal}
        onSubmit={handleForwardSubmit}
        isSubmitting={isForwarding}
        selectedMessagesCount={forwardState.messages.length}
      />

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create Group</h3>
            <div className="mb-4">
              <label className="block text-sm text-dark-300 mb-1">Group name</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Team Standup"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="mb-4 max-h-64 overflow-y-auto">
              <label className="block text-sm text-dark-300 mb-2">Select at least 2 friends</label>
              <div className="space-y-2">
                {friends.map(f => (
                  <label key={f.id} className="flex items-center justify-between px-3 py-2 bg-dark-700 rounded-lg">
                    <div className="text-white text-sm truncate">{f.displayName || f.username || f.id}</div>
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(f.id)}
                      onChange={() => toggleMember(f.id)}
                    />
                  </label>
                ))}
                {friends.length === 0 && (
                  <div className="text-dark-400 text-sm">No friends found.</div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 rounded-lg bg-dark-700 text-white hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={selectedMemberIds.length < 2}
                className={`px-4 py-2 rounded-lg text-white ${selectedMemberIds.length < 2 ? 'bg-dark-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
