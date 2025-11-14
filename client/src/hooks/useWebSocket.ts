// Hooks - useWebSocket
import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { websocketService } from '../services/websocketService';

export const useWebSocket = () => {
  const {
    setConnected,
    addMessage,
    addTypingUser,
    removeTypingUser,
  } = useChatStore();
  
  const isConnectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const connectWebSocket = async () => {
      try {
        await websocketService.connect();
        if (!cancelled) {
          setConnected(true);
          isConnectedRef.current = true;
          // Immediately request presence sync after (re)connect
          websocketService.requestPresenceSync();
        }
      } catch (error) {
        setConnected(false);
        isConnectedRef.current = false;
      }
    };

    connectWebSocket();

    return () => {
      cancelled = true;
      websocketService.disconnect();
      setConnected(false);
      isConnectedRef.current = false;
    };
  }, [setConnected]);

  const subscribeToConversation = useCallback((conversationId: string, onMessage: (message: any) => void) => {
    const ensureConnection = async () => {
      if (!isConnectedRef.current) {
        try {
          await websocketService.connect();
          setConnected(true);
          isConnectedRef.current = true;
          websocketService.requestPresenceSync();
        } catch (error) {
          throw error;
        }
      }
    };

    const subscribe = async () => {
      await ensureConnection();

      return websocketService.subscribeToConversation(conversationId, (event) => {
        const eventType = event?.eventType || event?.type;

        if (eventType === 'MESSAGE_SENT') {
          const data = event.data || event;
          addMessage(conversationId, {
            id: data.messageId || event.id || crypto.randomUUID(),
            content: data.content || '',
            senderId: data.senderId,
            senderName: data.senderName || data.displayName || 'Unknown',
            timestamp: data.createdAt || event.timestamp || new Date().toISOString(),
            type: data.imageUrl ? 'image' : 'text',
          });
        } else if (eventType === 'typing_start') {
          if (event.userId) {
            addTypingUser(conversationId, event.userId);
          }
        } else if (eventType === 'typing_stop') {
          if (event.userId) {
            removeTypingUser(conversationId, event.userId);
          }
        }

        onMessage(event);
      });
    };

    return subscribe().catch((error) => {
      return () => {};
    });
  }, [addMessage, addTypingUser, removeTypingUser, setConnected]);

  const subscribeToUserMessages = useCallback((userId: string, onMessage: (message: any) => void) => {
    const ensureConnection = async () => {
      if (!isConnectedRef.current) {
        try {
          await websocketService.connect();
          setConnected(true);
          isConnectedRef.current = true;
          websocketService.requestPresenceSync();
        } catch (error) {
          throw error;
        }
      }
    };

    const subscribe = async () => {
      await ensureConnection();
      return websocketService.subscribeToUserMessages(userId, onMessage);
    };

    return subscribe().catch((error) => {
      return () => {};
    });
  }, [setConnected]);

  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    try {
      websocketService.sendTypingIndicator(conversationId, isTyping);
    } catch (error) {
    }
  }, []);

  const subscribeToConversationUpdates = useCallback((conversationId: string) => {
    if (!isConnectedRef.current) {
      return () => {};
    }

    try {
      websocketService.subscribeToConversationUpdates(conversationId);
      return () => websocketService.unsubscribeFromConversation(conversationId);
    } catch (error) {
      return () => {};
    }
  }, []);

  return {
    subscribeToConversation,
    subscribeToUserMessages,
    sendTypingIndicator,
    subscribeToConversationUpdates,
    isConnected: isConnectedRef.current,
    requestPresenceSync: () => websocketService.requestPresenceSync(),
  };
};
