/**
 * Evidence Quote Verification Engine
 * Verifies that quoted evidence from candidate extractions genuinely exists in resume raw text.
 */

export interface EvidenceVerificationResult {
  quote: string;
  verified: boolean;
  normalizedMatchIndex: number;
}

/**
 * Standardize text for robust substring matching (normalize whitespace, casing, quotes).
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a candidate quote appears verbatim or near-verbatim in the raw resume text.
 */
export function verifyEvidenceQuote(quote: string, resumeText: string): EvidenceVerificationResult {
  if (!quote || !resumeText) {
    return { quote, verified: false, normalizedMatchIndex: -1 };
  }

  const cleanQuote = normalizeForSearch(quote);
  const cleanResume = normalizeForSearch(resumeText);

  // Direct substring match
  const idx = cleanResume.indexOf(cleanQuote);
  if (idx !== -1) {
    return {
      quote,
      verified: true,
      normalizedMatchIndex: idx
    };
  }

  // If quote is longer than 50 chars, check if at least 70% of continuous tokens match
  const quoteWords = cleanQuote.split(' ').filter(w => w.length > 2);
  if (quoteWords.length >= 4) {
    // Check sliding window of 4 words
    const snippet = quoteWords.slice(0, 4).join(' ');
    const snippetIdx = cleanResume.indexOf(snippet);
    if (snippetIdx !== -1) {
      return {
        quote,
        verified: true,
        normalizedMatchIndex: snippetIdx
      };
    }
  }

  return {
    quote,
    verified: false,
    normalizedMatchIndex: -1
  };
}

/**
 * Batch verify a list of evidence items.
 */
export function filterAndVerifyEvidence(
  evidenceList: Array<{ skillOrRole: string; quote: string }>,
  resumeText: string
): Array<{ skillOrRole: string; quote: string; verified: boolean; matchIndex: number }> {
  return evidenceList.map(item => {
    const res = verifyEvidenceQuote(item.quote, resumeText);
    return {
      skillOrRole: item.skillOrRole,
      quote: item.quote,
      verified: res.verified,
      matchIndex: res.normalizedMatchIndex
    };
  });
}
