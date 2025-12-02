import { useState, useCallback, useEffect } from 'react';

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  is_read: boolean;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
  reactions?: Array<{
    id: number;
    emoji: string;
    user_id: string;
    user_name: string;
  }>;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  last_login: string;
  is_online?: boolean;
  last_activity?: string;
  unread_count?: number;
  profile_picture?: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const useChat = (userId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Load conversation messages
  const loadMessages = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/messages/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load selected user info
  useEffect(() => {
    if (!userId) return;

    const loadUserInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/messages`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const users = await response.json();
          const user = users.find((u: User) => u.id === userId);
          if (user) {
            setSelectedUser(user);
          }
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    };

    loadUserInfo();
    loadMessages();

    // Poll for new messages every 2 seconds
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [userId, loadMessages]);

  // Get conversation (messages with specific user)
  const getConversation = useCallback(() => {
    if (!userId) return [];
    return messages;
  }, [messages, userId]);

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!userId || !text.trim()) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            receiver_id: userId,
            message: text
          })
        });

        if (response.ok) {
          const newMessage = await response.json();
          setMessages(prev => [...prev, newMessage]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    },
    [userId]
  );

  // Mark all messages from a specific sender as read (batch read)
  const markBatchAsRead = useCallback(async (senderId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/batch-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sender_id: senderId })
      });

      if (response.ok) {
        setMessages(prev =>
          prev.map(msg =>
            msg.sender_id === senderId && !msg.is_read
              ? { ...msg, is_read: true, read_at: new Date().toISOString() }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error marking batch as read:', error);
    }
  }, []);

  // Mark all messages as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const unreadMessages = messages.filter(
        msg => msg.receiver_id === JSON.parse(localStorage.getItem('user') || '{}').id && !msg.is_read
      );

      for (const msg of unreadMessages) {
        await fetch(`${API_BASE_URL}/api/messages/${msg.id}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.receiver_id === JSON.parse(localStorage.getItem('user') || '{}').id && !msg.is_read
            ? { ...msg, is_read: true, read_at: new Date().toISOString() }
            : msg
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [messages, userId]);

  // Mark single message as read
  const markAsRead = useCallback(
    async (messageId: number) => {
      try {
        await fetch(`${API_BASE_URL}/api/messages/${messageId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, is_read: true, read_at: new Date().toISOString() }
              : msg
          )
        );
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    },
    []
  );

  // Edit message
  const editMessage = useCallback(
    async (messageId: number, newText: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ message: newText })
        });

        if (response.ok) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === messageId
                ? { ...msg, message: newText, edited_at: new Date().toISOString() }
                : msg
            )
          );
        }
      } catch (error) {
        console.error('Error editing message:', error);
        throw error;
      }
    },
    []
  );

  // Delete message
  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, []);

  // Add reaction
  const addReaction = useCallback(
    async (messageId: number, emoji: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/reaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ emoji })
        });

        if (response.ok) {
          // Reload messages to get updated reactions
          loadMessages();
        }
      } catch (error) {
        console.error('Error adding reaction:', error);
      }
    },
    [loadMessages]
  );

  // Remove reaction
  const removeReaction = useCallback(
    async (messageId: number) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/reaction`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          // Reload messages to get updated reactions
          loadMessages();
        }
      } catch (error) {
        console.error('Error removing reaction:', error);
      }
    },
    [loadMessages]
  );

  return {
    messages,
    selectedUser,
    users,
    loading,
    sendMessage,
    getConversation,
    markAllAsRead,
    markBatchAsRead,
    markAsRead,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMessages
  };
};
