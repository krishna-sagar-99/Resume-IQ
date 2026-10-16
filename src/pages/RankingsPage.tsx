import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Download,
  ShieldCheck,
  Columns,
  Undo2,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { JobDescription, ScreeningResult, CandidateProfile } from '../types/index.ts';
import { Skeleton, TableSkeleton } from '../components/Skeleton.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorState } from '../components/ErrorState.tsx';
import { NavPage } from '../components/Sidebar.tsx';
import {
  fetchJobs as fetchJobsStore,
  fetchCandidates as fetchCandidatesStore,
  fetchResults as fetchResultsStore,
  updateResultStatus
} from '../utils/dataStore.ts';

interface CandidateRow {
  result: ScreeningResult;
  candidate?: CandidateProfile;
  jobTitle?: string;
}

export const RankingsPage: React.FC<{
  onNavigate: (page: NavPage, param?: string) => void;
}> = ({ onNavigate }) => {
  const { user, blindReview } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Strong Match' | 'Partial Match' | 'Low Match'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'New' | 'Shortlist' | 'Hold' | 'Reject'>('all');
  const [sortField, setSortField] = useState<'score' | 'name' | 'status'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk selection & comparison
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [jobList, candList, resList] = await Promise.all([
        fetchJobsStore(user.uid),
        fetchCandidatesStore(user.uid),
        fetchResultsStore(user.uid)
      ]);

      const jobMap = new Map<string, string>();
      jobList.forEach(j => jobMap.set(j.id, j.title));

      const candMap = new Map<string, CandidateProfile>();
      candList.forEach(c => candMap.set(c.id, c));

      setJobs(jobList);

      const rowsList: CandidateRow[] = resList.map(res => ({
        result: res,
        candidate: candMap.get(res.candidateId),
        jobTitle: jobMap.get(res.sessionId) || 'Screening Session'
      }));

      setRows(rowsList);
    } catch (err: any) {
      console.error('Failed to load candidate rankings:', err);
      setError(err.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Update Review Status
  const updateCandidateStatus = async (resultId: string, newStatus: 'New' | 'Shortlist' | 'Hold' | 'Reject') => {
    if (!user) return;
    try {
      await updateResultStatus(resultId, user.uid, newStatus);
      setRows(curr =>
        curr.map(r => r.result.id === resultId ? { ...r, result: { ...r.result, reviewStatus: newStatus } } : r)
      );
      toast(`Status changed to ${newStatus}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update status', 'error');
    }
  };

  // Bulk Status Update
  const handleBulkStatus = async (newStatus: 'Shortlist' | 'Hold' | 'Reject') => {
    if (selectedIds.length === 0 || !user) return;
    try {
      for (const id of selectedIds) {
        await updateResultStatus(id, user.uid, newStatus);
      }
      setRows(curr =>
        curr.map(r => selectedIds.includes(r.result.id) ? { ...r, result: { ...r.result, reviewStatus: newStatus } } : r)
      );
      toast(`Updated ${selectedIds.length} candidate(s) to ${newStatus}`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      toast(err.message || 'Bulk update failed', 'error');
    }
  };

  // Filter & Sort
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Job filter
      if (selectedJobId !== 'all') {
        const matchSession = row.result.sessionId?.includes(selectedJobId);
        if (!matchSession) return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && row.result.category !== categoryFilter) {
        return false;
      }
      // Review status filter
      if (statusFilter !== 'all' && row.result.reviewStatus !== statusFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const cand = row.candidate?.profile;
        const name = (cand?.name || '').toLowerCase();
        const skills = (cand?.skills || []).map(s => (typeof s === 'string' ? s : s.name).toLowerCase()).join(' ');
        if (!name.includes(term) && !skills.includes(term)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === 'score') {
        comp = (b.result.score || 0) - (a.result.score || 0);
      } else if (sortField === 'name') {
        const nameA = a.candidate?.profile?.name || '';
        const nameB = b.candidate?.profile?.name || '';
        comp = nameA.localeCompare(nameB);
      } else if (sortField === 'status') {
        comp = (a.result.reviewStatus || '').localeCompare(b.result.reviewStatus || '');
      }
      return sortOrder === 'asc' ? -comp : comp;
    });
  }, [rows, selectedJobId, categoryFilter, statusFilter, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  // Export Filtered Rankings CSV
  const exportRankingsCsv = () => {
    if (filteredRows.length === 0) return;
    try {
      const headers = [
        'Rank',
        'Candidate Name / ID',
        'Email',
        'Job Session',
        'Match Score %',
        'Category',
        'Confidence',
        'Must-Haves Missing',
        'Required Skills Score',
        'Experience Score',
        'Education Score',
        'Preferred Skills Score',
        'TF-IDF %',
        'Review Status'
      ];
      const csvRows = filteredRows.map((r, idx) => {
        const cand = r.candidate?.profile;
        const name = blindReview ? `Candidate ${String(idx + 1).padStart(3, '0')}` : (cand?.name || `Candidate ${r.result.candidateId.slice(0, 6)}`);
        const email = blindReview ? '[MASKED]' : (cand?.email || '');
        return [
          idx + 1,
          `"${name.replace(/"/g, '""')}"`,
          `"${email.replace(/"/g, '""')}"`,
          `"${(r.jobTitle || '').replace(/"/g, '""')}"`,
          r.result.score,
          `"${r.result.category}"`,
          `"${r.result.confidence}"`,
          r.result.mustHaveMissing ? 'Yes' : 'No',
          r.result.breakdown?.requiredSkillsScore ?? 0,
          r.result.breakdown?.experienceScore ?? 0,
          r.result.breakdown?.educationScore ?? 0,
          r.result.breakdown?.preferredSkillsScore ?? 0,
          Math.round((r.result.tfidfSimilarity || 0) * 100),
          `"${r.result.reviewStatus}"`
        ].join(',');
      });
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ResumeIQ_Rankings_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast('Rankings CSV exported successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Export failed', 'error');
    }
  };

  // Toggle compare selection (max 3 candidates)
  const toggleCompare = (resultId: string) => {
    if (compareIds.includes(resultId)) {
      setCompareIds(curr => curr.filter(id => id !== resultId));
    } else {
      if (compareIds.length >= 3) {
        toast('You can compare a maximum of 3 candidates simultaneously.', 'info');
        return;
      }
      setCompareIds(curr => [...curr, resultId]);
    }
  };

  const comparedCandidates = useMemo(() => {
    return compareIds.map(id => rows.find(r => r.result.id === id)).filter(Boolean) as CandidateRow[];
  }, [compareIds, rows]);

  return (
    <div className="space-y-4">
      {/* Permanent Decision Support Notice */}
      <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>
            <strong>Decision Support Notice:</strong> ResumeIQ rankings are algorithmic decision support tools designed to assist human recruiters, not automated hiring or rejection decisions.
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate name, skills..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Job Filter */}
          <select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Jobs</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Match Categories</option>
            <option value="Strong Match">Strong Match (≥75%)</option>
            <option value="Partial Match">Partial Match (50-74%)</option>
            <option value="Low Match">Low Match (&lt;50%)</option>
          </select>

          {/* Review Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Review Statuses</option>
            <option value="New">New</option>
            <option value="Shortlist">Shortlisted</option>
            <option value="Hold">On Hold</option>
            <option value="Reject">Rejected</option>
          </select>
        </div>

        {/* Actions & Compare Drawer Trigger */}
        <div className="flex items-center gap-2">
          {compareIds.length > 0 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Compare Selected ({compareIds.length}/3)</span>
            </button>
          )}

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500">{selectedIds.length} sel:</span>
              <button
                onClick={() => handleBulkStatus('Shortlist')}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded font-medium hover:bg-emerald-100"
              >
                Shortlist
              </button>
              <button
                onClick={() => handleBulkStatus('Hold')}
                className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded font-medium hover:bg-amber-100"
              >
                Hold
              </button>
              <button
                onClick={() => handleBulkStatus('Reject')}
                className="px-2 py-1 bg-red-50 text-red-700 border border-red-300 rounded font-medium hover:bg-red-100"
              >
                Reject
              </button>
            </div>
          )}

          <button
            onClick={exportRankingsCsv}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            title="Export filtered rankings to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          title="No candidates found"
          description={rows.length === 0 ? "You haven't screened any resumes yet. Go to Resume Screening to process candidates." : "No candidates match the current filters or search term."}
          actionText={rows.length === 0 ? "Screen Resumes" : "Reset Filters"}
          onAction={rows.length === 0 ? () => onNavigate('screening') : () => { setSearchTerm(''); setCategoryFilter('all'); setStatusFilter('all'); }}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredRows.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(filteredRows.map(r => r.result.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="py-3 px-3 w-12">Rank</th>
                  <th className="py-3 px-3">Candidate</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                    onClick={() => {
                      if (sortField === 'score') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                      else { setSortField('score'); setSortOrder('desc'); }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Match Score</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Category & Must-Haves</th>
                  <th className="py-3 px-3">Top Matched Skills</th>
                  <th className="py-3 px-3">Not Found / Unverified</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRows.map((row, index) => {
                  const rank = (page - 1) * pageSize + index + 1;
                  const res = row.result;
                  const cand = row.candidate?.profile;

                  const candidateName = blindReview
                    ? `Candidate ${String(rank).padStart(3, '0')}`
                    : (cand?.name || `Candidate ${res.candidateId.slice(0, 6)}`);

                  const matchedSkills = res.breakdown?.matchedRequiredSkills?.filter(s => s.status === 'Found') || [];
                  const notFoundSkills = res.breakdown?.matchedRequiredSkills?.filter(s => s.status === 'Not found / unverified') || [];

                  const isChecked = selectedIds.includes(res.id);
                  const isCompared = compareIds.includes(res.id);

                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) setSelectedIds(curr => [...curr, res.id]);
                            else setSelectedIds(curr => curr.filter(id => id !== res.id));
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-500 dark:text-slate-400">
                        #{rank}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => onNavigate('candidate-details', res.id)}
                          className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-400 hover:underline text-left block"
                        >
                          {candidateName}
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {blindReview ? 'PII Protected' : (cand?.email || 'No email')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {res.score}%
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            res.confidence === 'High'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : res.confidence === 'Medium'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          }`}>
                            {res.confidence} conf.
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            res.category === 'Strong Match'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : res.category === 'Partial Match'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {res.category}
                          </span>
                          {res.mustHaveMissing && (
                            <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                              Must-have not found
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {matchedSkills.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded text-[10px]"
                            >
                              {s.skill}
                            </span>
                          ))}
                          {matchedSkills.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{matchedSkills.length - 3} more
                            </span>
                          )}
                          {matchedSkills.length === 0 && <span className="text-slate-400 text-[10px]">None</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {notFoundSkills.slice(0, 2).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px]"
                              title="Not found in resume (unverified)"
                            >
                              {s.skill}
                            </span>
                          ))}
                          {notFoundSkills.length > 2 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{notFoundSkills.length - 2}
                            </span>
                          )}
                          {notFoundSkills.length === 0 && <span className="text-emerald-600 text-[10px]">All verified</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={res.reviewStatus}
                          onChange={e => updateCandidateStatus(res.id, e.target.value as any)}
                          className={`text-xs px-2 py-1 rounded font-semibold border ${
                            res.reviewStatus === 'Shortlist'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : res.reviewStatus === 'Hold'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                              : res.reviewStatus === 'Reject'
                              ? 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <option value="New">New</option>
                          <option value="Shortlist">Shortlist</option>
                          <option value="Hold">Hold</option>
                          <option value="Reject">Reject</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleCompare(res.id)}
                            className={`p-1.5 rounded transition-colors ${
                              isCompared
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isCompared ? 'Remove from comparison' : 'Add to compare'}
                          >
                            <Columns className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onNavigate('candidate-details', res.id)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            title="View Candidate Full Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} candidates
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side Compare Modal (Up to 3 Candidates) */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Candidate Comparison Matrix ({comparedCandidates.length} Candidates)
                </h3>
                <p className="text-xs text-slate-500">Side-by-side evaluation of requirements, scores, and evidence.</p>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {comparedCandidates.map(({ result, candidate }, idx) => {
                const name = blindReview ? `Candidate 00${idx + 1}` : (candidate?.profile?.name || 'Candidate');
                return (
                  <div key={result.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-800/40 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400">{result.score}%</span>
                        <span className="px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-semibold text-[10px]">
                          {result.category}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                      <p><strong>Required Skills:</strong> {result.breakdown?.requiredSkillsScore} pts</p>
                      <p><strong>Experience:</strong> {result.breakdown?.experienceScore} pts</p>
                      <p><strong>Education:</strong> {result.breakdown?.educationScore} pts</p>
                      <p><strong>TF-IDF Similarity:</strong> {Math.round((result.tfidfSimilarity || 0) * 100)}%</p>
                    </div>

                    <div>
                      <strong className="block text-slate-800 dark:text-slate-200 mb-1">AI Grounded Summary:</strong>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                        "{result.explanation?.whyThisScore}"
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsCompareModalOpen(false);
                        onNavigate('candidate-details', result.id);
                      }}
                      className="w-full py-1.5 text-center text-xs font-medium text-blue-700 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      View Full Profile
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
