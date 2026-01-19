import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface MessageType {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  is_read: boolean;
  createdAt: string;
}

interface DirectMessagingProps {
  currentUserId: string;
  targetUserId: string;
  targetUserName?: string;
  targetUserAvatar?: string;
  isTargetOnline?: boolean;
  onClose?: () => void;
}

const DirectMessaging: React.FC<DirectMessagingProps> = ({
  currentUserId,
  targetUserId,
  targetUserName = 'User',
  targetUserAvatar,
  isTargetOnline = false,
  onClose
}) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate conversation ID deterministically
  const conversationId = [currentUserId, targetUserId].sort().join('_');

  // Initialize Socket.io connection and fetch history
  useEffect(() => {
    const initializeMessaging = async () => {
      try {
        // Connect to socket
        const socket = io({
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          path: '/socket.io/'
        });

        socketRef.current = socket;

        // Set up socket event listeners
        socket.on('connect', () => {
          console.log('Connected to messaging server');
          // Join the conversation room
          socket.emit('join-conversation', {
            userId: currentUserId,
            targetUserId: targetUserId
          });
        });

        socket.on('message-received', (message: MessageType) => {
          setMessages((prev) => [...prev, message]);
        });

        socket.on('user-typing', (data: { userId: string }) => {
          if (data.userId !== currentUserId) {
            setTyping(true);
          }
        });

        socket.on('user-stopped-typing', (data: { userId: string }) => {
          if (data.userId !== currentUserId) {
            setTyping(false);
          }
        });

        socket.on('user-status-changed', (data: { userId: string; status: string }) => {
          console.log(`User ${data.userId} is ${data.status}`);
        });

        socket.on('error', (error: { message: string }) => {
          console.error('Socket error:', error);
          setError(error.message);
        });

        socket.on('disconnect', () => {
          console.log('Disconnected from messaging server');
        });

        // Fetch message history
        const token = localStorage.getItem('token');
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
        } else {
          setError('Failed to load message history');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error initializing messaging:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize messaging');
        setLoading(false);
      }
    };

    initializeMessaging();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, targetUserId, conversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    const markAsRead = async () => {
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/messages/${conversationId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    };

    markAsRead();
  }, [conversationId]);

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !socketRef.current) {
      return;
    }

    socketRef.current.emit('send-message', {
      conversationId,
      senderId: currentUserId,
      receiverId: targetUserId,
      text: message
    });

    // Stop typing indicator
    socketRef.current.emit('stop-typing', {
      conversationId,
      userId: currentUserId
    });

    setTyping(false);
  };

  const handleTyping = () => {
    if (!socketRef.current) return;

    // Emit typing event
    socketRef.current.emit('typing', {
      conversationId,
      userId: currentUserId
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', {
        conversationId,
        userId: currentUserId
      });
    }, 3000);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Geri Dön
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Messages */}
      <div
        ref={messageListRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Henüz bir mesaj yok. Sohbete başla!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.senderId === currentUserId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                  msg.senderId === currentUserId
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="break-words">{msg.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.senderId === currentUserId
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg text-sm">
              <span className="text-xs">{targetUserName} yazıyor...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem(
              'message'
            ) as HTMLInputElement;
            if (input.value.trim()) {
              handleSendMessage(input.value);
              input.value = '';
              input.focus();
            }
          }}
          className="flex gap-2"
        >
          <input
            name="message"
            type="text"
            placeholder="Mesaj yazın..."
            onChange={handleTyping}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            Gönder
          </button>
        </form>
      </div>
    </div>
  );
};

export default DirectMessaging;
