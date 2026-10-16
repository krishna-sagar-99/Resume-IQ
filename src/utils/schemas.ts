/**
 * Zod schemas for structured profile extraction, job requirements, and validation.
 */
import { z } from 'zod';

export const CandidateExperienceSchema = z.object({
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  startYear: z.number().nullable().optional(),
  endYear: z.union([z.number(), z.literal('Present'), z.string()]).nullable().optional(),
  years: z.number().nullable().optional(),
  summary: z.string().nullable().optional()
});

export const CandidateEducationSchema = z.object({
  degree: z.string().nullable().optional(),
  field: z.string().nullable().optional(),
  institution: z.string().nullable().optional(),
  year: z.union([z.number(), z.string()]).nullable().optional()
});

export const CandidateProjectSchema = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  skillsUsed: z.array(z.string()).default([])
});

export const CandidateSkillItemSchema = z.object({
  name: z.string(),
  evidenceQuote: z.string().nullable().optional()
});

export const CandidateProfileSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.string().nullable().optional()),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  skills: z.array(z.union([z.string(), CandidateSkillItemSchema])).default([]),
  experience: z.array(CandidateExperienceSchema).default([]),
  education: z.array(CandidateEducationSchema).default([]),
  projects: z.array(CandidateProjectSchema).default([]),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([])
});

export type CandidateProfileData = z.infer<typeof CandidateProfileSchema>;

export const RequiredSkillObjectSchema = z.object({
  name: z.string().min(1),
  isCritical: z.boolean().default(false),
  isMustHave: z.boolean().default(false),
  synonyms: z.array(z.string()).default([])
});

export const JobRequirementsSchema = z.object({
  title: z.string().min(1),
  company: z.string().optional().default(''),
  description: z.string().min(1),
  requiredSkills: z.array(z.union([z.string(), RequiredSkillObjectSchema])).default([]),
  preferredSkills: z.array(z.string()).default([]),
  minYearsExperience: z.number().min(0).default(0),
  educationLevel: z.enum(['none', 'high_school', 'associate', 'bachelor', 'master', 'phd']).default('none'),
  certifications: z.array(z.string()).default([]),
  additionalCriteria: z.array(z.string()).default([])
});

export type JobRequirementsData = z.infer<typeof JobRequirementsSchema>;

export const ScoringWeightsSchema = z.object({
  requiredSkills: z.number().min(0).max(100),
  experience: z.number().min(0).max(100),
  education: z.number().min(0).max(100),
  preferredSkills: z.number().min(0).max(100),
  projects: z.number().min(0).max(100),
  tfidfSimilarity: z.number().min(0).max(100)
}).refine(w => {
  const sum = w.requiredSkills + w.experience + w.education + w.preferredSkills + w.projects + w.tfidfSimilarity;
  return Math.abs(sum - 100) < 0.01;
}, {
  message: 'Scoring weights must sum exactly to 100%'
});
