// Stores - ChatStore
import { create } from 'zustand';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    senderName: string;
  };
  participants: Array<{
    id: string;
    name: string;
    isOnline?: boolean;
  }>;
  unreadCount?: number;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  isConnected: boolean;
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversationId: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  setConnected: (connected: boolean) => void;
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  markAsRead: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  isConnected: false,
  typingUsers: {},
  
  setConversations: (conversations) => set({ conversations }),
  
  setCurrentConversation: (conversationId) => set({ currentConversationId: conversationId }),
  
  addMessage: (conversationId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: [...(state.messages[conversationId] || []), message]
    }
  })),
  
  setMessages: (conversationId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: messages
    }
  })),
  
  setConnected: (isConnected) => set({ isConnected }),
  
  setTypingUsers: (conversationId, userIds) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [conversationId]: userIds
    }
  })),
  
  addTypingUser: (conversationId, userId) => set((state) => {
    const currentUsers = state.typingUsers[conversationId] || [];
    if (!currentUsers.includes(userId)) {
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...currentUsers, userId]
        }
      };
    }
    return state;
  }),
  
  removeTypingUser: (conversationId, userId) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [conversationId]: (state.typingUsers[conversationId] || []).filter(id => id !== userId)
    }
  })),
  
  markAsRead: (conversationId) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unreadCount: 0 }
        : conv
    )
  })),
}));
