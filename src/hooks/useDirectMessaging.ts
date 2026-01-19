import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

export interface UseDirectMessagingOptions {
  currentUserId: string;
  targetUserId: string;
  autoConnect?: boolean;
}

export interface UseDirectMessagingReturn {
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  sendMessage: (text: string) => void;
  loadMoreMessages: (limit: number, offset: number) => Promise<void>;
  disconnect: () => void;
}

/**
 * Custom hook for managing direct messaging functionality
 *
 * Usage:
 * ```tsx
 * const {
 *   messages,
 *   isTyping,
 *   sendMessage,
 *   isConnected
 * } = useDirectMessaging({
 *   currentUserId: 'user_001',
 *   targetUserId: 'user_002'
 * });
 * ```
 */
export function useDirectMessaging(
  options: UseDirectMessagingOptions
): UseDirectMessagingReturn {
  const { currentUserId, targetUserId, autoConnect = true } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const conversationId = [currentUserId, targetUserId].sort().join('_');

  // Initialize socket connection
  const connect = useCallback(() => {
    try {
      const socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        setError(null);

        // Join conversation
        socket.emit('join-conversation', {
          userId: currentUserId,
          targetUserId: targetUserId
        });
      });

      socket.on('message-received', (message: Message) => {
        setMessages((prev) => [...prev, message]);
      });

      socket.on('user-typing', () => {
        setIsTyping(true);
      });

      socket.on('user-stopped-typing', () => {
        setIsTyping(false);
      });

      socket.on('error', (err: { message: string }) => {
        setError(err.message);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      return socket;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMsg);
      return null;
    }
  }, [currentUserId, targetUserId]);

  // Load message history
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await fetch(
        `/api/messages/${conversationId}?limit=50&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setError(null);
      } else {
        setError('Failed to load message history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Initialize connection and load history
  useEffect(() => {
    if (!autoConnect) return;

    const socket = connect();
    loadHistory();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [autoConnect, connect, loadHistory]);

  // Send message
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !socketRef.current || !isConnected) {
        return;
      }

      socketRef.current.emit('send-message', {
        conversationId,
        senderId: currentUserId,
        receiverId: targetUserId,
        text
      });

      // Stop typing indicator
      socketRef.current.emit('stop-typing', {
        conversationId,
        userId: currentUserId
      });
    },
    [conversationId, currentUserId, targetUserId, isConnected]
  );

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(
    async (limit: number, offset: number) => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const response = await fetch(
          `/api/messages/${conversationId}?limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setMessages((prev) => [...data.messages || [], ...prev]);
        }
      } catch (err) {
        console.error('Error loading more messages:', err);
      }
    },
    [conversationId]
  );

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    isTyping,
    isLoading,
    error,
    isConnected,
    sendMessage,
    loadMoreMessages,
    disconnect
  };
}
