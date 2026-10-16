import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  FileText,
  Tag,
  Save,
  RefreshCw,
  Edit3,
  ExternalLink,
  ShieldAlert,
  Building,
  GraduationCap,
  Calendar,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { ScreeningResult, CandidateProfile, ResumeRecord, JobDescription } from '../types/index.ts';
import { Skeleton } from '../components/Skeleton.tsx';
import { ErrorState } from '../components/ErrorState.tsx';
import { NavPage } from '../components/Sidebar.tsx';
import { DEFAULT_SCORING_CONFIG } from '../utils/scoring.ts';
import {
  fetchResults as fetchResultsStore,
  fetchCandidates as fetchCandidatesStore,
  fetchResumes as fetchResumesStore,
  fetchSessions as fetchSessionsStore,
  storeCandidate,
  storeResult,
  updateResultStatus
} from '../utils/dataStore.ts';

export const CandidateDetailsPage: React.FC<{
  resultId: string;
  onNavigate: (page: NavPage, param?: string) => void;
}> = ({ resultId, onNavigate }) => {
  const { user, blindReview } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [resume, setResume] = useState<ResumeRecord | null>(null);
  const [jobSnapshot, setJobSnapshot] = useState<JobDescription | null>(null);

  // Highlighting in raw text viewer
  const [highlightedSnippet, setHighlightedSnippet] = useState<string | null>(null);
  const rawTextRef = useRef<HTMLDivElement>(null);

  // Recruiter notes & tags
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'New' | 'Shortlist' | 'Hold' | 'Reject'>('New');
  const [savingNotes, setSavingNotes] = useState(false);

  // Profile correction modal
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedSkills, setEditedSkills] = useState<string>('');
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const fetchCandidateData = async () => {
      if (!resultId || !user) return;
      setLoading(true);
      setError(null);
      try {
        const [allResults, allCandidates, allResumes, allSessions] = await Promise.all([
          fetchResultsStore(user.uid),
          fetchCandidatesStore(user.uid),
          fetchResumesStore(user.uid),
          fetchSessionsStore(user.uid)
        ]);

        const resData = allResults.find(r => r.id === resultId);
        if (!resData) throw new Error('Screening result not found');

        setResult(resData);
        setNotes(resData.notes || '');
        setTags(resData.tags || []);
        setReviewStatus(resData.reviewStatus || 'New');

        const cData = allCandidates.find(c => c.id === resData.candidateId);
        if (cData) {
          setCandidate(cData);
          const skillNames = (cData.profile?.skills || []).map(s => typeof s === 'string' ? s : s.name);
          setEditedSkills(skillNames.join(', '));

          const resRecord = allResumes.find(r => r.id === cData.resumeId);
          if (resRecord) setResume(resRecord);
        }

        const sess = allSessions.find(s => s.id === resData.sessionId);
        if (sess) {
          setJobSnapshot(sess.jobSnapshot || null);
        }
      } catch (err: any) {
        console.error('Error fetching candidate details:', err);
        setError(err.message || 'Failed to load candidate details');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [resultId, user]);

  // Click on evidence quote highlights text in raw viewer
  const handleQuoteClick = (quote: string) => {
    if (!quote) return;
    setHighlightedSnippet(quote);
    if (rawTextRef.current) {
      // Find element and scroll
      const mark = rawTextRef.current.querySelector('mark');
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleSaveNotesAndStatus = async () => {
    if (!result || !user) return;
    setSavingNotes(true);
    try {
      const historyItem = {
        timestamp: new Date().toISOString(),
        action: `Updated status to "${reviewStatus}" and saved recruiter notes`,
        by: user.displayName || 'Recruiter'
      };

      const updatedResult: ScreeningResult = {
        ...result,
        notes,
        tags,
        reviewStatus,
        history: [...(result.history || []), historyItem]
      };

      await storeResult(updatedResult);
      setResult(updatedResult);
      toast('Notes and review status saved', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    setTags([...tags, newTag.trim()]);
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Re-run matching after profile correction
  const handleRerunMatching = async () => {
    if (!candidate || !result || !jobSnapshot || !user) {
      toast('Cannot re-run: missing job snapshot or candidate data.', 'error');
      return;
    }

    setRecalculating(true);
    try {
      // Parse updated skills
      const skillList = editedSkills.split(',').map(s => s.trim()).filter(Boolean);
      const updatedCandidateProfile: CandidateProfile = {
        ...candidate,
        profile: {
          ...candidate.profile,
          skills: skillList.map(s => ({ name: s, verified: true }))
        },
        isCorrectedByRecruiter: true
      };

      await storeCandidate(updatedCandidateProfile);

      // Call matching endpoint
      const matchRes = await fetch('/api/screening/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: {
            title: jobSnapshot.title,
            description: jobSnapshot.description,
            requiredSkills: jobSnapshot.requirements?.requiredSkills || [],
            preferredSkills: jobSnapshot.requirements?.preferredSkills || [],
            minYearsExperience: jobSnapshot.requirements?.minYearsExperience || 0,
            educationLevel: jobSnapshot.requirements?.educationLevel || 'none'
          },
          candidate: updatedCandidateProfile.profile,
          rawResumeText: resume?.rawText || '',
          scoringConfig: result.breakdown?.scoringConfig || DEFAULT_SCORING_CONFIG
        })
      });

      if (!matchRes.ok) throw new Error('Re-scoring failed');
      const newMatchData = await matchRes.json();

      // Update result document keeping history
      const historyItem = {
        timestamp: new Date().toISOString(),
        action: `Re-calculated score after recruiter manual correction (Old score: ${result.score}%, New score: ${newMatchData.score}%)`,
        by: user?.displayName || 'Recruiter'
      };

      const updatedResult: ScreeningResult = {
        ...result,
        score: newMatchData.score,
        category: newMatchData.category,
        confidence: newMatchData.confidence,
        mustHaveMissing: newMatchData.mustHaveMissing,
        missingMustHaves: newMatchData.missingMustHaves,
        breakdown: newMatchData.breakdown,
        tfidfSimilarity: newMatchData.tfidfSimilarity,
        explanation: newMatchData.explanation,
        history: [...(result.history || []), historyItem]
      };

      await storeResult(updatedResult);
      setResult(updatedResult);
      setCandidate(updatedCandidateProfile);

      setIsEditingProfile(false);
      toast('Candidate profile updated and score re-calculated!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to re-run matching', 'error');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !result || !candidate) {
    return (
      <ErrorState
        message={error || 'Candidate profile could not be loaded.'}
        onRetry={() => onNavigate('rankings')}
      />
    );
  }

  const profile = candidate.profile;
  const candidateName = blindReview ? 'Candidate Protected' : (profile?.name || 'Candidate');
  const candidateEmail = blindReview ? 'Masked under Blind Review' : (profile?.email || 'Not provided');
  const candidateLocation = blindReview ? 'Masked' : (profile?.location || 'Not provided');

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onNavigate('rankings')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Candidate Rankings</span>
        </button>

        <div className="flex items-center gap-2">
          {candidate.isCorrectedByRecruiter && (
            <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded font-semibold border border-blue-200 dark:border-blue-800">
              Corrected by recruiter
            </span>
          )}
          <button
            onClick={() => setIsEditingProfile(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile Data</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile & Evidence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {candidateName}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>{candidateEmail}</span>
                  <span>•</span>
                  <span>{candidateLocation}</span>
                  {profile?.phone && !blindReview && (
                    <>
                      <span>•</span>
                      <span>{profile.phone}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Match Category Badge */}
              <div className="text-right shrink-0">
                <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">
                  {result.score}%
                </div>
                <span className={`inline-block px-2.5 py-0.5 mt-1 rounded text-xs font-semibold ${
                  result.category === 'Strong Match'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : result.category === 'Partial Match'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {result.category}
                </span>
                {result.mustHaveMissing && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                    Capped: Must-have missing
                  </p>
                )}
              </div>
            </div>

            {profile?.summary && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                {profile.summary}
              </p>
            )}
          </div>

          {/* AI Grounded Decision Support Explanation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Grounded Decision Support Analysis
              </h3>
              <span className="text-[10px] uppercase font-bold text-slate-400 ml-auto">
                AI Generated
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Why this score:</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
                  {result.explanation?.whyThisScore || 'Score computed based on required skill coverage and timeline experience.'}
                </p>
              </div>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">What could raise confidence:</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
                  {result.explanation?.whatCouldRaiseConfidence || 'Verify hands-on technical architecture during recruiter screen.'}
                </p>
              </div>
            </div>
          </div>

          {/* Skills with Evidence Quotes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Extracted Skills & Verified Evidence
            </h3>
            <p className="text-xs text-slate-500">
              Click any quote to highlight its exact occurrence in the resume text viewer.
            </p>

            <div className="space-y-2 mt-3">
              {(profile?.skills || []).map((skillItem: any, idx) => {
                const sName = typeof skillItem === 'string' ? skillItem : skillItem.name;
                const quote = typeof skillItem === 'string' ? '' : skillItem.evidenceQuote || '';
                const verified = typeof skillItem === 'string' ? true : skillItem.verified !== false;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{sName}</span>
                      {verified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Quote Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          <span>Quote Unverified</span>
                        </span>
                      )}
                    </div>
                    {quote && (
                      <button
                        type="button"
                        onClick={() => handleQuoteClick(quote)}
                        className="text-left text-[11px] text-slate-600 dark:text-slate-400 italic hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer block w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700/60"
                        title="Click to locate quote in resume viewer"
                      >
                        "{quote}"
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Experience Timeline */}
          {profile?.experience && profile.experience.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>Work Experience Timeline</span>
              </h3>

              <div className="space-y-4 border-l-2 border-slate-200 dark:border-slate-700 pl-4 ml-2">
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className="relative text-xs space-y-1">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-700" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      {exp.title || 'Role'} <span className="text-slate-500 font-normal">at {exp.company || 'Company'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{exp.startYear || 'Start'} - {exp.endYear || 'Present'}</span>
                      {exp.years && <span>({exp.years} yrs)</span>}
                    </p>
                    {exp.summary && (
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                        {exp.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education & Certifications */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Education & Certifications</span>
            </h3>

            <div className="space-y-2 text-xs">
              {(profile?.education || []).map((edu, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{edu.degree || 'Degree'} in {edu.field || 'Field'}</p>
                  <p className="text-[11px] text-slate-500">{edu.institution} {edu.year && `• ${edu.year}`}</p>
                </div>
              ))}
              {(profile?.certifications || []).length > 0 && (
                <div className="pt-2">
                  <strong className="block text-slate-700 dark:text-slate-300 mb-1">Certifications:</strong>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.certifications.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 rounded text-[11px] font-medium border border-blue-200 dark:border-blue-800">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Score Breakdown Math, Notes, & Resume Text Viewer (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Exact Weighted Scoring Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Deterministic Score Breakdown
            </h3>
            <p className="text-[11px] text-slate-500">
              Exact mathematical calculation totaling {result.score}/100.
            </p>

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600 dark:text-slate-400">Required Skills Coverage (40%)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{result.breakdown?.requiredSkillsScore} pts</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600 dark:text-slate-400">Relevant Experience (25%)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{result.breakdown?.experienceScore} pts</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600 dark:text-slate-400">Education & Degrees (10%)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{result.breakdown?.educationScore} pts</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600 dark:text-slate-400">Preferred Skills & Certs (10%)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{result.breakdown?.preferredSkillsScore} pts</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600 dark:text-slate-400">Projects & Evidence (5%)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{result.breakdown?.projectsScore} pts</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600 dark:text-slate-400">TF-IDF Lexical Similarity (10%)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{result.breakdown?.tfidfScore} pts</span>
              </div>
              <div className="flex items-center justify-between pt-2.5 font-bold text-sm text-blue-700 dark:text-blue-400">
                <span>Total Deterministic Score</span>
                <span>{result.score} / 100</span>
              </div>
            </div>
          </div>

          {/* Recruiter Notes & Review Decision */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recruiter Evaluation & Notes
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Review Decision
              </label>
              <select
                value={reviewStatus}
                onChange={e => setReviewStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="New">New (Needs Review)</option>
                <option value="Shortlist">Shortlist for Interview</option>
                <option value="Hold">Put On Hold</option>
                <option value="Reject">Reject</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recruiter Notes & Interview Prep
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add confidential notes, salary requirements, interview topics..."
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tags ({tags.length})
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-medium"
                  >
                    <span>{tag}</span>
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-red-500">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Add tag (e.g. 'Strong communicator')..."
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"
                >
                  Add
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveNotesAndStatus}
              disabled={savingNotes}
              className="w-full py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingNotes ? 'Saving...' : 'Save Decision & Notes'}</span>
            </button>

            {/* Change log */}
            {result.history && result.history.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase mb-2">
                  Audit History Log
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto text-[11px] text-slate-400">
                  {result.history.map((h, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: {h.action} (by {h.by})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Raw Resume Text Viewer with Quote Highlighting */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>Extracted Resume Document</span>
              </h3>
              {highlightedSnippet && (
                <button
                  onClick={() => setHighlightedSnippet(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-700 underline"
                >
                  Clear highlight
                </button>
              )}
            </div>

            <div
              ref={rawTextRef}
              className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap select-text text-slate-700 dark:text-slate-300"
            >
              {resume?.rawText ? (
                highlightedSnippet ? (
                  // Simple text highlighter
                  resume.rawText.split(highlightedSnippet).map((chunk, i, arr) => (
                    <React.Fragment key={i}>
                      {chunk}
                      {i < arr.length - 1 && (
                        <mark className="bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 px-0.5 rounded font-bold">
                          {highlightedSnippet}
                        </mark>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  resume.rawText
                )
              ) : (
                'No raw text available for this candidate resume.'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recruiter Profile Correction Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-lg p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Correct Extracted Skills
            </h3>
            <p className="text-xs text-slate-500">
              Add or remove skills manually. Saving will tag this profile as "Corrected by recruiter" and re-calculate the deterministic score against the job criteria.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Candidate Skills (comma separated)
              </label>
              <textarea
                rows={4}
                value={editedSkills}
                onChange={e => setEditedSkills(e.target.value)}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRerunMatching}
                disabled={recalculating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {recalculating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save & Re-run Matching</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
