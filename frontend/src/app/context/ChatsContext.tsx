import { createContext, useContext, useState, ReactNode } from 'react';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  applicationId: string;
  offerId: string;
  offerName: string;
  participants: string[];
  messages: Message[];
  isActive: boolean;
  lastMessage?: Message;
}

interface ChatsContextType {
  chats: Chat[];
  createChat: (applicationId: string, offerId: string, offerName: string, participants: string[]) => void;
  getChatByApplication: (applicationId: string) => Chat | undefined;
  getUserChats: (userId: string) => Chat[];
  sendMessage: (chatId: string, senderId: string, senderName: string, text: string) => void;
  deactivateChat: (chatId: string) => void;
  getUnreadCount: (userId: string) => number;
}

const ChatsContext = createContext<ChatsContextType | undefined>(undefined);

// Demo chat for demonstration purposes
const demoMessages: Message[] = [
  {
    id: 'msg-1',
    senderId: 'demo-user-2',
    senderName: 'Tom Weber',
    text: 'Hi! Thanks for approving my application. When would be a good time to view the room?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2',
    senderId: '1',
    senderName: 'Max Mustermann',
    text: 'Hi Tom! Great to hear from you. How about this Saturday at 2 PM?',
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-3',
    senderId: 'demo-user-2',
    senderName: 'Tom Weber',
    text: 'Saturday at 2 PM works perfectly for me! Should I bring anything?',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-4',
    senderId: '1',
    senderName: 'Max Mustermann',
    text: 'Just yourself! Looking forward to meeting you.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
];

const demoChats: Chat[] = [
  {
    id: 'demo-chat-1',
    applicationId: 'demo-app-2',
    offerId: '1',
    offerName: 'Cozy WG Room in City Center',
    participants: ['1', 'demo-user-2'],
    messages: demoMessages,
    isActive: true,
    lastMessage: demoMessages[demoMessages.length - 1],
  },
];

export function ChatsProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>(demoChats);

  const createChat = (applicationId: string, offerId: string, offerName: string, participants: string[]) => {
    const existingChat = chats.find(chat => chat.applicationId === applicationId);
    if (existingChat) return;

    const newChat: Chat = {
      id: String(Date.now()),
      applicationId,
      offerId,
      offerName,
      participants,
      messages: [],
      isActive: true,
    };
    setChats(prev => [newChat, ...prev]);
  };

  const getChatByApplication = (applicationId: string) => {
    return chats.find(chat => chat.applicationId === applicationId);
  };

  const getUserChats = (userId: string) => {
    return chats
      .filter(chat => chat.participants.includes(userId))
      .sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || '';
        const bTime = b.lastMessage?.timestamp || '';
        return bTime.localeCompare(aTime);
      });
  };

  const sendMessage = (chatId: string, senderId: string, senderName: string, text: string) => {
    const message: Message = {
      id: String(Date.now()),
      senderId,
      senderName,
      text,
      timestamp: new Date().toISOString(),
    };

    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, message], lastMessage: message }
          : chat
      )
    );
  };

  const deactivateChat = (chatId: string) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, isActive: false } : chat
      )
    );
  };

  const getUnreadCount = (userId: string) => {
    return 0;
  };

  return (
    <ChatsContext.Provider
      value={{
        chats,
        createChat,
        getChatByApplication,
        getUserChats,
        sendMessage,
        deactivateChat,
        getUnreadCount,
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
}

export function useChats() {
  const context = useContext(ChatsContext);
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatsProvider');
  }
  return context;
}
