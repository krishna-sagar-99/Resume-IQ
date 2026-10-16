import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Plus,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Copy,
  Edit2,
  X,
  ChevronRight,
  ShieldAlert,
  Save,
  RefreshCw,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { JobDescription } from '../types/index.ts';
import { Skeleton } from '../components/Skeleton.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorState } from '../components/ErrorState.tsx';
import { WordingIssue } from '../utils/biasCheck.ts';
import { fetchJobs as fetchJobsStore, storeJob, removeJob } from '../utils/dataStore.ts';

export const JobsPage: React.FC<{
  initialJobId?: string | null;
  onClearInitialJobId?: () => void;
  onSelectJobForScreening?: (job: JobDescription) => void;
}> = ({ initialJobId, onClearInitialJobId, onSelectJobForScreening }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<JobDescription> | null>(null);
  const [aiExtracting, setAiExtracting] = useState(false);
  const [biasChecking, setBiasChecking] = useState(false);
  const [biasIssues, setBiasIssues] = useState<WordingIssue[]>([]);
  const [saving, setSaving] = useState(false);

  // Skill input helper
  const [newReqSkill, setNewReqSkill] = useState('');
  const [newReqCritical, setNewReqCritical] = useState(false);
  const [newReqMustHave, setNewReqMustHave] = useState(false);
  const [newPrefSkill, setNewPrefSkill] = useState('');

  const fetchJobs = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchJobsStore(user.uid);
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setJobs(list);

      // Check if specific job was requested to open
      if (initialJobId) {
        const target = list.find(j => j.id === initialJobId);
        if (target) {
          openEditor(target);
        }
        if (onClearInitialJobId) onClearInitialJobId();
      }
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const openEditor = (job?: JobDescription) => {
    if (job) {
      setEditingJob({ ...job });
    } else {
      setEditingJob({
        title: '',
        company: user?.company || '',
        description: '',
        status: 'Draft',
        requirements: {
          requiredSkills: [],
          preferredSkills: [],
          minYearsExperience: 2,
          educationLevel: 'bachelor',
          certifications: [],
          additionalCriteria: []
        }
      });
    }
    setBiasIssues([]);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingJob(null);
    setBiasIssues([]);
  };

  // AI Requirement Extraction
  const handleAiExtract = async () => {
    if (!editingJob?.description || editingJob.description.trim().length < 20) {
      toast('Please enter a detailed job description first.', 'error');
      return;
    }

    setAiExtracting(true);
    try {
      const res = await fetch('/api/jobs/extract-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingJob.title,
          description: editingJob.description
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to extract requirements with AI');
      }

      const extracted = await res.json();

      const formattedReqSkills = (extracted.requiredSkills || []).map((s: string) => ({
        name: s,
        isCritical: false,
        isMustHave: false,
        synonyms: []
      }));

      setEditingJob(prev => ({
        ...prev,
        requirements: {
          requiredSkills: formattedReqSkills,
          preferredSkills: extracted.preferredSkills || [],
          minYearsExperience: extracted.minYearsExperience ?? 0,
          educationLevel: extracted.educationLevel || 'none',
          certifications: extracted.certifications || [],
          additionalCriteria: extracted.additionalCriteria || []
        }
      }));

      toast('Requirements extracted! Please review and adjust before marking Ready.', 'success');
      // Also run non-blocking bias check on wording
      handleCheckWording(editingJob.description);
    } catch (err: any) {
      toast(err.message || 'AI requirement extraction failed', 'error');
    } finally {
      setAiExtracting(false);
    }
  };

  // Wording / Bias analysis check
  const handleCheckWording = async (desc?: string) => {
    const textToCheck = desc || editingJob?.description;
    if (!textToCheck || textToCheck.trim().length < 10) return;

    setBiasChecking(true);
    try {
      const res = await fetch('/api/jobs/analyze-wording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: textToCheck })
      });
      if (res.ok) {
        const data = await res.json();
        setBiasIssues(data.issues || []);
      }
    } catch (err) {
      console.warn('Wording check error:', err);
    } finally {
      setBiasChecking(false);
    }
  };

  const handleSaveJob = async () => {
    if (!user || !editingJob) return;
    if (!editingJob.title?.trim()) {
      toast('Please enter a job title', 'error');
      return;
    }
    if (!editingJob.description?.trim()) {
      toast('Please enter a job description', 'error');
      return;
    }

    setSaving(true);
    try {
      const jobId = editingJob.id || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const jobPayload: JobDescription = {
        id: jobId,
        ownerId: user.uid,
        title: editingJob.title.trim(),
        company: editingJob.company?.trim() || user.company || 'Talent Acquisition',
        description: editingJob.description.trim(),
        status: editingJob.status || 'Draft',
        requirements: {
          requiredSkills: editingJob.requirements?.requiredSkills || [],
          preferredSkills: editingJob.requirements?.preferredSkills || [],
          minYearsExperience: Number(editingJob.requirements?.minYearsExperience) || 0,
          educationLevel: editingJob.requirements?.educationLevel || 'none',
          certifications: editingJob.requirements?.certifications || [],
          additionalCriteria: editingJob.requirements?.additionalCriteria || []
        },
        createdAt: editingJob.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await storeJob(jobPayload);
      toast(editingJob.id ? 'Job description updated' : 'Job description created', 'success');
      closeEditor();
      fetchJobs();
    } catch (err: any) {
      console.error('Error saving job:', err);
      toast(err.message || 'Failed to save job description', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job description?')) return;
    try {
      await removeJob(jobId, user!.uid);
      toast('Job description deleted', 'info');
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err: any) {
      toast(err.message || 'Failed to delete job', 'error');
    }
  };

  const handleDuplicateJob = async (job: JobDescription) => {
    if (!user) return;
    try {
      const newId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const duplicated: JobDescription = {
        ...job,
        id: newId,
        title: `${job.title} (Copy)`,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      delete (duplicated as any).isSample;

      await storeJob(duplicated);
      toast('Job duplicated as Draft', 'success');
      fetchJobs();
    } catch (err: any) {
      toast(err.message || 'Failed to duplicate job', 'error');
    }
  };

  const addReqSkill = () => {
    if (!newReqSkill.trim() || !editingJob) return;
    const current = editingJob.requirements?.requiredSkills || [];
    setEditingJob({
      ...editingJob,
      requirements: {
        ...editingJob.requirements!,
        requiredSkills: [
          ...current,
          {
            name: newReqSkill.trim(),
            isCritical: newReqCritical,
            isMustHave: newReqMustHave,
            synonyms: []
          }
        ]
      }
    });
    setNewReqSkill('');
    setNewReqCritical(false);
    setNewReqMustHave(false);
  };

  const removeReqSkill = (index: number) => {
    if (!editingJob?.requirements) return;
    const updated = [...editingJob.requirements.requiredSkills];
    updated.splice(index, 1);
    setEditingJob({
      ...editingJob,
      requirements: { ...editingJob.requirements, requiredSkills: updated }
    });
  };

  const addPrefSkill = () => {
    if (!newPrefSkill.trim() || !editingJob?.requirements) return;
    const current = editingJob.requirements.preferredSkills || [];
    setEditingJob({
      ...editingJob,
      requirements: {
        ...editingJob.requirements,
        preferredSkills: [...current, newPrefSkill.trim()]
      }
    });
    setNewPrefSkill('');
  };

  const removePrefSkill = (index: number) => {
    if (!editingJob?.requirements) return;
    const updated = [...editingJob.requirements.preferredSkills];
    updated.splice(index, 1);
    setEditingJob({
      ...editingJob,
      requirements: { ...editingJob.requirements, preferredSkills: updated }
    });
  };

  const filteredJobs = jobs.filter(j =>
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search job titles or companies..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <button
          onClick={() => openEditor()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Job Description</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchJobs} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No job descriptions yet"
          description="Create your first job description to extract requirements with AI and start matching candidate resumes."
          actionText="Create Job Description"
          onAction={() => openEditor()}
        />
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          No job descriptions matching "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map(job => (
            <div
              key={job.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {job.company}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {job.isSample && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded font-medium">
                        Sample
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        job.status === 'Ready'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed">
                  {job.description}
                </p>

                {/* Key criteria summary */}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span>Required skills:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {job.requirements?.requiredSkills?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Min experience:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {job.requirements?.minYearsExperience ? `${job.requirements.minYearsExperience} yrs` : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Min education:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {job.requirements?.educationLevel ? job.requirements.educationLevel.replace('_', ' ') : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditor(job)}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title="Edit Job"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicateJob(job)}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title="Duplicate Job"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                    title="Delete Job"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {onSelectJobForScreening && (
                  <button
                    onClick={() => onSelectJobForScreening(job)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded transition-colors"
                  >
                    <span>Screen Resumes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Description Editor Modal */}
      {isEditorOpen && editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-lg flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {editingJob.id ? 'Edit Job Description' : 'New Job Description'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill details manually or paste text and click "Extract requirements with AI".
                </p>
              </div>
              <button
                onClick={closeEditor}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingJob.title || ''}
                    onChange={e => setEditingJob({ ...editingJob, title: e.target.value })}
                    placeholder="e.g. Senior Backend Engineer"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={editingJob.company || ''}
                    onChange={e => setEditingJob({ ...editingJob, company: e.target.value })}
                    placeholder="e.g. Apex Cloud Solutions"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Description Text with AI Extraction Action */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Job Description Content *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCheckWording()}
                      disabled={biasChecking}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
                    >
                      {biasChecking ? 'Checking wording...' : 'Check wording bias'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAiExtract}
                      disabled={aiExtracting}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
                    >
                      {aiExtracting ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Extract requirements with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={6}
                  required
                  value={editingJob.description || ''}
                  onChange={e => setEditingJob({ ...editingJob, description: e.target.value })}
                  placeholder="Paste the full job description here..."
                  className="w-full p-3 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              {/* Wording / Bias Check Suggestions (Non-blocking) */}
              {biasIssues.length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs space-y-2">
                  <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Wording Suggestions ({biasIssues.length} potentially exclusionary phrases flagged)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    These are constructive suggestions to broaden the candidate pool. They are suggestions only and will not block job creation.
                  </p>
                  <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto">
                    {biasIssues.map((issue, idx) => (
                      <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded border border-amber-100 dark:border-amber-900/40">
                        <span className="font-semibold text-amber-900 dark:text-amber-200">"{issue.term}"</span>{' '}
                        <span className="text-[10px] text-slate-400">({issue.category})</span>: Try replacing with{' '}
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">{issue.suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Requirements Review Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Structured Requirements Review
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Status:</span>
                    <select
                      value={editingJob.status || 'Draft'}
                      onChange={e => setEditingJob({ ...editingJob, status: e.target.value as any })}
                      className="text-xs px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-medium"
                    >
                      <option value="Draft">Draft (Under Review)</option>
                      <option value="Ready">Ready (Verified for Screening)</option>
                    </select>
                  </div>
                </div>

                {/* Experience & Education inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Minimum Experience (Years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={editingJob.requirements?.minYearsExperience ?? 0}
                      onChange={e =>
                        setEditingJob({
                          ...editingJob,
                          requirements: {
                            ...editingJob.requirements!,
                            minYearsExperience: parseInt(e.target.value, 10) || 0
                          }
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Minimum Education Degree
                    </label>
                    <select
                      value={editingJob.requirements?.educationLevel || 'none'}
                      onChange={e =>
                        setEditingJob({
                          ...editingJob,
                          requirements: {
                            ...editingJob.requirements!,
                            educationLevel: e.target.value as any
                          }
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                    >
                      <option value="none">None / Any Degree</option>
                      <option value="high_school">High School Diploma</option>
                      <option value="associate">Associate Degree</option>
                      <option value="bachelor">Bachelor's Degree</option>
                      <option value="master">Master's Degree</option>
                      <option value="phd">PhD / Doctorate</option>
                    </select>
                  </div>
                </div>

                {/* Required Skills Table */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Required Skills ({editingJob.requirements?.requiredSkills?.length || 0})
                  </label>
                  <div className="space-y-1.5 mb-2.5">
                    {editingJob.requirements?.requiredSkills?.map((skill, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{skill.name}</span>
                          {skill.isCritical && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 rounded text-[10px] font-bold">
                              Critical (2x Weight)
                            </span>
                          )}
                          {skill.isMustHave && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 rounded text-[10px] font-bold">
                              Must-Have Cap
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...editingJob.requirements!.requiredSkills];
                              updated[idx].isCritical = !updated[idx].isCritical;
                              setEditingJob({
                                ...editingJob,
                                requirements: { ...editingJob.requirements!, requiredSkills: updated }
                              });
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                              skill.isCritical
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-white text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {skill.isCritical ? 'Critical' : 'Normal'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...editingJob.requirements!.requiredSkills];
                              updated[idx].isMustHave = !updated[idx].isMustHave;
                              setEditingJob({
                                ...editingJob,
                                requirements: { ...editingJob.requirements!, requiredSkills: updated }
                              });
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                              skill.isMustHave
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-white text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Must-Have
                          </button>
                          <button
                            type="button"
                            onClick={() => removeReqSkill(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Required Skill Form */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add required skill (e.g. Node.js)..."
                      value={newReqSkill}
                      onChange={e => setNewReqSkill(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReqSkill(); } }}
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                    />
                    <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newReqCritical}
                        onChange={e => setNewReqCritical(e.target.checked)}
                        className="rounded"
                      />
                      <span>Critical</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newReqMustHave}
                        onChange={e => setNewReqMustHave(e.target.checked)}
                        className="rounded"
                      />
                      <span>Must-Have</span>
                    </label>
                    <button
                      type="button"
                      onClick={addReqSkill}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded border border-slate-300 dark:border-slate-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Preferred Skills */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Preferred Skills ({editingJob.requirements?.preferredSkills?.length || 0})
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editingJob.requirements?.preferredSkills?.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-xs border border-slate-200 dark:border-slate-700"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => removePrefSkill(idx)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add preferred skill (e.g. Redis)..."
                      value={newPrefSkill}
                      onChange={e => setNewPrefSkill(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPrefSkill(); } }}
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={addPrefSkill}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded border border-slate-300 dark:border-slate-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900">
              <div className="text-xs text-slate-500">
                {editingJob.status === 'Draft' ? (
                  <span className="text-amber-600 font-medium">Draft: Review requirements before screening</span>
                ) : (
                  <span className="text-emerald-600 font-medium">Ready: Verified and ready for matching</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveJob}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Job Description'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
