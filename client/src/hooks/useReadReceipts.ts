// Hooks - useReadReceipts
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Message } from '../components/chat/MessageList';

export interface ConversationParticipantLite {
  id: string;
  lastSeenAt?: string;
  lastReadMessageId?: string;
}

export const useReadReceipts = () => {
  const [participantLastSeenState, setParticipantLastSeenState] = useState<Record<string, number>>({});
  const [participantLastReadMessageIdState, setParticipantLastReadMessageIdState] = useState<Record<string, string>>({});

  const lastSeenRef = useRef(participantLastSeenState);
  const lastReadRef = useRef(participantLastReadMessageIdState);

  const setParticipantLastSeen = useCallback(
    (updater: ((prev: Record<string, number>) => Record<string, number>) | Record<string, number>) => {
      setParticipantLastSeenState((prev) => {
        const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
        lastSeenRef.current = next;
        return next;
      });
    },
    []
  );

  const setParticipantLastReadMessageId = useCallback(
    (updater: ((prev: Record<string, string>) => Record<string, string>) | Record<string, string>) => {
      setParticipantLastReadMessageIdState((prev) => {
        const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
        lastReadRef.current = next;
        return next;
      });
    },
    []
  );

  const initFromParticipants = useCallback((participants: ConversationParticipantLite[]) => {
    const lastSeen: Record<string, number> = {};
    const lastRead: Record<string, string> = {};
    for (const p of participants || []) {
      if (!p || !p.id) continue;
      if (p.lastSeenAt) lastSeen[p.id] = new Date(p.lastSeenAt).getTime();
      if (p.lastReadMessageId) lastRead[p.id] = p.lastReadMessageId;
    }
    lastSeenRef.current = lastSeen;
    lastReadRef.current = lastRead;
    setParticipantLastSeenState(lastSeen);
    setParticipantLastReadMessageIdState(lastRead);
  }, []);

  const applyReadReceipts = useCallback(
    (
      messages: Message[],
      participants: { id: string }[],
      currentUserId: string
    ): Message[] => {
      if (!messages || messages.length === 0) return messages;

      const normalize = (value?: string) => (value ?? '').trim().toLowerCase();
      const currentId = normalize(currentUserId);
      const participantLastSeen = lastSeenRef.current;
      const participantLastReadMessageId = lastReadRef.current;

      let hasChanges = false;
      const updated = messages.map((msg) => {
        const messageTime = new Date(msg.timestamp).getTime();
        const messageSenderId = normalize(msg.senderId);

        const readBy = new Set<string>(msg.readBy || []);

        for (const p of participants || []) {
          const pid = p.id;
          const nPid = normalize(pid);
          if (!pid) continue;
          if (nPid === messageSenderId) continue; // exclude sender
          if (nPid === currentId) continue; // exclude current user

          const lastReadId = participantLastReadMessageId[pid];
          if (lastReadId) {
            if (msg.id === lastReadId) {
              readBy.add(pid);
              continue;
            }
            const lastReadMessage = messages.find((m) => m.id === lastReadId);
            if (lastReadMessage) {
              const lastReadTime = new Date(lastReadMessage.timestamp).getTime();
              if (messageTime <= lastReadTime) {
                readBy.add(pid);
                continue;
              }
            }
          }

          const lastSeenTime = participantLastSeen[pid];
          if (lastSeenTime && messageTime <= lastSeenTime) {
            readBy.add(pid);
          }
        }

        const nextReadBy = Array.from(readBy);
        const changed = JSON.stringify((msg.readBy || []).sort()) !== JSON.stringify(nextReadBy.sort());
        if (changed) {
          hasChanges = true;
          return { ...msg, readBy: nextReadBy };
        }
        return msg;
      });

      return hasChanges ? updated : messages;
    },
    []
  );

  const api = useMemo(
    () => ({
      participantLastSeen: participantLastSeenState,
      participantLastReadMessageId: participantLastReadMessageIdState,
      setParticipantLastSeen,
      setParticipantLastReadMessageId,
      initFromParticipants,
      applyReadReceipts,
    }),
    [
      participantLastSeenState,
      participantLastReadMessageIdState,
      setParticipantLastSeen,
      setParticipantLastReadMessageId,
      initFromParticipants,
      applyReadReceipts,
    ]
  );

  return api;
};
