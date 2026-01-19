import React, { useEffect, useState } from 'react';
import {
  MainContainer,
  ConversationList,
  Conversation,
  ConversationHeader,
  Search,
  Avatar
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';

export interface DirectUser {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  isOnline?: boolean;
}

interface DirectMessagingListProps {
  users: DirectUser[];
  onSelectUser: (user: DirectUser) => void;
}

const DirectMessagingList: React.FC<DirectMessagingListProps> = ({
  users,
  onSelectUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<DirectUser[]>(users);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  return (
    <MainContainer>
      <ConversationList>
        <ConversationHeader>
          <ConversationHeader.Content>Direct Messages</ConversationHeader.Content>
        </ConversationHeader>
        <Search
          placeholder="Search conversations..."
          onClearClick={() => setSearchTerm('')}
          onChange={(value) => setSearchTerm(value)}
          value={searchTerm}
        />

        <div className="conversation-list-custom">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelectUser(user)}
              >
                <div className="flex items-center gap-3">
                  {user.avatar && (
                    <Avatar src={user.avatar} name={user.name} size="md" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                      {user.isOnline && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2 flex-shrink-0">
                          Online
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {user.lastMessage || 'No messages yet'}
                    </p>
                    {user.lastMessageTime && (
                      <p className="text-xs text-gray-400 mt-1">{user.lastMessageTime}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No users found' : 'No conversations yet'}
            </div>
          )}
        </div>
      </ConversationList>
    </MainContainer>
  );
};

export default DirectMessagingList;
