import { useState, useEffect, useRef, useCallback } from 'react';

export interface OnlineUser {
  id: string;
  full_name: string;
  email: string;
  is_online: boolean;
  last_activity: string;
  unread_count: number;
  profile_picture: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [unreadSummary, setUnreadSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  // Fetch online users list with unread counts
  const fetchOnlineUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/messages/online/users-list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOnlineUsers(data);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread message summary
  const fetchUnreadSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/unread/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadSummary(data);
      }
    } catch (error) {
      console.error('Error fetching unread summary:', error);
    }
  }, []);

  // Send heartbeat to update last_activity
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/messages/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, []);

  // Get unread count for a specific user
  const getUnreadCount = useCallback((userId: string): number => {
    return unreadSummary[userId] || 0;
  }, [unreadSummary]);

  // Get total unread count from all users
  const getTotalUnread = useCallback((): number => {
    return Object.values(unreadSummary).reduce((total, count) => total + count, 0);
  }, [unreadSummary]);

  // Mark messages from a user as read
  const markUserRead = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/batch-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sender_id: userId })
      });

      if (response.ok) {
        // Update local unread summary
        setUnreadSummary(prev => ({
          ...prev,
          [userId]: 0
        }));

        // Update online users list
        setOnlineUsers(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, unread_count: 0 } : user
          )
        );
      } else if (response.status === 403) {
        // Silently ignore 403 - user may not have permission to mark this sender's messages
        return;
      }
    } catch (error) {
      // Silently ignore network errors for marking user as read
    }
  }, []);

  // Start polling for online users (5 second interval)
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    // Fetch immediately
    fetchOnlineUsers();
    fetchUnreadSummary();

    // Set up polling
    pollingIntervalRef.current = window.setInterval(() => {
      fetchOnlineUsers();
      fetchUnreadSummary();
    }, 5000); // 5 seconds
  }, [fetchOnlineUsers, fetchUnreadSummary]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat (30 second interval)
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return; // Already running

    // Send heartbeat immediately
    sendHeartbeat();

    // Set up heartbeat interval
    heartbeatIntervalRef.current = window.setInterval(sendHeartbeat, 30000); // 30 seconds
  }, [sendHeartbeat]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Initialize polling and heartbeat on mount
  useEffect(() => {
    startPolling();
    startHeartbeat();

    return () => {
      stopPolling();
      stopHeartbeat();
    };
  }, [startPolling, startHeartbeat, stopPolling, stopHeartbeat]);

  return {
    onlineUsers,
    unreadSummary,
    loading,
    getUnreadCount,
    getTotalUnread,
    markUserRead,
    fetchOnlineUsers,
    fetchUnreadSummary,
    sendHeartbeat
  };
};
