/**
 * Deterministic Scoring Engine for ResumeIQ.
 * Guarantees 100% reproducible scoring without hallucination.
 * The AI never calculates or alters scores; this pure deterministic module does.
 */

import { matchSkillCredit } from './taxonomy.ts';

export interface ScoringWeights {
  requiredSkills: number;   // default 40
  experience: number;       // default 25
  education: number;        // default 10
  preferredSkills: number;  // default 10
  projects: number;         // default 5
  tfidfSimilarity: number;  // default 10
}

export interface ScoringThresholds {
  strongMatchMin: number;   // default 75
  partialMatchMin: number;  // default 50
}

export interface ScoringConfig {
  version: string;
  weights: ScoringWeights;
  thresholds: ScoringThresholds;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  version: '2026.1',
  weights: {
    requiredSkills: 40,
    experience: 25,
    education: 10,
    preferredSkills: 10,
    projects: 5,
    tfidfSimilarity: 10
  },
  thresholds: {
    strongMatchMin: 75,
    partialMatchMin: 50
  }
};

export interface RequiredSkillSpec {
  name: string;
  isCritical?: boolean;
  isMustHave?: boolean;
}

export interface JobRequirementsInput {
  requiredSkills: Array<string | RequiredSkillSpec>;
  preferredSkills?: string[];
  minYearsExperience?: number;
  educationLevel?: string; // 'none' | 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd'
  certifications?: string[];
}

export interface CandidateProfileInput {
  skills?: string[];
  experience?: Array<{
    title?: string | null;
    company?: string | null;
    startYear?: number | null;
    endYear?: number | 'Present' | string | null;
    years?: number | null;
    summary?: string | null;
  }>;
  education?: Array<{
    degree?: string | null;
    field?: string | null;
    institution?: string | null;
    year?: string | number | null;
  }>;
  projects?: Array<{
    name?: string | null;
    description?: string | null;
  }>;
  certifications?: string[];
  rawTextLength?: number;
  isOcr?: boolean;
}

export interface SkillMatchResult {
  skill: string;
  isCritical: boolean;
  isMustHave: boolean;
  status: 'Found' | 'Related' | 'Not found / unverified';
  matchedSkillName?: string;
  credit: number;
}

export interface ScoreBreakdown {
  requiredSkillsScore: number;    // Points earned out of weight
  experienceScore: number;        // Points earned out of weight
  educationScore: number;         // Points earned out of weight
  preferredSkillsScore: number;   // Points earned out of weight
  projectsScore: number;          // Points earned out of weight
  tfidfScore: number;             // Points earned out of weight
  totalScore: number;             // 0 - 100 rounded
  category: 'Strong Match' | 'Partial Match' | 'Low Match';
  confidence: 'High' | 'Medium' | 'Low';
  mustHaveMissing: boolean;
  missingMustHaves: string[];
  matchedRequiredSkills: SkillMatchResult[];
  matchedPreferredSkills: SkillMatchResult[];
  scoringConfig: ScoringConfig;
}

/**
 * Validate that scoring weights sum exactly to 100 (tolerance +-0.01).
 */
export function validateWeights(weights: ScoringWeights): { valid: boolean; total: number } {
  const sum =
    (weights.requiredSkills || 0) +
    (weights.experience || 0) +
    (weights.education || 0) +
    (weights.preferredSkills || 0) +
    (weights.projects || 0) +
    (weights.tfidfSimilarity || 0);

  const rounded = Math.round(sum * 100) / 100;
  return {
    valid: Math.abs(rounded - 100) < 0.01,
    total: rounded
  };
}

/**
 * Maps common degree text to numeric rank for deterministic comparison:
 * 0: None, 1: High School, 2: Associate, 3: Bachelor, 4: Master, 5: PhD
 */
