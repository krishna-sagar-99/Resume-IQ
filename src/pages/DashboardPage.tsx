import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  FileText,
  Users,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Skeleton, CardSkeleton } from '../components/Skeleton.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorState } from '../components/ErrorState.tsx';
import { JobDescription, ScreeningSession, ScreeningResult, CandidateProfile } from '../types/index.ts';
import { NavPage } from '../components/Sidebar.tsx';
import {
  fetchJobs,
  fetchResumes,
  fetchCandidates,
  fetchSessions,
  fetchResults
} from '../utils/dataStore.ts';

interface DashboardStats {
  jobsCount: number;
  resumesCount: number;
  candidatesCount: number;
  shortlistedCount: number;
}

export const DashboardPage: React.FC<{
  onNavigate: (page: NavPage, param?: string) => void;
  onOpenCreateJob: () => void;
}> = ({ onNavigate, onOpenCreateJob }) => {
  const { user, blindReview } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobDescription[]>([]);
  const [recentSessions, setRecentSessions] = useState<ScreeningSession[]>([]);
  const [topCandidates, setTopCandidates] = useState<Array<{ result: ScreeningResult; candidate?: CandidateProfile }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [jobsList, resumesList, candidatesList, sessionsList, resultsList] = await Promise.all([
        fetchJobs(user.uid),
        fetchResumes(user.uid),
        fetchCandidates(user.uid),
        fetchSessions(user.uid),
        fetchResults(user.uid)
      ]);

      // Sort jobs by createdAt desc
      jobsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRecentJobs(jobsList.slice(0, 4));

      // Candidates map
      const candidatesMap = new Map<string, CandidateProfile>();
      candidatesList.forEach(c => candidatesMap.set(c.id, c));

      // Sessions
      sessionsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRecentSessions(sessionsList.slice(0, 4));

      // Shortlisted count
      const shortlisted = resultsList.filter(r => r.reviewStatus === 'Shortlist').length;

      // Top scored candidates
      resultsList.sort((a, b) => (b.score || 0) - (a.score || 0));
      const topItems = resultsList.slice(0, 5).map(res => ({
        result: res,
        candidate: candidatesMap.get(res.candidateId)
      }));
      setTopCandidates(topItems);

      setStats({
        jobsCount: jobsList.length,
        resumesCount: resumesList.length,
        candidatesCount: candidatesList.length,
        shortlistedCount: shortlisted
      });
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const hasData = stats && (stats.jobsCount > 0 || stats.resumesCount > 0 || stats.candidatesCount > 0);

  return (
    <div className="space-y-6">
      {/* Stat Cards - Real Data Only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Job Descriptions</span>
            <Briefcase className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.jobsCount ?? 0}</p>
          <span className="text-[11px] text-slate-400">Target roles defined</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Resumes Processed</span>
            <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.resumesCount ?? 0}</p>
          <span className="text-[11px] text-slate-400">PDFs parsed & indexed</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Candidates Analyzed</span>
            <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.candidatesCount ?? 0}</p>
          <span className="text-[11px] text-slate-400">Profiles scored</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Shortlisted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.shortlistedCount ?? 0}</p>
          <span className="text-[11px] text-slate-400">High match decisions</span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Recruiting Workflow
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fast actions to start screening candidates or setup new positions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onOpenCreateJob}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Job Description</span>
          </button>
          <button
            onClick={() => onNavigate('screening')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Analyze Resumes</span>
          </button>
          <button
            onClick={() => onNavigate('rankings')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <Users className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>View Candidates</span>
          </button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          title="No screening activity yet"
          description="Create your first job description or upload resume PDFs to start deterministic matching and candidate ranking."
          actionText="Create Job Description"
          onAction={onOpenCreateJob}
          secondaryActionText="Upload Resumes"
          onSecondaryAction={() => onNavigate('screening')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Jobs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>Recent Job Postings</span>
              </h3>
              <button
                onClick={() => onNavigate('jobs')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No jobs created yet.</p>
            ) : (
              <div className="space-y-2.5">
                {recentJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => onNavigate('jobs', job.id)}
                    className="p-3 border border-slate-100 dark:border-slate-800 rounded hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          {job.title}
                        </span>
                        {job.isSample && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded font-medium">
                            Sample
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          job.status === 'Ready'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {job.company} • {job.requirements?.requiredSkills?.length || 0} required skills
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Ranked Candidates */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>Top Matched Candidates</span>
              </h3>
              <button
                onClick={() => onNavigate('rankings')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View rankings <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {topCandidates.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No screened candidates yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topCandidates.map(({ result, candidate }, idx) => {
                  const candidateDisplayName = blindReview
                    ? `Candidate ${String(idx + 1).padStart(3, '0')}`
                    : (candidate?.profile?.name || `Candidate ${result.candidateId.slice(0, 6)}`);

                  return (
                    <div
                      key={result.id}
                      onClick={() => onNavigate('candidate-details', result.id)}
                      className="p-3 border border-slate-100 dark:border-slate-800 rounded hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                            {candidateDisplayName}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            result.category === 'Strong Match'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : result.category === 'Partial Match'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {result.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Match: {result.score}% • Status: {result.reviewStatus}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {result.score}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
