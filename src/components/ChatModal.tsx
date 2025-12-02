import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Smile, Paperclip, Trash2, MoreVertical, Search, Users, ChevronDown } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useOnlineUsers } from '../hooks/useOnlineUsers';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, userId }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<{id: number, text: string} | null>(null);
  const [showReactions, setShowReactions] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showOfflineUsers, setShowOfflineUsers] = useState(false);

  const quickReactions = ['❤️', '😂', '😍', '😢', '😡', '👍', '👎', '😮', '🎉', '🔥'];
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '👍', '👎', '👌', '❤️', '💙', '💚', '💛'
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    sendMessage,
    getConversation,
    markAllAsRead,
    markBatchAsRead,
    markAsRead,
    loadMessages,
    editMessage: editMessageApi,
    deleteMessage: deleteMessageApi,
    addReaction,
    removeReaction
  } = useChat(userId);

  const { onlineUsers, getUnreadCount, markUserRead } = useOnlineUsers();

  const conversation = userId ? getConversation() : [];

  // Get selectedUser from availableUsers to ensure online status is synced
  // If user not found in availableUsers, create a placeholder from the conversation
  const selectedUser = userId
    ? availableUsers.find(u => u.id === userId) ||
      (conversation.length > 0
        ? {
            id: userId,
            full_name: conversation[0]?.sender_id === userId ? conversation[0].sender_name : 'Kullanıcı',
            email: '',
            last_login: '',
            is_online: false,
            last_activity: null,
            unread_count: 0
          }
        : null)
    : null;

  // Mark messages as read both in useChat and useOnlineUsers when messages are displayed
  const handleMarkAsRead = async (targetUserId: string) => {
    await markBatchAsRead(targetUserId);
    await markUserRead(targetUserId);
  };

  // Load users when modal opens and send heartbeat
  useEffect(() => {
    if (isOpen) {
      const loadUsers = async () => {
        try {
          // Send heartbeat to update user's online status
          await fetch('/api/messages/heartbeat', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).catch(err => console.error('Heartbeat error:', err));

          if (!userId) {
            setUsersLoading(true);
          }
          // Use the new API endpoint that includes online status and unread counts
          const response = await fetch('/api/messages/online/users-list', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (!response.ok) {
            console.error('API error:', response.status);
            return;
          }

          const users = await response.json();
          setAvailableUsers(users);
        } catch (error) {
          console.error('Error loading users:', error);
        } finally {
          if (!userId) {
            setUsersLoading(false);
          }
        }
      };

      loadUsers();

      // Refresh users list every 3 seconds
      const interval = setInterval(loadUsers, 3000);
      return () => clearInterval(interval);
    } else if (!isOpen) {
      // Reset state when modal closes
      setShowOfflineUsers(false);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadMessages();

      // Auto-mark messages as read after 2 seconds
      const autoReadTimer = setTimeout(() => {
        handleMarkAsRead(userId);
      }, 2000);

      return () => clearTimeout(autoReadTimer);
    }
  }, [isOpen, userId, loadMessages]);

  useEffect(() => {
    if (!userScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, userScrolled]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setUserScrolled(!isAtBottom);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || !userId || isLoading) return;

    setIsLoading(true);
    try {
      await sendMessage(message.trim());
      setMessage('');
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    if (!userId) return;

    // Start typing indicator
    try {
      await fetch('/api/messages/typing/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ receiverId: userId })
      });
    } catch (error) {
      console.error('Start typing error:', error);
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Stop typing after 2 seconds of inactivity
    const timeout = setTimeout(async () => {
      try {
        await fetch('/api/messages/typing/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ receiverId: userId })
        });
      } catch (error) {
        console.error('Stop typing error:', error);
      }
    }, 2000);

    setTypingTimeout(timeout);
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm('Mesajı silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteMessageApi(messageId);
      loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const editMessageHandler = async (messageId: number, newText: string) => {
    try {
      await editMessageApi(messageId, newText);
      setEditingMessage(null);
      loadMessages();
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  // Check typing status
  useEffect(() => {
    if (!isOpen || !userId) return;

    const checkTyping = async () => {
      try {
        const response = await fetch(`/api/messages/typing/status/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setIsTyping(data.typing);
      } catch (error) {
        console.error('Check typing error:', error);
      }
    };

    checkTyping();
    const interval = setInterval(checkTyping, 1000);

    return () => {
      clearInterval(interval);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [isOpen, userId, typingTimeout]);

  if (!isOpen) return null;

  // Helper function to build profile picture URL
  const getProfilePictureUrl = (userId: string): string | null => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const user = availableUsers.find(u => u.id === userId);
    if (user && (user.has_profile_picture || user.profile_picture)) {
      return `${apiUrl}/api/profile/picture/${userId}`;
    }
    return null;
  };

  // If no userId selected, show user list
  if (!userId) {
    const filteredUsers = availableUsers.filter(u =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    );

    // Separate online and offline users using is_online flag
    const userOnlineUsers = filteredUsers.filter(u => u.is_online === true);
    const userOfflineUsers = filteredUsers.filter(u => u.is_online !== true);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[600px] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sohbet Başlat</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Birebir sohbet için kullanıcı seçin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Kullanıcı ara..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto">
            {usersLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Kullanıcı bulunamadı</p>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {/* Online Users Section */}
                {userOnlineUsers.length > 0 && (
                  <>
                    <div className="sticky top-0 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        🟢 Çevrimiçi Kullanıcılar ({userOnlineUsers.length})
                      </p>
                    </div>
                    {userOnlineUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          // Emit event immediately, let parent handle it
                          window.dispatchEvent(new CustomEvent('selectUser', { detail: user.id }));
                        }}
                        className="w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-3 text-left"
                      >
                        <div className="relative">
                          {getProfilePictureUrl(user.id) ? (
                            <img
                              src={getProfilePictureUrl(user.id) || ''}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              {user.full_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {user.is_online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user.full_name}
                            </p>
                            {user.unread_count > 0 && (
                              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full min-w-5 h-5">
                                {user.unread_count > 99 ? '99+' : user.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.last_activity ? `Son aktif: ${new Date(user.last_activity).toLocaleString('tr-TR')}` : 'Hiç aktif olmamış'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Offline Users Section */}
                {userOfflineUsers.length > 0 && (
                  <>
                    <div
                      className="sticky top-0 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowOfflineUsers(!showOfflineUsers)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          ⚫ Çevrimdışı Kullanıcılar ({userOfflineUsers.length})
                        </p>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
                            showOfflineUsers ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                    {showOfflineUsers && userOfflineUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          // Emit event immediately, let parent handle it
                          window.dispatchEvent(new CustomEvent('selectUser', { detail: user.id }));
                        }}
                        className="w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-3 text-left opacity-75"
                      >
                        <div className="relative">
                          {getProfilePictureUrl(user.id) ? (
                            <img
                              src={getProfilePictureUrl(user.id) || ''}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm">
                              {user.full_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user.full_name}
                            </p>
                            {user.unread_count > 0 && (
                              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full min-w-5 h-5">
                                {user.unread_count > 99 ? '99+' : user.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {user.last_activity
                              ? `Son aktif: ${new Date(user.last_activity).toLocaleString('tr-TR')}`
                              : 'Hiç aktif olmamış'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If userId is selected, show chat interface
  if (!selectedUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {selectedUser && getProfilePictureUrl(selectedUser.id) ? (
                <img
                  src={getProfilePictureUrl(selectedUser.id) || ''}
                  alt={selectedUser.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {selectedUser?.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
              {selectedUser?.is_online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedUser.full_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedUser.is_online ? (
                  <span className="text-green-600 dark:text-green-400">🟢 Çevrimiçi</span>
                ) : selectedUser.last_activity ? (
                  `Son aktif: ${new Date(selectedUser.last_activity).toLocaleString('tr-TR')}`
                ) : (
                  'Hiç aktif olmamış'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
        >
          {conversation.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Henüz mesaj yok. İlk mesajı gönderin!
              </p>
            </div>
          ) : (
            conversation.map((msg) => {
              const isOwn = msg.sender_id === JSON.parse(localStorage.getItem('user') || '{}').id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-md`}>
                    <div className={`text-xs text-gray-500 dark:text-gray-400 mb-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {isOwn ? 'Sen' : selectedUser.full_name}
                    </div>

                    <div className="relative group">
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-full break-words ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                        }`}
                      >
                        {editingMessage?.id === msg.id ? (
                          <div className="w-full">
                            <input
                              type="text"
                              value={editingMessage.text}
                              onChange={(e) => setEditingMessage({...editingMessage, text: e.target.value})}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  editMessageHandler(msg.id, editingMessage.text);
                                } else if (e.key === 'Escape') {
                                  setEditingMessage(null);
                                }
                              }}
                              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                            <div className="flex space-x-2 mt-1">
                              <button
                                onClick={() => editMessageHandler(msg.id, editingMessage.text)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Kaydet
                              </button>
                              <button
                                onClick={() => setEditingMessage(null)}
                                className="text-xs text-gray-600 hover:text-gray-800"
                              >
                                İptal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                            {msg.edited_at && (
                              <p className="text-xs text-gray-400 mt-1 italic">düzenlendi</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(
                            msg.reactions.reduce((acc: any, r: any) => {
                              if (!acc[r.emoji]) acc[r.emoji] = [];
                              acc[r.emoji].push(r);
                              return acc;
                            }, {})
                          ).map(([emoji, reactions]: [string, any]) => {
                            const hasUserReaction = reactions.some((r: any) => r.user_id === JSON.parse(localStorage.getItem('user') || '{}').id);
                            return (
                              <button
                                key={emoji}
                                onClick={() => hasUserReaction ? removeReaction(msg.id) : addReaction(msg.id, emoji)}
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                  hasUserReaction
                                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700'
                                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                                title={reactions.map((r: any) => r.user_name).join(', ')}
                              >
                                {emoji} {reactions.length}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Quick reaction button */}
                      {!isOwn && (
                        <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                            className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                            title="Tepki ver"
                          >
                            😊
                          </button>

                          {showReactions === msg.id && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-20 flex gap-1">
                              {quickReactions.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => addReaction(msg.id, emoji)}
                                  className="text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message menu for own messages */}
                      {isOwn && (
                        <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {showMessageMenu === msg.id && (
                            <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20">
                              <button
                                onClick={() => {
                                  setEditingMessage({id: msg.id, text: msg.message});
                                  setShowMessageMenu(null);
                                }}
                                className="flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 w-full text-left"
                              >
                                ✏️ Düzenle
                              </button>
                              <button
                                onClick={() => {
                                  deleteMessage(msg.id);
                                  setShowMessageMenu(null);
                                }}
                                className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Sil
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <div className={`flex items-center mt-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(msg.created_at).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isOwn && (
                        <span className={`text-xs ml-1 ${
                          msg.is_read ? 'text-blue-500' : 'text-gray-400'
                        }`}>
                          {msg.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start space-x-2">
              <div className="flex flex-col items-start">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                  {selectedUser.full_name}
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

          {/* Scroll to bottom button */}
          {userScrolled && (
            <div className="absolute bottom-24 right-4 z-10">
              <button
                onClick={() => {
                  setUserScrolled(false);
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                title="En alta git"
              >
                ↓
              </button>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="relative">
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-16 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-80 max-h-60 overflow-y-auto z-10"
              >
                <div className="grid grid-cols-10 gap-2">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => addEmoji(emoji)}
                      className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-12 h-12 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                title="Dosya Ekle"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // TODO: Implement file upload
                    console.log('File upload:', file);
                  }
                }}
              />

              <input
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Mesaj yazın..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                disabled={isLoading}
              />

              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
