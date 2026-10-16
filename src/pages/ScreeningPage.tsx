import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Play,
  ArrowRight,
  Briefcase,
  AlertTriangle,
  Copy,
  Info,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { JobDescription, ResumeRecord, CandidateProfile, ScreeningSession } from '../types/index.ts';
import { NavPage } from '../components/Sidebar.tsx';
import { DEFAULT_SCORING_CONFIG } from '../utils/scoring.ts';
import {
  fetchJobs as fetchJobsStore,
  fetchResumes as fetchResumesStore,
  storeSession,
  storeResume,
  storeCandidate,
  storeResult
} from '../utils/dataStore.ts';

interface FileUploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'Queued' | 'Uploading' | 'Extracting' | 'Analyzing' | 'Ready' | 'Failed';
  fileHash?: string;
  isDuplicate?: boolean;
  duplicateResumeId?: string;
  extractionMethod?: 'text' | 'ocr';
  textLength?: number;
  rawText?: string;
  extractedProfile?: CandidateProfile['profile'];
  error?: string;
  resultId?: string;
  matchScore?: number;
}

export const ScreeningPage: React.FC<{
  selectedJobId?: string | null;
  onNavigate: (page: NavPage, param?: string) => void;
}> = ({ selectedJobId, onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [existingHashes, setExistingHashes] = useState<Map<string, string>>(new Map()); // hash -> resumeId
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load recruiter's ready jobs and existing resume hashes for duplicate detection
  useEffect(() => {
    if (!user) return;
    const loadPrerequisites = async () => {
      setLoadingJobs(true);
      try {
        // Fetch jobs
        const list = await fetchJobsStore(user.uid);
        setJobs(list);

        if (selectedJobId) {
          const match = list.find(j => j.id === selectedJobId);
          if (match) setSelectedJob(match);
        } else if (list.length > 0) {
          setSelectedJob(list[0]);
        }

        // Fetch existing resume records to populate duplicate hash map
        const existingResumes = await fetchResumesStore(user.uid);
        const hashMap = new Map<string, string>();
        existingResumes.forEach(d => {
          if (d.fileHash) {
            hashMap.set(d.fileHash, d.id);
          }
        });
        setExistingHashes(hashMap);
      } catch (err) {
        console.error('Failed to load prerequisites:', err);
      } finally {
        setLoadingJobs(false);
      }
    };
    loadPrerequisites();
  }, [user, selectedJobId]);

  // Compute SHA-256 in browser via Web Crypto API
  const computeFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileDrop = async (droppedFiles: FileList | File[]) => {
    const newItems: FileUploadItem[] = [];
    const maxCount = 50;

    if (files.length + droppedFiles.length > maxCount) {
      toast(`Maximum ${maxCount} resumes per screening batch.`, 'error');
      return;
    }

    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i];

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast(`File "${file.name}" exceeds 10 MB limit and was skipped.`, 'error');
        continue;
      }

      // Check extension initial check
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast(`File "${file.name}" is not a PDF and was skipped.`, 'error');
        continue;
      }

      const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      try {
        const fileHash = await computeFileHash(file);
        // Check for duplicates in current session queue
        const inSessionDup = files.some(f => f.fileHash === fileHash) || newItems.some(f => f.fileHash === fileHash);
        // Check for duplicates across recruiter's existing resumes
        const existingId = existingHashes.get(fileHash);
        const isDuplicate = inSessionDup || !!existingId;

        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          status: 'Queued',
          fileHash,
          isDuplicate,
          duplicateResumeId: existingId
        });
      } catch (err) {
        console.error('Error hashing file:', err);
      }
    }

    if (newItems.length > 0) {
      setFiles(prev => [...prev, ...newItems]);
      const dupCount = newItems.filter(i => i.isDuplicate).length;
      if (dupCount > 0) {
        toast(`${dupCount} duplicate file(s) detected. You can remove or re-screen them.`, 'info');
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:application/pdf;base64,
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Run screening pipeline on all queued / failed files
  const processAllFiles = async () => {
    if (!user) return;
    if (!selectedJob) {
      toast('Please select a target Job Description first.', 'error');
      return;
    }
    if (files.length === 0) {
      toast('Please add at least one resume PDF to analyze.', 'error');
      return;
    }

    setProcessing(true);

    // Create a new ScreeningSession record snapshotting the job requirements and scoring config
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionPayload: ScreeningSession = {
      id: sessionId,
      ownerId: user.uid,
      name: `${selectedJob.title} - Screening (${new Date().toLocaleDateString()})`,
      jobId: selectedJob.id,
      jobSnapshot: selectedJob,
      scoringConfig: DEFAULT_SCORING_CONFIG,
      scoringVersion: DEFAULT_SCORING_CONFIG.version,
      status: 'Active',
      candidateIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await storeSession(sessionPayload);

    const candidateIdsList: string[] = [];

    // Process each file sequentially or with limited concurrency; failed files NEVER block others
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status === 'Ready') continue; // Already processed

      // Update status to Uploading -> Extracting
      setFiles(curr => curr.map(f => f.id === item.id ? { ...f, status: 'Uploading', error: undefined } : f));

      try {
        const base64Data = await fileToBase64(item.file);

        // Step 1: Server PDF text extraction + real magic bytes signature check
        setFiles(curr => curr.map(f => f.id === item.id ? { ...f, status: 'Extracting' } : f));
        const parseRes = await fetch('/api/resumes/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: item.name
          })
        });

        if (!parseRes.ok) {
          const errData = await parseRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to extract text from PDF');
        }

        const parseResult = await parseRes.json();
        const rawText = parseResult.text;
        const fileHash = parseResult.fileHash || item.fileHash;
        const extractionMethod = parseResult.extractionMethod || 'text';

        // Save ResumeRecord
        const resumeId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const resumeRecord: ResumeRecord = {
          id: resumeId,
          ownerId: user.uid,
          fileName: item.name,
          fileHash,
          status: 'Ready',
          extractionMethod,
          textLength: rawText.length,
          rawText,
          createdAt: new Date().toISOString()
        };
        await storeResume(resumeRecord);

        // Step 2: Structured profile extraction with Gemini & prompt-injection guards
        setFiles(curr => curr.map(f => f.id === item.id ? { ...f, status: 'Analyzing' } : f));
        const profileRes = await fetch('/api/resumes/extract-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText,
            fileHash
          })
        });

        if (!profileRes.ok) {
          const errData = await profileRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to extract structured profile');
        }

        const profileData = await profileRes.json();

        // Save CandidateProfile
        const candidateId = `cand_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const candidateProfile: CandidateProfile = {
          id: candidateId,
          ownerId: user.uid,
          resumeId,
          profile: profileData,
          extractionConfidence: extractionMethod === 'ocr' ? 'Low' : (rawText.length > 800 ? 'High' : 'Medium'),
          createdAt: new Date().toISOString()
        };
        await storeCandidate(candidateProfile);
        candidateIdsList.push(candidateId);

        // Step 3: Match candidate against target job with deterministic scoring & grounded explanation
        const matchRes = await fetch('/api/screening/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job: {
              title: selectedJob.title,
              description: selectedJob.description,
              requiredSkills: selectedJob.requirements?.requiredSkills || [],
              preferredSkills: selectedJob.requirements?.preferredSkills || [],
              minYearsExperience: selectedJob.requirements?.minYearsExperience || 0,
              educationLevel: selectedJob.requirements?.educationLevel || 'none'
            },
            candidate: {
              skills: profileData.skills || [],
              experience: profileData.experience || [],
              education: profileData.education || [],
              projects: profileData.projects || [],
              certifications: profileData.certifications || [],
              isOcr: extractionMethod === 'ocr'
            },
            rawResumeText: rawText,
            scoringConfig: DEFAULT_SCORING_CONFIG
          })
        });

        if (!matchRes.ok) {
          throw new Error('Deterministic score matching failed');
        }

        const matchResultData = await matchRes.json();

        // Save ScreeningResult
        const resultId = `res_${sessionId}_${candidateId}`;
        await storeResult({
          id: resultId,
          ownerId: user.uid,
          sessionId,
          candidateId,
          score: matchResultData.score,
          category: matchResultData.category,
          confidence: matchResultData.confidence,
          mustHaveMissing: matchResultData.mustHaveMissing,
          missingMustHaves: matchResultData.missingMustHaves,
          breakdown: matchResultData.breakdown,
          tfidfSimilarity: matchResultData.tfidfSimilarity,
          sharedKeywords: matchResultData.sharedKeywords,
          explanation: matchResultData.explanation,
          reviewStatus: 'New',
          notes: '',
          tags: [],
          history: [
            {
              timestamp: new Date().toISOString(),
              action: `Screened for job "${selectedJob.title}"`,
              by: user.displayName || 'Recruiter'
            }
          ],
          createdAt: new Date().toISOString()
        });

        // Mark file as Ready with score
        setFiles(curr => curr.map(f =>
          f.id === item.id
            ? {
                ...f,
                status: 'Ready',
                extractionMethod,
                textLength: rawText.length,
                rawText,
                extractedProfile: profileData,
                resultId,
                matchScore: matchResultData.score
              }
            : f
        ));
      } catch (fileErr: any) {
        console.error(`Error processing file ${item.name}:`, fileErr);
        setFiles(curr => curr.map(f =>
          f.id === item.id
            ? {
                ...f,
                status: 'Failed',
                error: fileErr.message || 'Processing failed'
              }
            : f
        ));
      }
    }

    // Update session with candidate list
    if (candidateIdsList.length > 0) {
      await storeSession({ ...sessionPayload, candidateIds: candidateIdsList });
    }

    setProcessing(false);
    toast('Screening batch completed! You can now view candidate rankings.', 'success');
  };

  const readyCount = files.filter(f => f.status === 'Ready').length;
  const failedCount = files.filter(f => f.status === 'Failed').length;

  return (
    <div className="space-y-6">
      {/* Target Job Selector Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Target Job Description
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select the position whose requirements and criteria will evaluate these resumes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loadingJobs ? (
              <span className="text-xs text-slate-400">Loading jobs...</span>
            ) : jobs.length === 0 ? (
              <button
                onClick={() => onNavigate('jobs')}
                className="text-xs text-blue-700 dark:text-blue-400 font-medium underline"
              >
                Create a job description first
              </button>
            ) : (
              <select
                value={selectedJob?.id || ''}
                onChange={e => {
                  const found = jobs.find(j => j.id === e.target.value);
                  setSelectedJob(found || null);
                }}
                className="text-sm px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.company}) - {j.status}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {selectedJob && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>
              Required skills: <strong className="text-slate-800 dark:text-slate-200">{selectedJob.requirements?.requiredSkills?.length || 0}</strong>
            </span>
            <span>
              Min experience: <strong className="text-slate-800 dark:text-slate-200">{selectedJob.requirements?.minYearsExperience ? `${selectedJob.requirements.minYearsExperience} yrs` : 'None'}</strong>
            </span>
            <span>
              Education: <strong className="text-slate-800 dark:text-slate-200 capitalize">{selectedJob.requirements?.educationLevel || 'Any'}</strong>
            </span>
            {selectedJob.status === 'Draft' && (
              <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Job is in Draft mode. Requirements review recommended.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            handleFileDrop(e.dataTransfer.files);
          }
        }}
        className={`border-2 border-dashed rounded p-8 sm:p-12 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={e => {
            if (e.target.files) {
              handleFileDrop(e.target.files);
            }
          }}
        />
        <div className="w-12 h-12 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400 mx-auto mb-3">
          <UploadCloud className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Upload Candidate Resumes (PDF)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-3">
          Drag and drop PDF files here, or click to browse. Real file signature verification, SHA-256 duplicate detection, and OCR fallback are applied.
        </p>
        <span className="text-[11px] font-medium text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded">
          Max 10 MB per PDF • Up to 50 files per session
        </span>
      </div>

      {/* File Queue List */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Queue ({files.length} files)
              </h3>
              <p className="text-xs text-slate-500">
                {readyCount} ready • {failedCount} failed • {files.length - readyCount - failedCount} pending
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiles([])}
                disabled={processing}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              >
                Clear Queue
              </button>
              <button
                type="button"
                onClick={processAllFiles}
                disabled={processing || !selectedJob}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Analyze & Score Resumes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map(item => (
              <div
                key={item.id}
                className={`p-3 rounded border text-xs flex items-center justify-between gap-4 transition-colors ${
                  item.status === 'Ready'
                    ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60'
                    : item.status === 'Failed'
                    ? 'bg-red-50/40 border-red-200 dark:bg-red-950/20 dark:border-red-800/60'
                    : item.status === 'Queued'
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    : 'bg-blue-50/40 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {item.status === 'Ready' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                    {item.status === 'Failed' && <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                    {['Uploading', 'Extracting', 'Analyzing'].includes(item.status) && (
                      <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                    )}
                    {item.status === 'Queued' && <FileText className="w-4 h-4 text-slate-400" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      {item.isDuplicate && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded font-semibold">
                          Duplicate Hash
                        </span>
                      )}
                      {item.extractionMethod === 'ocr' && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold">
                          OCR-assisted
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(item.size / 1024).toFixed(1)} KB • Status: {item.status}
                      {item.error && <span className="text-red-600 dark:text-red-400 ml-1">({item.error})</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'Ready' && typeof item.matchScore === 'number' && (
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                      {item.matchScore}%
                    </span>
                  )}

                  {item.status === 'Failed' ? (
                    <button
                      type="button"
                      onClick={() => setFiles(curr => curr.map(f => f.id === item.id ? { ...f, status: 'Queued', error: undefined } : f))}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50"
                    >
                      Retry
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => removeFile(item.id)}
                    disabled={processing && ['Uploading', 'Extracting', 'Analyzing'].includes(item.status)}
                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-40"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {readyCount > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate('rankings')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors"
              >
                <span>View Candidate Rankings ({readyCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
