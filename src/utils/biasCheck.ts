/**
 * Inclusive Job Wording Checker.
 * Flags gender-coded, age-coded, or exclusionary buzzwords in job descriptions
 * and provides non-blocking constructive suggestions.
 */

export interface WordingIssue {
  term: string;
  category: 'Gender-coded' | 'Age-coded' | 'Exclusionary / Buzzword';
  suggestion: string;
  context: string;
}

const BIAS_PATTERNS: Array<{
  regex: RegExp;
  category: 'Gender-coded' | 'Age-coded' | 'Exclusionary / Buzzword';
  suggestion: string;
}> = [
  // Age-coded
  { regex: /\b(digital native|digital natives)\b/gi, category: 'Age-coded', suggestion: 'technologically adept, proficient in digital workflows' },
  { regex: /\b(young and energetic|young & energetic)\b/gi, category: 'Age-coded', suggestion: 'dynamic, motivated, collaborative' },
  { regex: /\b(recent graduate|fresh graduate|freshers)\b/gi, category: 'Age-coded', suggestion: 'entry-level candidates or foundational skills' },
  { regex: /\b(overqualified)\b/gi, category: 'Age-coded', suggestion: 'specific experience requirements' },
  { regex: /\b(mature)\b/gi, category: 'Age-coded', suggestion: 'experienced, seasoned, or dependable' },

  // Gender-coded (heavily masculine-coded in recruiting studies)
  { regex: /\b(rockstar|ninja|guru|wizard)\b/gi, category: 'Exclusionary / Buzzword', suggestion: 'skilled engineer, high performer, technical specialist' },
  { regex: /\b(dominate|crush it|kill it)\b/gi, category: 'Gender-coded', suggestion: 'excel, achieve key milestones, drive outcomes' },
  { regex: /\b(aggressive|aggressively)\b/gi, category: 'Gender-coded', suggestion: 'proactive, determined, ambitious' },
  { regex: /\b(outspoken)\b/gi, category: 'Gender-coded', suggestion: 'strong communicator, collaborative communicator' },
  { regex: /\b(manpower)\b/gi, category: 'Gender-coded', suggestion: 'workforce, team capacity, personnel' },
  { regex: /\b(he\/she)\b/gi, category: 'Gender-coded', suggestion: 'they, the candidate, the applicant' },

  // Exclusionary buzzwords
  { regex: /\b(work hard play hard)\b/gi, category: 'Exclusionary / Buzzword', suggestion: 'collaborative and supportive team culture' },
  { regex: /\b(hit the ground running)\b/gi, category: 'Exclusionary / Buzzword', suggestion: 'ready to ramp up effectively with onboarding' },
  { regex: /\b(fast-paced environment)\b/gi, category: 'Exclusionary / Buzzword', suggestion: 'iterative, agile, or evolving workflow' }
];

export function analyzeJobWording(description: string): { issues: WordingIssue[]; score: number } {
  if (!description) return { issues: [], score: 100 };

  const issues: WordingIssue[] = [];

  for (const item of BIAS_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(item.regex.source, 'gi');
    while ((match = re.exec(description)) !== null) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(description.length, match.index + match[0].length + 30);
      const context = (start > 0 ? '...' : '') + description.slice(start, end).replace(/\s+/g, ' ') + (end < description.length ? '...' : '');

      issues.push({
        term: match[0],
        category: item.category,
        suggestion: item.suggestion,
        context
      });
      if (issues.length >= 10) break; // Limit findings
    }
  }

  // Inclusive rating score 0 - 100
  const deduction = Math.min(60, issues.length * 15);
  const score = Math.max(40, 100 - deduction);

  return { issues, score };
}
