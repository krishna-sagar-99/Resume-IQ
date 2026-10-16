/**
 * Pure TypeScript NLP Preprocessing and Sublinear TF-IDF Cosine Similarity Engine.
 * Designed to preserve critical programming tokens like "c++", "c#", ".net", "node.js".
 */

// Standard English stopwords list
export const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'don\'t', 'down', 'during', 'each', 'few',
  'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenize and normalize text while explicitly preserving tech tokens like:
 * 'c++', 'c#', '.net', 'asp.net', 'node.js', 'vue.js', 'next.js', 'react.js'
 */
export function tokenizeAndClean(text: string): string[] {
  if (!text) return [];

  // Unicode normalize NFKC and lowercase
  let normalized = text.normalize('NFKC').toLowerCase();

  // Replace special compound tech tokens with safe placeholders
  const specialTokens: Array<{ regex: RegExp; placeholder: string; token: string }> = [
    { regex: /(^|[\s,;:(])c\+\+([\s,;:.)]|$)/gi, placeholder: '__special_cpp__', token: 'c++' },
    { regex: /(^|[\s,;:(])c#([\s,;:.)]|$)/gi, placeholder: '__special_csharp__', token: 'c#' },
    { regex: /(^|[\s,;:(])\.net([\s,;:.)]|$)/gi, placeholder: '__special_dotnet__', token: '.net' },
    { regex: /(^|[\s,;:(])asp\.net([\s,;:.)]|$)/gi, placeholder: '__special_aspdotnet__', token: 'asp.net' },
    { regex: /(^|[\s,;:(])node\.js([\s,;:.)]|$)/gi, placeholder: '__special_nodejs__', token: 'node.js' },
    { regex: /(^|[\s,;:(])vue\.js([\s,;:.)]|$)/gi, placeholder: '__special_vuejs__', token: 'vue.js' },
    { regex: /(^|[\s,;:(])next\.js([\s,;:.)]|$)/gi, placeholder: '__special_nextjs__', token: 'next.js' },
    { regex: /(^|[\s,;:(])react\.js([\s,;:.)]|$)/gi, placeholder: '__special_reactjs__', token: 'react.js' }
  ];

  for (const item of specialTokens) {
    normalized = normalized.replace(item.regex, ` $1 ${item.placeholder} $2 `);
  }

  // Remove non-alphanumeric characters except underscore and placeholder underscores
  // Keep whitespace
  normalized = normalized.replace(/[^a-z0-9_\s]/g, ' ');

  // Split on whitespace
  const rawTokens = normalized.split(/\s+/).filter(Boolean);

  // Restore placeholders and filter stopwords + min length
  const finalTokens: string[] = [];
  for (const raw of rawTokens) {
    let token = raw;
    let isSpecial = false;
    for (const item of specialTokens) {
      if (token === item.placeholder) {
        token = item.token;
        isSpecial = true;
        break;
      }
    }

    if (STOPWORDS.has(token)) {
      continue;
    }

    if (isSpecial) {
      finalTokens.push(token);
    } else if (token.length >= 2 || token === 'c' || token === 'r') {
      finalTokens.push(lightStem(token));
    }
  }

  return finalTokens;
}

/**
 * Lightweight, safe suffix stemming for common English grammatical variations.
 */
export function lightStem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Compute term frequency map for a document.
 */
export function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  return tf;
}

/**
 * Compute Sublinear TF-IDF vectors and Cosine Similarity between Job Description and Resume.
 * Sublinear TF: tf_weight = 1 + ln(count) when count > 0, else 0
 * Cosine similarity = dot(vA, vB) / (||vA|| * ||vB||)
 */
export function computeSublinearTfIdfCosine(
  docA: string,
  docB: string
): {
  similarity: number;
  sharedTokens: string[];
} {
  const tokensA = tokenizeAndClean(docA);
  const tokensB = tokenizeAndClean(docB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { similarity: 0, sharedTokens: [] };
  }

  const tfA = computeTF(tokensA);
  const tfB = computeTF(tokensB);

  // Vocabulary across both docs
  const vocab = new Set([...tfA.keys(), ...tfB.keys()]);
  const N = 2; // two documents in our pair-wise comparison
  const shared: string[] = [];

  let dotProduct = 0;
  let normASq = 0;
  let normBSq = 0;

  for (const term of vocab) {
    const countA = tfA.get(term) || 0;
    const countB = tfB.get(term) || 0;

    // Document frequency (how many docs have term)
    let df = 0;
    if (countA > 0) df++;
    if (countB > 0) df++;

    // Standard IDF: ln(1 + N / df)
    const idf = Math.log(1 + N / df);

    // Sublinear TF: 1 + ln(tf) if tf > 0
    const sublinearA = countA > 0 ? 1 + Math.log(countA) : 0;
    const sublinearB = countB > 0 ? 1 + Math.log(countB) : 0;

    const weightA = sublinearA * idf;
    const weightB = sublinearB * idf;

    dotProduct += weightA * weightB;
    normASq += weightA * weightA;
    normBSq += weightB * weightB;

    if (countA > 0 && countB > 0) {
      shared.push(term);
    }
  }

  const normA = Math.sqrt(normASq);
  const normB = Math.sqrt(normBSq);

  if (normA === 0 || normB === 0) {
    return { similarity: 0, sharedTokens: [] };
  }

  const similarity = Math.max(0, Math.min(1, dotProduct / (normA * normB)));
  return {
    similarity: Math.round(similarity * 1000) / 1000,
    sharedTokens: shared.slice(0, 15)
  };
}
