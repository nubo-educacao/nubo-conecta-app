'use client';

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

interface ChatVisibility {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const ChatVisibilityContext = createContext<ChatVisibility | undefined>(undefined);

export function ChatVisibilityProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ChatVisibilityContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </ChatVisibilityContext.Provider>
  );
}

export function useChatVisibility() {
  const context = useContext(ChatVisibilityContext);
  if (!context) throw new Error('useChatVisibility precisa estar dentro de ChatVisibilityProvider');
  return context;
}
