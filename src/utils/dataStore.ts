/**
 * Resilient Data Store Adapter for ResumeIQ.
 * Seamlessly interfaces with Cloud Firestore when authenticated with Firebase,
 * and provides persistent local storage fallback when in Demo Recruiter Mode
 * or when external Firebase console auth providers are awaiting toggle.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase.ts';
import {
  JobDescription,
  ResumeRecord,
  CandidateProfile,
  ScreeningSession,
  ScreeningResult
} from '../types/index.ts';

// Local storage keys
const KEY_JOBS = 'resumeiq_store_jobs';
const KEY_RESUMES = 'resumeiq_store_resumes';
const KEY_CANDIDATES = 'resumeiq_store_candidates';
const KEY_SESSIONS = 'resumeiq_store_sessions';
const KEY_RESULTS = 'resumeiq_store_results';

function getLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocal<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {}
}

const isDemoUser = (userId: string) => userId.startsWith('recruiter_demo_') || !auth.currentUser;

// --- JOBS ---
export async function fetchJobs(userId: string): Promise<JobDescription[]> {
  if (isDemoUser(userId)) {
    return getLocal<JobDescription>(KEY_JOBS).filter(j => j.ownerId === userId);
  }
  try {
    const q = query(collection(db, 'jobs'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    const list: JobDescription[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as JobDescription));
    return list;
  } catch (err) {
    console.warn('Falling back to local jobs storage:', err);
    return getLocal<JobDescription>(KEY_JOBS).filter(j => j.ownerId === userId);
  }
}

export async function storeJob(job: JobDescription): Promise<void> {
  // Always update local cache
  const local = getLocal<JobDescription>(KEY_JOBS);
  const idx = local.findIndex(j => j.id === job.id);
  if (idx !== -1) local[idx] = job;
  else local.push(job);
  setLocal(KEY_JOBS, local);

  if (!isDemoUser(job.ownerId)) {
    try {
      await setDoc(doc(db, 'jobs', job.id), job);
    } catch (err) {
      console.warn('Firestore job write skipped/failed:', err);
    }
  }
}

export async function removeJob(jobId: string, userId: string): Promise<void> {
  const local = getLocal<JobDescription>(KEY_JOBS).filter(j => j.id !== jobId);
  setLocal(KEY_JOBS, local);

  if (!isDemoUser(userId)) {
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
    } catch (err) {}
  }
}

// --- RESUMES ---
export async function fetchResumes(userId: string): Promise<ResumeRecord[]> {
  if (isDemoUser(userId)) {
    return getLocal<ResumeRecord>(KEY_RESUMES).filter(r => r.ownerId === userId);
  }
  try {
    const q = query(collection(db, 'resumes'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    const list: ResumeRecord[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as ResumeRecord));
    return list;
  } catch (err) {
    return getLocal<ResumeRecord>(KEY_RESUMES).filter(r => r.ownerId === userId);
  }
}

export async function storeResume(resume: ResumeRecord): Promise<void> {
  const local = getLocal<ResumeRecord>(KEY_RESUMES);
  const idx = local.findIndex(r => r.id === resume.id);
  if (idx !== -1) local[idx] = resume;
  else local.push(resume);
  setLocal(KEY_RESUMES, local);

  if (!isDemoUser(resume.ownerId)) {
    try {
      await setDoc(doc(db, 'resumes', resume.id), resume);
    } catch (err) {}
  }
}

// --- CANDIDATES ---
export async function fetchCandidates(userId: string): Promise<CandidateProfile[]> {
  if (isDemoUser(userId)) {
    return getLocal<CandidateProfile>(KEY_CANDIDATES).filter(c => c.ownerId === userId);
  }
  try {
    const q = query(collection(db, 'candidates'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    const list: CandidateProfile[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as CandidateProfile));
    return list;
  } catch (err) {
    return getLocal<CandidateProfile>(KEY_CANDIDATES).filter(c => c.ownerId === userId);
  }
}

export async function storeCandidate(candidate: CandidateProfile): Promise<void> {
  const local = getLocal<CandidateProfile>(KEY_CANDIDATES);
  const idx = local.findIndex(c => c.id === candidate.id);
  if (idx !== -1) local[idx] = candidate;
  else local.push(candidate);
  setLocal(KEY_CANDIDATES, local);

  if (!isDemoUser(candidate.ownerId)) {
    try {
      await setDoc(doc(db, 'candidates', candidate.id), candidate);
    } catch (err) {}
  }
}

// --- SESSIONS ---
export async function fetchSessions(userId: string): Promise<ScreeningSession[]> {
  if (isDemoUser(userId)) {
    return getLocal<ScreeningSession>(KEY_SESSIONS).filter(s => s.ownerId === userId);
  }
  try {
    const q = query(collection(db, 'sessions'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    const list: ScreeningSession[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as ScreeningSession));
    return list;
  } catch (err) {
    return getLocal<ScreeningSession>(KEY_SESSIONS).filter(s => s.ownerId === userId);
  }
}

export async function storeSession(session: ScreeningSession): Promise<void> {
  const local = getLocal<ScreeningSession>(KEY_SESSIONS);
  const idx = local.findIndex(s => s.id === session.id);
  if (idx !== -1) local[idx] = session;
  else local.push(session);
  setLocal(KEY_SESSIONS, local);

  if (!isDemoUser(session.ownerId)) {
    try {
      await setDoc(doc(db, 'sessions', session.id), session);
    } catch (err) {}
  }
}

export async function removeSession(sessionId: string, userId: string): Promise<void> {
  const local = getLocal<ScreeningSession>(KEY_SESSIONS).filter(s => s.id !== sessionId);
  setLocal(KEY_SESSIONS, local);

  if (!isDemoUser(userId)) {
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
    } catch (err) {}
  }
}

// --- RESULTS ---
export async function fetchResults(userId: string): Promise<ScreeningResult[]> {
  if (isDemoUser(userId)) {
    return getLocal<ScreeningResult>(KEY_RESULTS).filter(r => r.ownerId === userId);
  }
  try {
    const q = query(collection(db, 'results'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    const list: ScreeningResult[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as ScreeningResult));
    return list;
  } catch (err) {
    return getLocal<ScreeningResult>(KEY_RESULTS).filter(r => r.ownerId === userId);
  }
}

export async function storeResult(result: ScreeningResult): Promise<void> {
  const local = getLocal<ScreeningResult>(KEY_RESULTS);
  const idx = local.findIndex(r => r.id === result.id);
  if (idx !== -1) local[idx] = result;
  else local.push(result);
  setLocal(KEY_RESULTS, local);

  if (!isDemoUser(result.ownerId)) {
    try {
      await setDoc(doc(db, 'results', result.id), result);
    } catch (err) {}
  }
}

export async function updateResultStatus(
  resultId: string,
  userId: string,
  reviewStatus: 'New' | 'Shortlist' | 'Hold' | 'Reject',
  notes?: string,
  tags?: string[]
): Promise<void> {
  const local = getLocal<ScreeningResult>(KEY_RESULTS);
  const idx = local.findIndex(r => r.id === resultId);
  if (idx !== -1) {
    local[idx].reviewStatus = reviewStatus;
    if (notes !== undefined) local[idx].notes = notes;
    if (tags !== undefined) local[idx].tags = tags;
    setLocal(KEY_RESULTS, local);
  }

  if (!isDemoUser(userId)) {
    try {
      const updateData: any = { reviewStatus };
      if (notes !== undefined) updateData.notes = notes;
      if (tags !== undefined) updateData.tags = tags;
      await updateDoc(doc(db, 'results', resultId), updateData);
    } catch (err) {}
  }
}

export async function wipeAllData(userId: string): Promise<void> {
  // Wipe local
  setLocal(KEY_JOBS, getLocal<JobDescription>(KEY_JOBS).filter(j => j.ownerId !== userId));
  setLocal(KEY_RESUMES, getLocal<ResumeRecord>(KEY_RESUMES).filter(r => r.ownerId !== userId));
  setLocal(KEY_CANDIDATES, getLocal<CandidateProfile>(KEY_CANDIDATES).filter(c => c.ownerId !== userId));
  setLocal(KEY_SESSIONS, getLocal<ScreeningSession>(KEY_SESSIONS).filter(s => s.ownerId !== userId));
  setLocal(KEY_RESULTS, getLocal<ScreeningResult>(KEY_RESULTS).filter(r => r.ownerId !== userId));

  // Wipe Firestore
  if (!isDemoUser(userId)) {
    const collectionsToWipe = ['jobs', 'resumes', 'candidates', 'sessions', 'results'];
    for (const colName of collectionsToWipe) {
      try {
        const snap = await getDocs(query(collection(db, colName), where('ownerId', '==', userId)));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, colName, d.id))));
      } catch (err) {}
    }
  }
}
