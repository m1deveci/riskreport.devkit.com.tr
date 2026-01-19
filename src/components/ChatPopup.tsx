import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minimize2, Maximize2, MessageCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import DirectMessaging from './DirectMessaging';
import type { UserProfile } from '../lib/auth';

interface ChatPopupProps {
  currentUser: UserProfile;
}

interface AvailableUser {
  id: string;
  full_name: string;
  name?: string;
  profile_picture?: string;
  is_online?: boolean;
  role?: string;
  unread_count?: number;
}

const ChatPopup: React.FC<ChatPopupProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<AvailableUser[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Fetch unread message count for a specific user
  const fetchUnreadCount = useCallback(async (userId: string, token: string): Promise<number> => {
    try {
      const response = await fetch(`/api/messages/unread/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.unreadCount || 0;
      }
    } catch (error) {
      console.error(`[ChatPopup] Error fetching unread count for user ${userId}:`, error);
    }
    return 0;
  }, []);

  // Fetch total unread count
  const fetchTotalUnreadCount = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/messages/unread/count', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTotalUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('[ChatPopup] Error fetching total unread count:', error);
    }
  }, []);

  // Kullanıcı listesini yükle (tüm rollü kullanıcılar)
  useEffect(() => {
    const loadAvailableUsers = async () => {
      if (!isOpen || selectedUser) return;

      try {
        setLoadingUsers(true);
        const token = localStorage.getItem('token');
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:6000') + '/api/users/for-messaging';

        console.log('[ChatPopup] Fetching users from:', apiUrl);
        console.log('[ChatPopup] Token:', token ? 'Available' : 'Missing');

        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('[ChatPopup] Response status:', response.status);

        if (response.ok) {
          const users = await response.json();
          console.log('[ChatPopup] Users loaded:', users.length);

          // Fetch unread counts for each user
          const usersWithUnread = await Promise.all(
            users.map(async (user) => ({
              ...user,
              unread_count: await fetchUnreadCount(user.id, token || '')
            }))
          );

          setAvailableUsers(usersWithUnread);
          setFilteredUsers(usersWithUnread);

          // Fetch total unread count
          if (token) {
            await fetchTotalUnreadCount(token);
          }
        } else {
          const errorText = await response.text();
          console.error('[ChatPopup] Error response:', response.status, errorText);
        }
      } catch (error) {
        console.error('[ChatPopup] Error loading users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadAvailableUsers();
  }, [isOpen, selectedUser, currentUser.id]);

  // Search filter
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(availableUsers);
    } else {
      const filtered = availableUsers.filter((user) =>
        (user.full_name || user.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, availableUsers]);

  // Initialize socket connection for unread message updates
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      path: '/socket.io/'
    });

    socketRef.current = socket;

    // Listen for unread message notifications
    socket.on('unread-message-received', async () => {
      // Refresh unread counts when a message is received
      const token = localStorage.getItem('token');
      if (token && availableUsers.length > 0) {
        // Fetch total unread count
        await fetchTotalUnreadCount(token);

        // Refresh all user unread counts
        const updatedUsers = await Promise.all(
          availableUsers.map(async (user) => ({
            ...user,
            unread_count: await fetchUnreadCount(user.id, token)
          }))
        );
        setAvailableUsers(updatedUsers);
        setFilteredUsers(updatedUsers);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [availableUsers, fetchUnreadCount, fetchTotalUnreadCount]);

  const handleClose = () => {
    setIsOpen(false);
    setSelectedUser(null);
    setSearchTerm('');
  };

  const handleSelectUser = (user: AvailableUser) => {
    setSelectedUser(user);
    setSearchTerm('');
  };

  const handleBackToUserList = () => {
    setSelectedUser(null);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group relative"
          title="Mesaj Gönder"
        >
          <MessageCircle className="w-6 h-6" />
          {totalUnreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </div>
          )}
          <span className="absolute right-full mr-3 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            Mesajlar
          </span>
        </button>
      )}

      {/* Chat Popup Container */}
      {isOpen && (
        <div
          style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
          className={`bg-white rounded-lg shadow-2xl transition-all duration-300 border border-gray-200 ${
            isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedUser && (
                <button
                  onClick={handleBackToUserList}
                  className="text-white hover:bg-blue-700/50 rounded px-2 py-1 transition-colors font-medium text-sm flex-shrink-0"
                  title="Geri Dön"
                >
                  ← Geri
                </button>
              )}
              <div className="min-w-0">
                {selectedUser ? (
                  <>
                    <h2 className="font-bold text-base">{selectedUser.full_name || selectedUser.name}</h2>
                    <p className="text-xs text-blue-100">
                      {selectedUser.is_online ? '🟢 Çevrimiçi' : '⚪ Çevrimdışı'}
                    </p>
                  </>
                ) : (
                  <h2 className="font-bold text-base">Mesajlar</h2>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-blue-700/50 rounded transition-colors"
                title={isMinimized ? 'Genişlet' : 'Küçült'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-blue-700/50 rounded transition-colors"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="h-[calc(600px-56px)] overflow-hidden flex flex-col">
              {selectedUser ? (
                <div className="flex-1 overflow-hidden">
                  <DirectMessaging
                    currentUserId={currentUser.id}
                    targetUserId={selectedUser.id}
                    targetUserName={selectedUser.full_name || selectedUser.name}
                    targetUserAvatar={selectedUser.profile_picture}
                    isTargetOnline={selectedUser.is_online}
                    onClose={handleBackToUserList}
                  />
                </div>
              ) : (
                <>
                  {/* User List Header */}
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <input
                      type="text"
                      placeholder="Kullanıcı ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* User List */}
                  <div className="flex-1 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p className="text-sm">Kullanıcılar yükleniyor...</p>
                        </div>
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            className="w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left flex items-center gap-3"
                          >
                            {/* Avatar */}
                            <div className="flex-shrink-0 relative">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
                                {(user.full_name || user.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              {user.is_online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {user.full_name || user.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.role === 'admin'
                                  ? 'Yönetici'
                                  : user.role === 'isg_expert'
                                  ? 'İSG Uzmanı'
                                  : 'Kullanıcı'}
                              </p>
                            </div>

                            {/* Unread Count Badge */}
                            {user.unread_count && user.unread_count > 0 && (
                              <div className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {user.unread_count > 99 ? '99+' : user.unread_count}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-center text-gray-500 text-sm">
                          {searchTerm ? 'Kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatPopup;
