import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider, useToast } from './components/Toast.tsx';
import { Sidebar, NavPage } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { JobsPage } from './pages/JobsPage.tsx';
import { ScreeningPage } from './pages/ScreeningPage.tsx';
import { RankingsPage } from './pages/RankingsPage.tsx';
import { CandidateDetailsPage } from './pages/CandidateDetailsPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { testConnection } from './firebase.ts';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Test connection on boot as required by firebase skill
  useEffect(() => {
    testConnection().then(ok => {
      if (!ok) {
        console.warn('Initial Firestore connection check completed with offline fallback.');
      }
    });
  }, []);

  const handleNavigate = (page: NavPage, param?: string) => {
    if (page === 'candidate-details' && param) {
      setSelectedResultId(param);
    } else if (page === 'screening' && param) {
      setSelectedJobId(param);
    } else if (page === 'jobs' && param) {
      setSelectedJobId(param);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  // If loading authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-sm animate-pulse">
            IQ
          </div>
          <span className="text-xs font-medium text-slate-500">Loading ResumeIQ Workspace...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show Auth
  if (!user) {
    return <AuthPage />;
  }

  const getPageTitle = (p: NavPage) => {
    switch (p) {
      case 'dashboard': return 'Recruiter Overview';
      case 'jobs': return 'Job Descriptions';
      case 'screening': return 'Resume Screening & Extraction';
      case 'rankings': return 'Candidate Rankings & Match Matrix';
      case 'candidate-details': return 'Candidate Profile & Evidence';
      case 'history': return 'Screening Session History';
      case 'settings': return 'System Settings & Controls';
      default: return 'ResumeIQ';
    }
  };

  const getPageSubtitle = (p: NavPage) => {
    switch (p) {
      case 'dashboard': return 'Real-time recruiter pipeline analytics and target positions';
      case 'jobs': return 'Create and review positions with AI requirement extraction and wording checks';
      case 'screening': return 'Upload PDF resumes with SHA-256 duplicate checking and structured parsing';
      case 'rankings': return 'Deterministic scoring and ranking decision support';
      case 'candidate-details': return 'Verified quotes, full experience timeline, and resume text viewer';
      case 'history': return 'Archived screening runs with reproducible requirements snapshots';
      case 'settings': return 'Configurable scoring weights, threshold sliders, and data privacy controls';
      default: return undefined;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <Header
          title={getPageTitle(currentPage)}
          subtitle={getPageSubtitle(currentPage)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentPage === 'dashboard' && (
            <DashboardPage
              onNavigate={handleNavigate}
              onOpenCreateJob={() => handleNavigate('jobs')}
            />
          )}

          {currentPage === 'jobs' && (
            <JobsPage
              initialJobId={selectedJobId}
              onClearInitialJobId={() => setSelectedJobId(null)}
              onSelectJobForScreening={(job) => {
                setSelectedJobId(job.id);
                handleNavigate('screening', job.id);
              }}
            />
          )}

          {currentPage === 'screening' && (
            <ScreeningPage
              selectedJobId={selectedJobId}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'rankings' && (
            <RankingsPage
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'candidate-details' && (
            <CandidateDetailsPage
              resultId={selectedResultId || ''}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'history' && (
            <HistoryPage
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