export function getEducationRank(degreeText?: string | null): number {
  if (!degreeText) return 0;
  const t = degreeText.toLowerCase();
  if (t.includes('phd') || t.includes('doctorate') || t.includes('ph.d')) return 5;
  if (t.includes('master') || t.includes('m.s') || t.includes('ms') || t.includes('mba') || t.includes('m.tech') || t.includes('mtech')) return 4;
  if (t.includes('bachelor') || t.includes('b.s') || t.includes('bs') || t.includes('ba') || t.includes('b.tech') || t.includes('btech')) return 3;
  if (t.includes('associate') || t.includes('diploma')) return 2;
  if (t.includes('high school') || t.includes('secondary')) return 1;
  return 1;
}

/**
 * Calculate total years of experience across timeline items.
 */
export function calculateTotalExperienceYears(experienceList?: CandidateProfileInput['experience']): number {
  if (!experienceList || experienceList.length === 0) return 0;

  let totalYears = 0;
  const currentYear = 2026;

  for (const exp of experienceList) {
    if (typeof exp.years === 'number' && exp.years > 0) {
      totalYears += exp.years;
    } else if (exp.startYear) {
      const end = exp.endYear === 'Present' || !exp.endYear ? currentYear : (typeof exp.endYear === 'number' ? exp.endYear : currentYear);
      const span = Math.max(0.5, end - exp.startYear);
      totalYears += span;
    } else {
      totalYears += 1; // Default fallback for an un-dated role
    }
  }

  return Math.round(totalYears * 10) / 10;
}

/**
 * Pure deterministic score calculation.
 */
