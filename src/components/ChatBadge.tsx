import React from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatBadgeProps {
  unreadCount: number;
  onOpenChat: () => void;
}

export const ChatBadge: React.FC<ChatBadgeProps> = ({ unreadCount, onOpenChat }) => {
  return (
    <button
      onClick={onOpenChat}
      className="relative p-2 text-gray-700 hover:text-gray-900 transition-colors"
      title="Mesajlar"
      aria-label={`Mesajlar ${unreadCount > 0 ? `(${unreadCount} okunmamış)` : ''}`}
    >
      <MessageCircle size={24} />

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-5 h-5">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
