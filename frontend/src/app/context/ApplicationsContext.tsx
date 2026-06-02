import { createContext, useContext, useState, ReactNode } from 'react';

export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'offered';

export interface Application {
  id: string;
  offerId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  status: ApplicationStatus;
  declineMessage?: string;
  createdAt: string;
}

interface ApplicationsContextType {
  applications: Application[];
  addApplication: (application: Omit<Application, 'id' | 'status' | 'createdAt'>) => void;
  updateApplicationStatus: (id: string, status: ApplicationStatus, declineMessage?: string) => void;
  getApplicationsByOffer: (offerId: string) => Application[];
  getApplicationsByApplicant: (applicantId: string) => Application[];
  hasUserApplied: (offerId: string, userId: string) => boolean;
}

const ApplicationsContext = createContext<ApplicationsContextType | undefined>(undefined);

// Demo applications for demonstration purposes
const demoApplications: Application[] = [
  {
    id: 'demo-app-1',
    offerId: '1',
    applicantId: 'demo-user-1',
    applicantName: 'Anna Schmidt',
    applicantEmail: 'anna.schmidt@oth-regensburg.de',
    message: 'Hi! I\'m a second-year student looking for a room during the summer semester. I\'m quiet, clean, and would love to join your WG. I don\'t smoke and I love cooking!',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-app-2',
    offerId: '1',
    applicantId: 'demo-user-2',
    applicantName: 'Tom Weber',
    applicantEmail: 'tom.weber@oth-regensburg.de',
    message: 'Hello! I\'m an exchange student from Munich starting an internship at OTH. Looking for accommodation close to campus. I\'m responsible and respectful of shared spaces.',
    status: 'approved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-app-3',
    offerId: '1',
    applicantId: 'demo-user-3',
    applicantName: 'Lisa Bauer',
    applicantEmail: 'lisa.bauer@oth-regensburg.de',
    message: 'Hi there! Your place looks perfect! I\'m a master\'s student in engineering and need a place for 3 months while doing my thesis at OTH. Clean, quiet, and friendly!',
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<Application[]>(demoApplications);

  const addApplication = (application: Omit<Application, 'id' | 'status' | 'createdAt'>) => {
    const newApplication: Application = {
      ...application,
      id: String(Date.now()),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setApplications(prev => [newApplication, ...prev]);
  };

  const updateApplicationStatus = (id: string, status: ApplicationStatus, declineMessage?: string) => {
    setApplications(prev =>
      prev.map(app =>
        app.id === id
          ? { ...app, status, declineMessage: declineMessage || app.declineMessage }
          : app
      )
    );
  };

  const getApplicationsByOffer = (offerId: string) => {
    return applications.filter(app => app.offerId === offerId);
  };

  const getApplicationsByApplicant = (applicantId: string) => {
    return applications.filter(app => app.applicantId === applicantId);
  };

  const hasUserApplied = (offerId: string, userId: string) => {
    return applications.some(app => app.offerId === offerId && app.applicantId === userId);
  };

  return (
    <ApplicationsContext.Provider
      value={{
        applications,
        addApplication,
        updateApplicationStatus,
        getApplicationsByOffer,
        getApplicationsByApplicant,
        hasUserApplied,
      }}
    >
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplications() {
  const context = useContext(ApplicationsContext);
  if (context === undefined) {
    throw new Error('useApplications must be used within an ApplicationsProvider');
  }
  return context;
}
