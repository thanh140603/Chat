// Types - Common types used across the application

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  conversationId: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  edited?: boolean;
  deleted?: boolean;
  replyTo?: string;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  isMuted?: boolean;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  displayName: string;
  email?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface MessageEvent extends WebSocketEvent {
  type: 'MESSAGE_SENT' | 'MESSAGE_UPDATED' | 'MESSAGE_DELETED';
  data: Message;
}

export interface TypingEventData extends WebSocketEvent {
  type: 'USER_TYPING' | 'USER_STOPPED_TYPING';
  data: TypingEvent;
}

export interface UserEvent extends WebSocketEvent {
  type: 'USER_ONLINE' | 'USER_OFFLINE' | 'USER_UPDATED';
  data: User;
}

export interface ConversationEvent extends WebSocketEvent {
  type: 'CONVERSATION_CREATED' | 'CONVERSATION_UPDATED' | 'CONVERSATION_DELETED';
  data: Conversation;
}

// Component props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: Record<keyof T, string>;
  isValid: boolean;
  isSubmitting: boolean;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  theme: Theme;
  primaryColor: string;
  fontSize: 'sm' | 'md' | 'lg';
  compactMode: boolean;
}
