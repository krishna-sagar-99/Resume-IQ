import { ScoringConfig } from '../utils/scoring.ts';

export type UserRole = 'recruiter' | 'admin';

export interface RecruiterUser {
  uid: string;
  email: string;
  displayName: string;
  company: string;
  theme?: 'light' | 'dark';
  createdAt?: string;
}

export interface JobDescription {
  id: string;
  ownerId: string;
  title: string;
  company: string;
  description: string;
  status: 'Draft' | 'Ready';
  requirements: {
    requiredSkills: Array<{
      name: string;
      isCritical?: boolean;
      isMustHave?: boolean;
      synonyms?: string[];
    }>;
    preferredSkills: string[];
    minYearsExperience: number;
    educationLevel: 'none' | 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd';
    certifications: string[];
    additionalCriteria?: string[];
  };
  createdAt: string;
  updatedAt: string;
  isSample?: boolean;
}

export interface ResumeRecord {
  id: string;
  ownerId: string;
  fileName: string;
  fileHash: string;
  storagePath?: string;
  status: 'Queued' | 'Extracting' | 'Ready' | 'Failed';
  extractionMethod: 'text' | 'ocr';
  textLength: number;
  rawText?: string;
  createdAt: string;
  error?: string;
  isSample?: boolean;
}

export interface CandidateProfile {
  id: string;
  ownerId: string;
  resumeId: string;
  profile: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    summary?: string | null;
    skills: Array<{
      name: string;
      evidenceQuote?: string | null;
      verified?: boolean;
      matchIndex?: number;
    }>;
    experience: Array<{
      title?: string | null;
      company?: string | null;
      startYear?: number | null;
      endYear?: string | number | null;
      years?: number | null;
      summary?: string | null;
    }>;
    education: Array<{
      degree?: string | null;
      field?: string | null;
      institution?: string | null;
      year?: string | number | null;
    }>;
    projects: Array<{
      name?: string | null;
      description?: string | null;
      skillsUsed?: string[];
    }>;
    certifications: string[];
    achievements: string[];
  };
  corrections?: Record<string, any>;
  isCorrectedByRecruiter?: boolean;
  extractionConfidence: 'High' | 'Medium' | 'Low';
  createdAt: string;
  isSample?: boolean;
}

export interface ScreeningSession {
  id: string;
  ownerId: string;
  name: string;
  jobId: string;
  jobSnapshot: JobDescription;
  scoringConfig: ScoringConfig;
  scoringVersion: string;
  status: 'Active' | 'Completed' | 'Archived';
  candidateIds: string[];
  createdAt: string;
  updatedAt: string;
  isSample?: boolean;
}

export interface ScreeningResult {
  id: string;
  ownerId: string;
  sessionId: string;
  candidateId: string;
  score: number;
  category: 'Strong Match' | 'Partial Match' | 'Low Match';
  confidence: 'High' | 'Medium' | 'Low';
  mustHaveMissing: boolean;
  missingMustHaves: string[];
  breakdown: {
    requiredSkillsScore: number;
    experienceScore: number;
    educationScore: number;
    preferredSkillsScore: number;
    projectsScore: number;
    tfidfScore: number;
    totalScore: number;
    matchedRequiredSkills: Array<{
      skill: string;
      isCritical: boolean;
      isMustHave: boolean;
      status: 'Found' | 'Related' | 'Not found / unverified';
      matchedSkillName?: string;
      credit: number;
    }>;
    matchedPreferredSkills: Array<{
      skill: string;
      isCritical: boolean;
      isMustHave: boolean;
      status: 'Found' | 'Related' | 'Not found / unverified';
      matchedSkillName?: string;
      credit: number;
    }>;
    scoringConfig?: ScoringConfig;
  };
  tfidfSimilarity: number;
  sharedKeywords?: string[];
  explanation: {
    whyThisScore: string;
    whatCouldRaiseConfidence: string;
  };
  reviewStatus: 'New' | 'Shortlist' | 'Hold' | 'Reject';
  notes: string;
  tags: string[];
  history: Array<{
    timestamp: string;
    action: string;
    by: string;
  }>;
  createdAt: string;
}
