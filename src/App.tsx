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
import { testConnection, db } from './firebase.ts';
import { SAMPLE_JOBS, SAMPLE_CANDIDATES_RAW } from './utils/sampleData.ts';
import { doc, setDoc } from 'firebase/firestore';
import { DEFAULT_SCORING_CONFIG, computeDeterministicScore } from './utils/scoring.ts';
import { computeSublinearTfIdfCosine } from './utils/nlp.ts';
import { storeJob, storeResume, storeCandidate, storeSession, storeResult } from './utils/dataStore.ts';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

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

  // 1-Click Load Realistic Demo Data into recruiter's account
  const handleLoadDemoData = async () => {
    if (!user) return;
    setDemoLoading(true);
    try {
      toast('Loading sample jobs and screened candidate resumes...', 'info');

      // 1. Create sample jobs
      const createdJobIds: string[] = [];
      for (const sampleJob of SAMPLE_JOBS) {
        const jobId = `demo_job_${Math.random().toString(36).slice(2, 8)}`;
        const jobDoc = {
          ...sampleJob,
          id: jobId,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await storeJob(jobDoc as any);
        createdJobIds.push(jobId);
      }

      const primaryJob = SAMPLE_JOBS[0];
      const primaryJobId = createdJobIds[0];

      // 2. Create sample screening session
      const sessionId = `demo_session_${Math.random().toString(36).slice(2, 8)}`;
      const candidateIds: string[] = [];

      // 3. Create sample resumes, candidates, and screening results
      for (let i = 0; i < SAMPLE_CANDIDATES_RAW.length; i++) {
        const item = SAMPLE_CANDIDATES_RAW[i];
        const resumeId = `demo_res_${Math.random().toString(36).slice(2, 8)}`;
        const candidateId = `demo_cand_${Math.random().toString(36).slice(2, 8)}`;
        const resultId = `demo_result_${sessionId}_${candidateId}`;

        // Save Resume record
        await storeResume({
          id: resumeId,
          ownerId: user.uid,
          fileName: item.fileName,
          fileHash: `hash_demo_${i}_${Date.now()}`,
          status: 'Ready',
          extractionMethod: 'text',
          textLength: item.rawText.length,
          rawText: item.rawText,
          isSample: true,
          createdAt: new Date().toISOString()
        });

        // Save Candidate profile
        await storeCandidate({
          id: candidateId,
          ownerId: user.uid,
          resumeId,
          profile: item.profile,
          extractionConfidence: 'High',
          isSample: true,
          createdAt: new Date().toISOString()
        });
        candidateIds.push(candidateId);

        // Compute deterministic match score
        const tfidf = computeSublinearTfIdfCosine(
          `${primaryJob.title} ${primaryJob.description}`,
          item.rawText
        );

        const candSkillNames = (item.profile.skills || []).map((s: any) => typeof s === 'string' ? s : s.name);
        const breakdown = computeDeterministicScore(
          {
            requiredSkills: primaryJob.requirements.requiredSkills,
            preferredSkills: primaryJob.requirements.preferredSkills,
            minYearsExperience: primaryJob.requirements.minYearsExperience,
            educationLevel: primaryJob.requirements.educationLevel
          },
          {
            skills: candSkillNames,
            experience: item.profile.experience,
            education: item.profile.education,
            projects: item.profile.projects,
            certifications: item.profile.certifications
          },
          tfidf.similarity,
          DEFAULT_SCORING_CONFIG
        );

        // Save Screening Result
        await storeResult({
          id: resultId,
          ownerId: user.uid,
          sessionId,
          candidateId,
          score: breakdown.totalScore,
          category: breakdown.category,
          confidence: breakdown.confidence,
          mustHaveMissing: breakdown.mustHaveMissing,
          missingMustHaves: breakdown.missingMustHaves,
          breakdown,
          tfidfSimilarity: tfidf.similarity,
          sharedKeywords: tfidf.sharedTokens,
          explanation: {
            whyThisScore: `Candidate scored ${breakdown.totalScore}/100 with ${breakdown.matchedRequiredSkills.filter(s => s.status === 'Found').length} of ${primaryJob.requirements.requiredSkills.length} required skills verified in text.`,
            whatCouldRaiseConfidence: 'Conduct a technical architecture discussion to verify deep production scaling expertise.'
          },
          reviewStatus: i === 0 ? 'Shortlist' : 'New',
          notes: i === 0 ? 'High potential for Senior Backend role. Strong microservices experience.' : '',
          tags: i === 0 ? ['Top Candidate', 'AWS Expert'] : [],
          history: [
            {
              timestamp: new Date().toISOString(),
              action: `Screened against "${primaryJob.title}"`,
              by: user.displayName || 'Recruiter'
            }
          ],
          createdAt: new Date().toISOString()
        });
      }

      // Save Session record
      await storeSession({
        id: sessionId,
        ownerId: user.uid,
        name: `${primaryJob.title} - Sample Screening Run`,
        jobId: primaryJobId,
        jobSnapshot: {
          ...primaryJob,
          id: primaryJobId,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        scoringConfig: DEFAULT_SCORING_CONFIG,
        scoringVersion: DEFAULT_SCORING_CONFIG.version,
        status: 'Active',
        candidateIds,
        isSample: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast('Sample data loaded! 2 jobs and 3 screened candidates ready for testing.', 'success');
      handleNavigate('rankings');
    } catch (err: any) {
      console.error('Error loading sample data:', err);
      toast(err.message || 'Failed to load sample data', 'error');
    } finally {
      setDemoLoading(false);
    }
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
          onLoadDemoData={handleLoadDemoData}
          demoLoading={demoLoading}
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
