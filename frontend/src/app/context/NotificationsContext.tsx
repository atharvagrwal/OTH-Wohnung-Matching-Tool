import { createContext, useContext, useState, ReactNode } from 'react';

export type NotificationType = 'application' | 'approval' | 'decline' | 'offer' | 'final-decline';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
  offerId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId: string) => void;
  getUserNotifications: (userId: string) => Notification[];
  getUnreadCount: (userId: string) => number;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Demo notifications for demonstration purposes
const demoNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: '1',
    type: 'application',
    title: 'New Application',
    message: 'Anna Schmidt applied for Cozy WG Room in City Center',
    applicationId: 'demo-app-1',
    offerId: '1',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    userId: '1',
    type: 'application',
    title: 'New Application',
    message: 'Lisa Bauer applied for Cozy WG Room in City Center',
    applicationId: 'demo-app-3',
    offerId: '1',
    isRead: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(demoNotifications);

  const addNotification = (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: String(Date.now()),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, isRead: true } : notif))
    );
  };

  const markAllAsRead = (userId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.userId === userId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const getUserNotifications = (userId: string) => {
    return notifications
      .filter(notif => notif.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  const getUnreadCount = (userId: string) => {
    return notifications.filter(notif => notif.userId === userId && !notif.isRead).length;
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        getUserNotifications,
        getUnreadCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
