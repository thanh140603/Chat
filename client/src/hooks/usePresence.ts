// Hooks - usePresence
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWebSocket } from './useWebSocket';

export interface PresenceStateEntry {
  status: 'online' | 'offline';
  lastSeen?: number;
}

export type PresenceState = Record<string, PresenceStateEntry>;

export const usePresence = (currentUserId: string) => {
  const { subscribeToUserMessages, requestPresenceSync } = useWebSocket();
  const [onlineFriends, setOnlineFriends] = useState<PresenceState>({});
  const subscribedRef = useRef(false);

  // Subscribe once to current user's user-channel to receive presence and presence_sync
  useEffect(() => {
    if (!currentUserId || subscribedRef.current) return;
    subscribedRef.current = true;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const unsub = await subscribeToUserMessages(currentUserId, (event: any) => {
        const eventType = event?.eventType || event?.type;

        if (eventType === 'presence_sync') {
          const friends = Array.isArray(event.friends) ? event.friends : [];
          setOnlineFriends((prev) => {
            const next: PresenceState = { ...prev };
            for (const f of friends) {
              const userId = f.userId;
              if (!userId) continue;
              const status: 'online' | 'offline' = f.status === 'online' ? 'online' : 'offline';
              const lastSeen = typeof f.lastSeen === 'number' ? f.lastSeen : undefined;
              next[userId] = { status, lastSeen };
            }
            return next;
          });
        } else if (eventType === 'presence') {
          const userId = event.userId;
          if (!userId) return;
          const status: 'online' | 'offline' = event.status === 'online' ? 'online' : 'offline';
          const lastSeen = typeof event.lastSeen === 'number' ? event.lastSeen : undefined;
          setOnlineFriends((prev) => ({
            ...prev,
            [userId]: { status, lastSeen },
          }));
        }
      });
      if (!cancelled) {
        cleanup = unsub;
      } else if (unsub) {
        // If already cancelled, immediately unsubscribe
        try { unsub(); } catch {}
      }
    })();

    // Immediately request a fresh sync when mounting
    requestPresenceSync();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      subscribedRef.current = false;
    };
  }, [currentUserId, subscribeToUserMessages, requestPresenceSync]);

  const mergeFriendStatuses = useCallback(
    <T extends { id: string }>(
      friends: Array<T>
    ): Array<T & { isOnline?: boolean; lastSeen?: number }> => {
      return friends.map((f) => ({
        ...f,
        isOnline: onlineFriends[f.id]?.status === 'online',
        lastSeen: onlineFriends[f.id]?.lastSeen,
      }));
    },
    [onlineFriends]
  );

  return useMemo(
    () => ({ onlineFriends, setOnlineFriends, requestPresenceSync, mergeFriendStatuses }),
    [onlineFriends, requestPresenceSync, mergeFriendStatuses]
  );
};
