/**
 * Deterministic NLP Fallback Extractor for Job Requirements and Candidate Profiles.
 * Provides resilient, instant, high-quality structured extraction when cloud API keys
 * are unconfigured, rate-limited, or encounter permission restrictions.
 */

import { SKILL_TAXONOMY, normalizeSkillName } from './taxonomy.ts';

export interface ExtractedJobRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience: number;
  educationLevel: 'none' | 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd';
  certifications: string[];
  additionalCriteria: string[];
}

export function fallbackExtractJobRequirements(
  title: string,
  description: string
): ExtractedJobRequirements {
  const fullText = `${title}\n${description}`.toLowerCase();

  // 1. Extract years of experience
  let minYearsExperience = 0;
  const expPatterns = [
    /(\d+)\+?\s*(?:to\s*\d+)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+professional|\s+relevant)?\s+experience/i,
    /minimum\s*(?:of)?\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /at\s*least\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /experience\s*:\s*(\d+)\+?\s*(?:years?|yrs?)/i
  ];

  for (const pattern of expPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 30) {
        minYearsExperience = parsed;
        break;
      }
    }
  }

  // 2. Extract education level
  let educationLevel: 'none' | 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd' = 'none';
  if (/ph\.?d|doctorate|doctoral/i.test(description)) {
    educationLevel = 'phd';
  } else if (/master(?:'s)?\s*(?:degree)?|m\.?s\.?|m\.?tech|m\.?b\.?a/i.test(description)) {
    educationLevel = 'master';
  } else if (/bachelor(?:'s)?\s*(?:degree)?|b\.?s\.?|b\.?e\.?|b\.?tech|undergraduate/i.test(description)) {
    educationLevel = 'bachelor';
  } else if (/associate(?:'s)?\s*degree/i.test(description)) {
    educationLevel = 'associate';
  } else if (/high\s*school/i.test(description)) {
    educationLevel = 'high_school';
  }

  // 3. Extract skills from text by checking against taxonomy
  const foundSkills: Set<string> = new Set();
  const descLower = description.toLowerCase();

  for (const node of SKILL_TAXONOMY) {
    // Check main name
    const nameRegex = new RegExp(`(^|[^a-zA-Z0-9+#.])${escapeRegex(node.name.toLowerCase())}([^a-zA-Z0-9+#.]|$)`, 'i');
    if (nameRegex.test(descLower) || (title && nameRegex.test(title.toLowerCase()))) {
      foundSkills.add(node.name);
      continue;
    }
    // Check aliases
    for (const alias of node.aliases) {
      const aliasRegex = new RegExp(`(^|[^a-zA-Z0-9+#.])${escapeRegex(alias.toLowerCase())}([^a-zA-Z0-9+#.]|$)`, 'i');
      if (aliasRegex.test(descLower)) {
        foundSkills.add(node.name);
        break;
      }
    }
  }

  const allSkillsList = Array.from(foundSkills);

  // 4. Split into required vs preferred based on text sections
  const preferredSectionMatch = description.match(/(?:preferred|nice\s*to\s*have|bonus|plus|desired|optional)[\s\S]*$/i);
  const preferredText = preferredSectionMatch ? preferredSectionMatch[0].toLowerCase() : '';

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];

  for (const skill of allSkillsList) {
    if (preferredText && preferredText.includes(skill.toLowerCase())) {
      preferredSkills.push(skill);
    } else {
      requiredSkills.push(skill);
    }
  }

  // If no required skills were segregated but some found, make up to top 6 required
  if (requiredSkills.length === 0 && preferredSkills.length > 0) {
    requiredSkills.push(...preferredSkills.splice(0, Math.min(5, preferredSkills.length)));
  }

  // 5. Certifications
  const certs: string[] = [];
  if (/aws\s*cert/i.test(description)) certs.push('AWS Certified');
  if (/pmp/i.test(description)) certs.push('PMP');
  if (/cissp/i.test(description)) certs.push('CISSP');
  if (/azure\s*cert/i.test(description)) certs.push('Azure Certified');
  if (/gcp\s*cert|google\s*cloud\s*cert/i.test(description)) certs.push('Google Cloud Certified');

  return {
    requiredSkills,
    preferredSkills,
    minYearsExperience,
    educationLevel,
    certifications: certs,
    additionalCriteria: []
  };
}

export function fallbackExtractCandidateProfile(rawText: string) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract email
  const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : null;

  // 2. Extract phone
  const phoneMatch = rawText.match(/(?:\+?1[-.\s]*)?\(?[0-9]{3}\)?[-.\s]*[0-9]{3}[-.\s]*[0-9]{4}/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  // 3. Extract name from early non-empty lines (excluding email/phone)
  let name = 'Candidate';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.includes('@') || line.includes('http') || line.length > 50) continue;
    // Strip common labels
    const cleaned = line.replace(/^(resume|cv|curriculum vitae|name\s*:)/i, '').trim();
    if (cleaned.length > 2 && /^[a-zA-Z\s.'-]+$/.test(cleaned)) {
      name = cleaned;
      break;
    }
  }

  // 4. Extract location
  let location: string | null = null;
  const locMatch = rawText.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)/);
  if (locMatch) {
    location = locMatch[1];
  }

  // 5. Extract skills with evidence quotes from rawText
  const extractedSkills: Array<{ name: string; evidenceQuote: string; verified: boolean }> = [];
  const textLower = rawText.toLowerCase();

  for (const node of SKILL_TAXONOMY) {
    let matchedName = '';
    const nameRegex = new RegExp(`(^|[^a-zA-Z0-9+#.])${escapeRegex(node.name.toLowerCase())}([^a-zA-Z0-9+#.]|$)`, 'i');
    if (nameRegex.test(textLower)) {
      matchedName = node.name;
    } else {
      for (const alias of node.aliases) {
        const aliasRegex = new RegExp(`(^|[^a-zA-Z0-9+#.])${escapeRegex(alias.toLowerCase())}([^a-zA-Z0-9+#.]|$)`, 'i');
        if (aliasRegex.test(textLower)) {
          matchedName = node.name;
          break;
        }
      }
    }

    if (matchedName) {
      // Find a sentence or line containing this skill to provide as evidence quote
      let quote = '';
      for (const line of lines) {
        if (line.toLowerCase().includes(matchedName.toLowerCase()) && line.length > 15) {
          quote = line.slice(0, 160);
          break;
        }
      }
      extractedSkills.push({
        name: matchedName,
        evidenceQuote: quote,
        verified: !!quote
      });
    }
  }

  // 6. Extract experience sections
  const experience: Array<{
    title: string;
    company: string;
    startYear?: number;
    endYear?: string;
    years?: number;
    summary?: string;
  }> = [];

  // Match roles with year patterns like "2020 - 2023" or "2021 - Present"
  const roleRegex = /([A-Za-z\s]+)\s*(?:\||at|-)\s*([A-Za-z0-9\s]+)\s*\((20\d\d)\s*[-–]\s*(20\d\d|Present)\)/gi;
  let roleMatch;
  while ((roleMatch = roleRegex.exec(rawText)) !== null) {
    const title = roleMatch[1].trim();
    const company = roleMatch[2].trim();
    const startYear = parseInt(roleMatch[3], 10);
    const endYearStr = roleMatch[4];
    const endYear = endYearStr.toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(endYearStr, 10);
    const years = Math.max(1, endYear - startYear);

    experience.push({
      title,
      company,
      startYear,
      endYear: endYearStr,
      years,
      summary: `Worked as ${title} at ${company}`
    });
  }

  // If no structured role was parsed, check for year mentions to estimate experience
  if (experience.length === 0) {
    const yearsMatch = rawText.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
    const estimatedYears = yearsMatch ? parseInt(yearsMatch[1], 10) : 3;
    experience.push({
      title: 'Software Professional',
      company: 'Industry Experience',
      startYear: new Date().getFullYear() - estimatedYears,
      endYear: 'Present',
      years: estimatedYears,
      summary: 'Professional experience documented in resume'
    });
  }

  // 7. Extract education
  const education: Array<{
    degree: string;
    field: string;
    institution: string;
    year: string;
  }> = [];

  const eduMatch = rawText.match(/(Bachelor|Master|Doctor|Ph\.?D|Associate|B\.?S|M\.?S|B\.?Tech)[^.\n]*?(?:in\s+([A-Za-z\s]+))?[|–-]?\s*([A-Za-z\s]+(?:University|College|Institute)?[^.\n]*?)(?:\((\d{4})\)|(\d{4}))?/i);
  if (eduMatch) {
    education.push({
      degree: eduMatch[1].trim(),
      field: (eduMatch[2] || 'Computer Science').trim(),
      institution: (eduMatch[3] || 'University').trim(),
      year: (eduMatch[4] || eduMatch[5] || '2020').trim()
    });
  }

  return {
    name,
    email,
    phone,
    location,
    summary: lines.find(l => l.length > 50 && !l.includes('@')) || '',
    skills: extractedSkills,
    experience,
    education,
    projects: [],
    certifications: [],
    achievements: []
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
