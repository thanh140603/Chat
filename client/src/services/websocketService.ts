// WebSocket service via Kong Gateway
// File: client/src/services/websocketService.ts

import API_CONFIG from '../config/api';

type ConversationListener = (event: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 8;
  private readonly conversationListeners = new Map<string, Set<ConversationListener>>();
  private readonly joinedConversations = new Set<string>();
  private readonly pendingMessages: Record<string, unknown>[] = [];
  private readonly userListeners = new Map<string, Set<(event: any) => void>>();
  private connectTimeoutId: number | null = null;
  private readonly connectTimeoutMs = 8000;
  private heartbeatIntervalId: number | null = null;
  private heartbeatTimeoutId: number | null = null;
  private readonly heartbeatIntervalMs = 25000;
  private readonly heartbeatGraceMs = 10000;
  private readonly loggedCallMessages = new Set<string>();

  async connect(): Promise<void> {
    if (this.isConnected && this.socket) {
      return;
    }

    this.token = localStorage.getItem('accessToken');
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    return new Promise((resolve, reject) => {
      try {
        const url = new URL('/ws', API_CONFIG.WS_URL);
        url.searchParams.set('jwt', this.token!);

        this.socket = new WebSocket(url.toString());

        // Guard against connections that never open (e.g., proxy drops upgrade)
        if (this.connectTimeoutId) {
          clearTimeout(this.connectTimeoutId);
        }
        this.connectTimeoutId = window.setTimeout(() => {
          try {
            if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
              this.socket.close();
            }
          } catch (_) {}
        }, this.connectTimeoutMs);

        this.socket.onopen = () => {
          if (this.connectTimeoutId) {
            clearTimeout(this.connectTimeoutId);
            this.connectTimeoutId = null;
          }
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.rejoinConversations();
          this.flushPendingMessages();
          // Ask server to sync presence for this user right after reconnect
          this.requestPresenceSync();
          // Start heartbeat
          this.startHeartbeat();
          // Ensure graceful shutdown on tab close
          this.attachUnloadHandler();
          resolve();
        };

        this.socket.onmessage = (event) => {
          // Heartbeat: server may send pong
          try {
            const payload = JSON.parse(event.data);
            if (payload && (payload.type === 'pong' || payload.eventType === 'pong')) {
              this.onPong();
              return;
            }
          } catch (_) {
            // non-JSON; let downstream try parse
          }
          this.handleIncomingMessage(event.data);
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.scheduleReconnect();
        };

        this.socket.onerror = () => {
          // Errors will be followed by onclose in most cases; flag disconnected
          this.isConnected = false;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.close();
      } catch (_) {}
    }
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    this.stopHeartbeat();
    this.detachUnloadHandler();
  }

  isConnectedToWebSocket(): boolean {
    return this.isConnected;
  }

  subscribeToConversation(conversationId: string, listener: ConversationListener) {
    if (!this.conversationListeners.has(conversationId)) {
      this.conversationListeners.set(conversationId, new Set());
    }
    this.conversationListeners.get(conversationId)!.add(listener);

    this.joinConversation(conversationId);

    return () => {
      const listeners = this.conversationListeners.get(conversationId);
      if (!listeners) return;

      listeners.delete(listener);
      if (listeners.size === 0) {
        this.conversationListeners.delete(conversationId);
        this.leaveConversation(conversationId);
      }
    };
  }

  subscribeToUserMessages(_userId: string, _listener: (message: any) => void) {
    // Don't log every subscription to reduce noise
    if (!this.userListeners.has(_userId)) {
      this.userListeners.set(_userId, new Set());
    }
    const listeners = this.userListeners.get(_userId)!;
    listeners.add(_listener);

    return () => {
      const current = this.userListeners.get(_userId);
      if (!current) return;
      current.delete(_listener);
      if (current.size === 0) {
        this.userListeners.delete(_userId);
      }
      // Don't log every unsubscription to reduce noise
    };
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    const type = isTyping ? 'typing_start' : 'typing_stop';
    this.send({ type, conversationId });
  }

  sendCallSignaling(payload: Record<string, unknown>) {
    this.send(payload);
  }

  // Explicitly request a presence sync for current user
  requestPresenceSync() {
    this.send({ type: 'presence_sync_request', timestamp: Date.now() });
  }

  subscribeToConversationUpdates(conversationId: string) {
    this.joinConversation(conversationId);
  }

  unsubscribeFromConversation(conversationId: string) {
    this.leaveConversation(conversationId);
  }

  sendPing() {
    this.send({ type: 'ping', timestamp: Date.now() });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // Send first ping immediately
    this.sendPing();
    // Expect a pong within grace; if not, force close to trigger reconnect
    this.armPongTimeout();
    this.heartbeatIntervalId = window.setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      this.sendPing();
      this.armPongTimeout();
    }, this.heartbeatIntervalMs);
  }

  private armPongTimeout() {
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
    }
    this.heartbeatTimeoutId = window.setTimeout(() => {
      // If no pong arrived in time, force reconnect
      try {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.close();
        }
      } catch (_) {}
    }, this.heartbeatGraceMs);
  }

  private onPong() {
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  private unloadHandler = () => {
    try { this.disconnect(); } catch (_) {}
  };

  private attachUnloadHandler() {
    window.addEventListener('beforeunload', this.unloadHandler);
    window.addEventListener('pagehide', this.unloadHandler);
  }

  private detachUnloadHandler() {
    window.removeEventListener('beforeunload', this.unloadHandler);
    window.removeEventListener('pagehide', this.unloadHandler);
  }

  private handleIncomingMessage(raw: string) {
    try {
      const payload = JSON.parse(raw);
      const eventType = payload.eventType || payload.type;
      
      // Only log call-related messages, skip presence and other non-call events
      // Skip ICE candidates and duplicate CALL_INITIATED/call_offer to reduce noise
      if (eventType && (eventType.startsWith('CALL_') || eventType.startsWith('call_'))) {
        // Don't log ICE candidates to reduce noise
        if (eventType !== 'call_ice_candidate') {
          // Only log first occurrence of CALL_INITIATED and call_offer to reduce noise
          if (eventType === 'CALL_INITIATED' || eventType === 'call_offer') {
            const messageKey = `${eventType}-${payload.callId || payload.id || 'unknown'}`;
            if (!this.loggedCallMessages.has(messageKey)) {
              this.loggedCallMessages.add(messageKey);
            }
          } else {
          }
        }
      }

      const conversationId = payload.conversationId || payload.id;
      if (conversationId && this.conversationListeners.has(conversationId)) {
        this.conversationListeners.get(conversationId)!.forEach((listener) => listener(payload));
      }
      const targetUserId = payload.targetUserId;
      const id = payload.id; // userId from backend event structure
      
      // Handle WebRTC signaling messages (call_offer, call_answer, call_ice_candidate)
      if (eventType === 'call_offer' || eventType === 'call_answer' || eventType === 'call_ice_candidate') {
        const signalingTargetUserId = payload.targetUserId;
        
        if (signalingTargetUserId && this.userListeners.has(signalingTargetUserId)) {
          const listeners = this.userListeners.get(signalingTargetUserId)!;
          listeners.forEach((listener) => listener(payload));
        } else {
        }
        return; // Don't process further
      }
      
      // Handle presence_sync - route to target user listener, or broadcast to all user listeners if no target
      if (eventType === 'presence_sync') {
        if (targetUserId && this.userListeners.has(targetUserId)) {
          this.userListeners.get(targetUserId)!.forEach((listener) => listener(payload));
        } else {
          // If target user listener not found, broadcast to all user listeners (fallback)
          this.userListeners.forEach((listeners) => {
            listeners.forEach((listener) => listener(payload));
          });
        }
      } else if (eventType && typeof eventType === 'string') {
        // Handle user events (USER_*, CALL_*, FRIEND_*, etc.)
        // Route to user listener based on id (userId) from backend event structure
        const userId = id || targetUserId;
        if (userId && this.userListeners.has(userId)) {
          this.userListeners.get(userId)!.forEach((listener) => listener(payload));
        } else if (targetUserId && this.userListeners.has(targetUserId)) {
          // Fallback to targetUserId if id is not available
          this.userListeners.get(targetUserId)!.forEach((listener) => listener(payload));
        }
      }
    } catch (error) {
    }
  }

  private joinConversation(conversationId: string) {
    if (this.joinedConversations.has(conversationId)) {
      return;
    }
    this.joinedConversations.add(conversationId);
    this.send({ type: 'join', conversationId });
  }

  private leaveConversation(conversationId: string) {
    if (!this.joinedConversations.has(conversationId)) {
      return;
    }
    this.joinedConversations.delete(conversationId);
    this.send({ type: 'leave', conversationId });
  }

  private send(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingMessages.push({ ...payload });
      return;
    }

    try {
      this.socket.send(JSON.stringify(payload));
    } catch (error) {
    }
  }

  private flushPendingMessages() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    while (this.pendingMessages.length > 0) {
      const item = this.pendingMessages.shift();
      if (!item) continue;
      this.socket.send(JSON.stringify(item));
    }
  }

  private rejoinConversations() {
    [...this.joinedConversations].forEach((conversationId) => {
      this.send({ type: 'join', conversationId });
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts += 1;
    // Exponential backoff with jitter, capped at 30s
    const base = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    const jitter = Math.floor(Math.random() * 1000);
    const delay = base + jitter;
    setTimeout(() => {
      this.connect().catch(() => {
        // swallow error and allow next attempt
      });
    }, delay);
  }
}

export const websocketService = new WebSocketService();
