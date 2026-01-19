import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ChatPortalProps {
  children: ReactNode;
}

const ChatPortal: React.FC<ChatPortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
};

export default ChatPortal;