export function computeDeterministicScore(
  job: JobRequirementsInput,
  candidate: CandidateProfileInput,
  tfidfSimilarity: number, // 0 to 1
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoreBreakdown {
  const { weights, thresholds } = config;
  const candSkills = candidate.skills || [];

  // 1. Required Skills Matching (40% default)
  // Critical skills count 2x weight in the skill pool
  const rawReqList = job.requiredSkills || [];
  const reqSpecs: RequiredSkillSpec[] = rawReqList.map(item => {
    if (typeof item === 'string') {
      return { name: item, isCritical: false, isMustHave: false };
    }
    return item;
  });

  const matchedRequired: SkillMatchResult[] = [];
  let reqTotalUnits = 0;
  let reqEarnedUnits = 0;
  const missingMustHaves: string[] = [];

  for (const spec of reqSpecs) {
    const unitValue = spec.isCritical ? 2.0 : 1.0;
    reqTotalUnits += unitValue;

    const match = matchSkillCredit(spec.name, candSkills);
    const result: SkillMatchResult = {
      skill: spec.name,
      isCritical: !!spec.isCritical,
      isMustHave: !!spec.isMustHave,
      status: match.status,
      matchedSkillName: match.matchedSkillName,
      credit: match.credit
    };

    reqEarnedUnits += match.credit * unitValue;
    matchedRequired.push(result);

    if (spec.isMustHave && match.status === 'Not found / unverified') {
      missingMustHaves.push(spec.name);
    }
  }

  const reqFraction = reqTotalUnits > 0 ? (reqEarnedUnits / reqTotalUnits) : 1.0;
  const requiredSkillsScore = Math.round(reqFraction * weights.requiredSkills * 100) / 100;

  // 2. Experience Score (25% default)
  const reqYears = job.minYearsExperience || 0;
  const candidateYears = calculateTotalExperienceYears(candidate.experience);
  let expFraction = 1.0;
  if (reqYears > 0) {
    // If candidate has >= required years, 100%. If less, proportional (e.g. 3 of 5 years = 60%)
    expFraction = Math.min(1.0, candidateYears / reqYears);
  } else {
    // No minimum specified: full credit if any experience, 0.7 if empty
    expFraction = candidateYears > 0 ? 1.0 : 0.7;
  }
  const experienceScore = Math.round(expFraction * weights.experience * 100) / 100;

  // 3. Education Score (10% default)
  const targetRank = getEducationRank(job.educationLevel);
  let maxCandRank = 0;
  if (candidate.education && candidate.education.length > 0) {
    for (const edu of candidate.education) {
      const r = getEducationRank(edu.degree);
      if (r > maxCandRank) maxCandRank = r;
    }
  }
  let eduFraction = 1.0;
  if (targetRank > 0) {
    if (maxCandRank >= targetRank) {
      eduFraction = 1.0;
    } else if (maxCandRank === targetRank - 1) {
      eduFraction = 0.75; // e.g. Associate when Bachelor requested
    } else {
      eduFraction = Math.max(0.3, maxCandRank / targetRank);
    }
  } else {
    eduFraction = maxCandRank > 0 ? 1.0 : 0.8;
  }
  const educationScore = Math.round(eduFraction * weights.education * 100) / 100;

  // 4. Preferred Skills & Certs (10% default)
  const prefSkills = job.preferredSkills || [];
  const matchedPreferred: SkillMatchResult[] = [];
  let prefEarned = 0;

  if (prefSkills.length > 0) {
    for (const skill of prefSkills) {
      const match = matchSkillCredit(skill, candSkills);
      matchedPreferred.push({
        skill,
        isCritical: false,
        isMustHave: false,
        status: match.status,
        matchedSkillName: match.matchedSkillName,
        credit: match.credit
      });
      prefEarned += match.credit;
    }
    const prefFraction = prefEarned / prefSkills.length;
    // Certifications bonus
    const candCerts = candidate.certifications || [];
    const certBonus = candCerts.length > 0 ? 0.2 : 0;
    const combinedPrefFraction = Math.min(1.0, prefFraction + certBonus);
    var preferredSkillsScore = Math.round(combinedPrefFraction * weights.preferredSkills * 100) / 100;
  } else {
    // No preferred skills listed: reward any extra skills or certs
    const certBonus = (candidate.certifications?.length || 0) > 0 ? 1.0 : 0.7;
    var preferredSkillsScore = Math.round(certBonus * weights.preferredSkills * 100) / 100;
  }

  // 5. Projects and Evidence (5% default)
  const projectCount = candidate.projects?.length || 0;
  const projectFraction = projectCount >= 2 ? 1.0 : (projectCount === 1 ? 0.75 : 0.4);
  const projectsScore = Math.round(projectFraction * weights.projects * 100) / 100;

  // 6. TF-IDF Cosine Similarity (10% default)
  const clampedTfidf = Math.max(0, Math.min(1, tfidfSimilarity || 0));
  const tfidfScore = Math.round(clampedTfidf * weights.tfidfSimilarity * 100) / 100;

  // Sum total score
  const rawTotal = requiredSkillsScore + experienceScore + educationScore + preferredSkillsScore + projectsScore + tfidfScore;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  // Determine Category based on thresholds
  let category: 'Strong Match' | 'Partial Match' | 'Low Match' = 'Low Match';
  if (totalScore >= thresholds.strongMatchMin) {
    category = 'Strong Match';
  } else if (totalScore >= thresholds.partialMatchMin) {
    category = 'Partial Match';
  } else {
    category = 'Low Match';
  }

  // Must-Have Criteria Cap:
  // "if a must-have is not found, cap the displayed category at Partial Match and show a 'Must-have not found' tag."
  const mustHaveMissing = missingMustHaves.length > 0;
  if (mustHaveMissing && category === 'Strong Match') {
    category = 'Partial Match';
  }

  // Confidence assessment
  let confidence: 'High' | 'Medium' | 'Low' = 'High';
  const textLen = candidate.rawTextLength || 1000;
  if (candidate.isOcr || textLen < 300) {
    confidence = 'Low';
  } else if (textLen < 800 || (candidate.experience?.length || 0) === 0) {
    confidence = 'Medium';
  }

  return {
    requiredSkillsScore,
    experienceScore,
    educationScore,
    preferredSkillsScore,
    projectsScore,
    tfidfScore,
    totalScore,
    category,
    confidence,
    mustHaveMissing,
    missingMustHaves,
    matchedRequiredSkills: matchedRequired,
    matchedPreferredSkills: matchedPreferred,
    scoringConfig: config
  };
}
