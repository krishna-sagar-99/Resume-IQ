import React, { useEffect, useState } from 'react';
import {
  History,
  FileSpreadsheet,
  Printer,
  Trash2,
  Edit2,
  Calendar,
  Briefcase,
  Users,
  CheckCircle2,
  ArrowRight,
  Download,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { ScreeningSession, ScreeningResult, CandidateProfile } from '../types/index.ts';
import { Skeleton } from '../components/Skeleton.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorState } from '../components/ErrorState.tsx';
import { NavPage } from '../components/Sidebar.tsx';
import {
  fetchSessions as fetchSessionsStore,
  removeSession as removeSessionStore,
  storeSession,
  fetchResults as fetchResultsStore,
  fetchCandidates as fetchCandidatesStore
} from '../utils/dataStore.ts';

export const HistoryPage: React.FC<{
  onNavigate: (page: NavPage, param?: string) => void;
}> = ({ onNavigate }) => {
  const { user, blindReview } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rename session state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSessionsStore(user.uid);
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSessions(list);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(err.message || 'Failed to load screening history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this screening session and its history?')) return;
    try {
      await removeSessionStore(sessionId, user.uid);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast('Screening session deleted', 'info');
    } catch (err: any) {
      toast(err.message || 'Failed to delete session', 'error');
    }
  };

  const handleSaveRename = async (sessionId: string) => {
    if (!renameValue.trim()) return;
    const target = sessions.find(s => s.id === sessionId);
    if (!target) return;
    try {
      const updated = {
        ...target,
        name: renameValue.trim(),
        updatedAt: new Date().toISOString()
      };
      await storeSession(updated);
      setSessions(prev => prev.map(s => s.id === sessionId ? updated : s));
      setRenamingId(null);
      toast('Session renamed', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to rename session', 'error');
    }
  };

  // Export CSV respecting Blind Review mode
  const exportSessionCsv = async (session: ScreeningSession) => {
    if (!user) return;
    try {
      toast('Generating CSV report...', 'info');

      // Fetch results for this session
      const allResults = await fetchResultsStore(user.uid);
      const results = allResults.filter(r => r.sessionId === session.id);
      results.sort((a, b) => (b.score || 0) - (a.score || 0));

      // Fetch candidate profiles for names if not blind review
      const candMap = new Map<string, CandidateProfile>();
      if (!blindReview) {
        const cands = await fetchCandidatesStore(user.uid);
        cands.forEach(d => candMap.set(d.id, d));
      }

      // Generate CSV lines
      const headers = [
        'Rank',
        'Candidate Identifier',
        'Email',
        'Match Score %',
        'Match Category',
        'Confidence Level',
        'Must-Have Missing',
        'Required Skills Score',
        'Experience Score',
        'Education Score',
        'Preferred Skills Score',
        'TF-IDF Similarity %',
        'Review Decision',
        'Recruiter Notes'
      ];

      const csvRows = results.map((r, idx) => {
        const cand = candMap.get(r.candidateId);
        const name = blindReview ? `Candidate ${String(idx + 1).padStart(3, '0')}` : (cand?.profile?.name || `Candidate ${r.candidateId.slice(0, 6)}`);
        const email = blindReview ? '[MASKED]' : (cand?.profile?.email || '');

        return [
          idx + 1,
          `"${name.replace(/"/g, '""')}"`,
          `"${email.replace(/"/g, '""')}"`,
          r.score,
          `"${r.category}"`,
          `"${r.confidence}"`,
          r.mustHaveMissing ? 'Yes' : 'No',
          r.breakdown?.requiredSkillsScore ?? 0,
          r.breakdown?.experienceScore ?? 0,
          r.breakdown?.educationScore ?? 0,
          r.breakdown?.preferredSkillsScore ?? 0,
          Math.round((r.tfidfSimilarity || 0) * 100),
          `"${r.reviewStatus}"`,
          `"${(r.notes || '').replace(/"/g, '""')}"`
        ].join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ResumeIQ_${session.name.replace(/\s+/g, '_')}_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast('CSV report downloaded successfully', 'success');
    } catch (err: any) {
      console.error('Export CSV error:', err);
      toast(err.message || 'Export failed', 'error');
    }
  };

  // Print-friendly report dialog
  const printSessionReport = (session: ScreeningSession) => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Screening Session Archive
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every screening session stores an immutable snapshot of job requirements and scoring weights for reproducibility.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchSessions} />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No past screening sessions"
          description="Screen a batch of resumes against a job description to automatically generate session archives and downloadable reports."
          actionText="Start Screening"
          onAction={() => onNavigate('screening')}
        />
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div
              key={session.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  {renamingId === session.id ? (
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        className="px-2.5 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                      />
                      <button
                        onClick={() => handleSaveRename(session.id)}
                        className="px-2.5 py-1 text-xs bg-blue-700 text-white rounded font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="px-2 py-1 text-xs text-slate-500 rounded border border-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {session.name}
                      </h3>
                      <button
                        onClick={() => {
                          setRenamingId(session.id);
                          setRenameValue(session.name);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        title="Rename session"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      <span>{session.jobSnapshot?.title || 'Target Job'} ({session.jobSnapshot?.company})</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{session.candidateIds?.length || 0} candidate(s)</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    </span>
                    <span>•</span>
                    <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Scoring v{session.scoringVersion || '2026.1'}
                    </span>
                  </div>
                </div>

                {/* Export & Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => exportSessionCsv(session)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded shadow-xs"
                    title="Export CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => printSessionReport(session)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded shadow-xs"
                    title="Print or save as PDF report"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print PDF</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Job Requirements Snapshot Preview */}
              {session.jobSnapshot?.requirements && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1.5">
                    <strong>Preserved Job Snapshot Requirements:</strong>
                    <span className="text-[11px] text-slate-400">Snapshot remains unchanged even if job is edited</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(session.jobSnapshot.requirements.requiredSkills || []).map((s: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] font-medium"
                      >
                        {typeof s === 'string' ? s : s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
