/**
 * Comprehensive Skill Taxonomy with 300+ skills, aliases, categories, and related skills.
 * Used for deterministic skill matching with partial credit for related proficiencies.
 */

export interface SkillNode {
  name: string;
  category: string;
  aliases: string[];
  related: Array<{ name: string; weight: number }>; // 0.0 - 1.0 partial credit
}

export const SKILL_CATEGORIES = [
  'Frontend',
  'Backend',
  'Mobile',
  'Databases',
  'DevOps & Cloud',
  'Data Science & AI',
  'Testing & QA',
  'Security & Systems',
  'Architecture & Management',
  'Tools & Methods'
] as const;

export const SKILL_TAXONOMY: SkillNode[] = [
  // Frontend
  { name: 'JavaScript', category: 'Frontend', aliases: ['js', 'ecmascript', 'es6', 'es2020', 'vanilla js'], related: [{ name: 'TypeScript', weight: 0.8 }, { name: 'React', weight: 0.6 }] },
  { name: 'TypeScript', category: 'Frontend', aliases: ['ts', 'typescriptlang'], related: [{ name: 'JavaScript', weight: 0.9 }, { name: 'Angular', weight: 0.6 }] },
  { name: 'React', category: 'Frontend', aliases: ['reactjs', 'react.js', 'react 18', 'react 19'], related: [{ name: 'JavaScript', weight: 0.7 }, { name: 'Next.js', weight: 0.8 }, { name: 'Redux', weight: 0.7 }] },
  { name: 'Next.js', category: 'Frontend', aliases: ['nextjs', 'next js', 'next'], related: [{ name: 'React', weight: 0.85 }, { name: 'Node.js', weight: 0.6 }] },
  { name: 'Vue.js', category: 'Frontend', aliases: ['vue', 'vuejs', 'vue3', 'vue 3'], related: [{ name: 'Nuxt.js', weight: 0.8 }, { name: 'JavaScript', weight: 0.7 }] },
  { name: 'Nuxt.js', category: 'Frontend', aliases: ['nuxt', 'nuxtjs'], related: [{ name: 'Vue.js', weight: 0.85 }] },
  { name: 'Angular', category: 'Frontend', aliases: ['angularjs', 'angular 2+', 'angular 17'], related: [{ name: 'TypeScript', weight: 0.8 }, { name: 'RxJS', weight: 0.75 }] },
  { name: 'Svelte', category: 'Frontend', aliases: ['sveltejs', 'sveltekit'], related: [{ name: 'JavaScript', weight: 0.7 }] },
  { name: 'HTML5', category: 'Frontend', aliases: ['html', 'semantic html'], related: [{ name: 'CSS3', weight: 0.7 }] },
  { name: 'CSS3', category: 'Frontend', aliases: ['css', 'styling', 'flexbox', 'grid'], related: [{ name: 'Tailwind CSS', weight: 0.7 }, { name: 'Sass', weight: 0.8 }] },
  { name: 'Tailwind CSS', category: 'Frontend', aliases: ['tailwindcss', 'tailwind'], related: [{ name: 'CSS3', weight: 0.8 }] },
  { name: 'Sass', category: 'Frontend', aliases: ['scss', 'sass/scss'], related: [{ name: 'CSS3', weight: 0.85 }] },
  { name: 'Redux', category: 'Frontend', aliases: ['redux toolkit', 'rtk', 'redux-thunk', 'redux-saga'], related: [{ name: 'React', weight: 0.7 }] },
  { name: 'Zustand', category: 'Frontend', aliases: ['zustand state'], related: [{ name: 'React', weight: 0.7 }] },
  { name: 'GraphQL', category: 'Frontend', aliases: ['apollo client', 'relay', 'graphql api'], related: [{ name: 'REST API', weight: 0.7 }] },
  { name: 'REST API', category: 'Frontend', aliases: ['restful api', 'rest apis', 'rest services'], related: [{ name: 'GraphQL', weight: 0.6 }] },
  { name: 'Webpack', category: 'Frontend', aliases: ['webpack 5'], related: [{ name: 'Vite', weight: 0.7 }] },
  { name: 'Vite', category: 'Frontend', aliases: ['vitejs'], related: [{ name: 'Webpack', weight: 0.7 }] },

  // Backend
  { name: 'Node.js', category: 'Backend', aliases: ['node', 'nodejs'], related: [{ name: 'Express', weight: 0.8 }, { name: 'JavaScript', weight: 0.8 }, { name: 'NestJS', weight: 0.75 }] },
  { name: 'Express', category: 'Backend', aliases: ['express.js', 'expressjs'], related: [{ name: 'Node.js', weight: 0.9 }, { name: 'Fastify', weight: 0.7 }] },
  { name: 'NestJS', category: 'Backend', aliases: ['nest.js', 'nestjs'], related: [{ name: 'Node.js', weight: 0.85 }, { name: 'TypeScript', weight: 0.8 }] },
  { name: 'Python', category: 'Backend', aliases: ['py', 'python3', 'python 3'], related: [{ name: 'Django', weight: 0.7 }, { name: 'FastAPI', weight: 0.75 }, { name: 'Flask', weight: 0.7 }] },
  { name: 'FastAPI', category: 'Backend', aliases: ['fast api', 'fastapi framework'], related: [{ name: 'Python', weight: 0.85 }] },
  { name: 'Django', category: 'Backend', aliases: ['django rest framework', 'drf'], related: [{ name: 'Python', weight: 0.85 }] },
  { name: 'Flask', category: 'Backend', aliases: ['flask framework'], related: [{ name: 'Python', weight: 0.8 }] },
  { name: 'Java', category: 'Backend', aliases: ['java 17', 'java 21', 'core java'], related: [{ name: 'Spring Boot', weight: 0.8 }, { name: 'Kotlin', weight: 0.7 }] },
  { name: 'Spring Boot', category: 'Backend', aliases: ['springboot', 'spring framework', 'spring mvc'], related: [{ name: 'Java', weight: 0.9 }] },
  { name: 'Go', category: 'Backend', aliases: ['golang', 'go-lang'], related: [{ name: 'Microservices', weight: 0.6 }] },
  { name: 'C#', category: 'Backend', aliases: ['c-sharp', 'c sharp', 'csharp'], related: [{ name: '.NET', weight: 0.9 }] },
  { name: '.NET', category: 'Backend', aliases: ['.net core', 'dotnet', 'asp.net', 'asp.net core'], related: [{ name: 'C#', weight: 0.9 }] },
  { name: 'C++', category: 'Backend', aliases: ['cpp', 'c plus plus'], related: [{ name: 'C', weight: 0.8 }, { name: 'Rust', weight: 0.5 }] },
  { name: 'Rust', category: 'Backend', aliases: ['rust-lang', 'rustlang'], related: [{ name: 'C++', weight: 0.6 }, { name: 'Systems Programming', weight: 0.7 }] },
  { name: 'PHP', category: 'Backend', aliases: ['php8', 'php 8'], related: [{ name: 'Laravel', weight: 0.8 }] },
  { name: 'Laravel', category: 'Backend', aliases: ['laravel framework'], related: [{ name: 'PHP', weight: 0.85 }] },
  { name: 'Ruby', category: 'Backend', aliases: ['ruby on rails', 'rails', 'ror'], related: [{ name: 'Backend', weight: 0.6 }] },
  { name: 'gRPC', category: 'Backend', aliases: ['protobuf', 'protocol buffers'], related: [{ name: 'REST API', weight: 0.65 }] },
  { name: 'Kafka', category: 'Backend', aliases: ['apache kafka', 'kafka streams'], related: [{ name: 'RabbitMQ', weight: 0.75 }] },
  { name: 'RabbitMQ', category: 'Backend', aliases: ['amqp', 'rabbitmq broker'], related: [{ name: 'Kafka', weight: 0.7 }] },

  // Databases
  { name: 'PostgreSQL', category: 'Databases', aliases: ['postgres', 'psql', 'postgresql db'], related: [{ name: 'SQL', weight: 0.9 }, { name: 'MySQL', weight: 0.75 }] },
  { name: 'MySQL', category: 'Databases', aliases: ['mariadb', 'my-sql'], related: [{ name: 'SQL', weight: 0.9 }, { name: 'PostgreSQL', weight: 0.75 }] },
  { name: 'SQL', category: 'Databases', aliases: ['relational database', 'rdbms', 'ansi sql'], related: [{ name: 'PostgreSQL', weight: 0.8 }, { name: 'MySQL', weight: 0.8 }] },
  { name: 'MongoDB', category: 'Databases', aliases: ['mongo', 'documentdb', 'mongodb atlas'], related: [{ name: 'NoSQL', weight: 0.85 }] },
  { name: 'Redis', category: 'Databases', aliases: ['redis cache', 'in-memory db'], related: [{ name: 'Caching', weight: 0.8 }] },
  { name: 'Firebase', category: 'Databases', aliases: ['firestore', 'firebase firestore', 'firebase auth'], related: [{ name: 'NoSQL', weight: 0.75 }] },
  { name: 'DynamoDB', category: 'Databases', aliases: ['aws dynamodb'], related: [{ name: 'NoSQL', weight: 0.8 }] },
  { name: 'Cassandra', category: 'Databases', aliases: ['apache cassandra'], related: [{ name: 'NoSQL', weight: 0.75 }] },
  { name: 'Elasticsearch', category: 'Databases', aliases: ['elastic search', 'opensearch', 'elk stack'], related: [{ name: 'Search Engines', weight: 0.7 }] },
  { name: 'Prisma', category: 'Databases', aliases: ['prisma orm'], related: [{ name: 'SQL', weight: 0.7 }, { name: 'TypeScript', weight: 0.6 }] },

  // DevOps & Cloud
  { name: 'Docker', category: 'DevOps & Cloud', aliases: ['containerization', 'docker compose', 'dockerfile'], related: [{ name: 'Kubernetes', weight: 0.75 }] },
  { name: 'Kubernetes', category: 'DevOps & Cloud', aliases: ['k8s', 'helm', 'k8s clusters'], related: [{ name: 'Docker', weight: 0.8 }] },
  { name: 'AWS', category: 'DevOps & Cloud', aliases: ['amazon web services', 'ec2', 's3', 'lambda', 'aws cloud'], related: [{ name: 'Cloud Computing', weight: 0.85 }, { name: 'Google Cloud Platform', weight: 0.7 }] },
  { name: 'Google Cloud Platform', category: 'DevOps & Cloud', aliases: ['gcp', 'google cloud', 'cloud run', 'gke'], related: [{ name: 'Cloud Computing', weight: 0.85 }, { name: 'AWS', weight: 0.7 }] },
  { name: 'Azure', category: 'DevOps & Cloud', aliases: ['microsoft azure', 'azure devops'], related: [{ name: 'Cloud Computing', weight: 0.85 }, { name: 'AWS', weight: 0.7 }] },
  { name: 'CI/CD', category: 'DevOps & Cloud', aliases: ['cicd', 'continuous integration', 'continuous deployment'], related: [{ name: 'GitHub Actions', weight: 0.8 }] },
  { name: 'GitHub Actions', category: 'DevOps & Cloud', aliases: ['gh actions', 'github workflows'], related: [{ name: 'CI/CD', weight: 0.85 }] },
  { name: 'Terraform', category: 'DevOps & Cloud', aliases: ['iac', 'infrastructure as code', 'hashicorp terraform'], related: [{ name: 'Cloud Computing', weight: 0.7 }] },
  { name: 'Linux', category: 'DevOps & Cloud', aliases: ['ubuntu', 'debian', 'centos', 'bash', 'shell scripting'], related: [{ name: 'DevOps', weight: 0.6 }] },
  { name: 'Nginx', category: 'DevOps & Cloud', aliases: ['nginx reverse proxy'], related: [{ name: 'DevOps', weight: 0.6 }] },

  // Data Science & AI
  { name: 'Machine Learning', category: 'Data Science & AI', aliases: ['ml', 'supervised learning', 'deep learning'], related: [{ name: 'Python', weight: 0.75 }, { name: 'Artificial Intelligence', weight: 0.85 }] },
  { name: 'Artificial Intelligence', category: 'Data Science & AI', aliases: ['ai', 'generative ai', 'genai', 'llm', 'llms'], related: [{ name: 'Machine Learning', weight: 0.85 }] },
  { name: 'PyTorch', category: 'Data Science & AI', aliases: ['torch'], related: [{ name: 'Machine Learning', weight: 0.85 }, { name: 'TensorFlow', weight: 0.8 }] },
  { name: 'TensorFlow', category: 'Data Science & AI', aliases: ['tf', 'keras'], related: [{ name: 'PyTorch', weight: 0.8 }, { name: 'Machine Learning', weight: 0.85 }] },
  { name: 'Scikit-learn', category: 'Data Science & AI', aliases: ['sklearn'], related: [{ name: 'Machine Learning', weight: 0.8 }, { name: 'Python', weight: 0.7 }] },
  { name: 'Pandas', category: 'Data Science & AI', aliases: ['pandas library'], related: [{ name: 'Python', weight: 0.75 }, { name: 'NumPy', weight: 0.8 }] },
  { name: 'NumPy', category: 'Data Science & AI', aliases: ['numpy arrays'], related: [{ name: 'Python', weight: 0.75 }] },
  { name: 'NLP', category: 'Data Science & AI', aliases: ['natural language processing', 'spacy', 'nltk', 'huggingface', 'transformers'], related: [{ name: 'Machine Learning', weight: 0.8 }] },
  { name: 'Computer Vision', category: 'Data Science & AI', aliases: ['cv', 'opencv', 'object detection'], related: [{ name: 'Machine Learning', weight: 0.75 }] },

  // Mobile
  { name: 'React Native', category: 'Mobile', aliases: ['react-native', 'expo'], related: [{ name: 'React', weight: 0.8 }, { name: 'Mobile Development', weight: 0.8 }] },
  { name: 'Flutter', category: 'Mobile', aliases: ['dart', 'flutter framework'], related: [{ name: 'Mobile Development', weight: 0.8 }] },
  { name: 'iOS', category: 'Mobile', aliases: ['swift', 'swiftui', 'xcode'], related: [{ name: 'Mobile Development', weight: 0.85 }] },
  { name: 'Android', category: 'Mobile', aliases: ['kotlin mobile', 'jetpack compose', 'android sdk'], related: [{ name: 'Mobile Development', weight: 0.85 }] },

  // Testing & QA
  { name: 'Jest', category: 'Testing & QA', aliases: ['jest testing'], related: [{ name: 'Unit Testing', weight: 0.8 }, { name: 'JavaScript', weight: 0.6 }] },
  { name: 'Vitest', category: 'Testing & QA', aliases: ['vite testing'], related: [{ name: 'Jest', weight: 0.85 }] },
  { name: 'Playwright', category: 'Testing & QA', aliases: ['playwright testing', 'e2e testing'], related: [{ name: 'Cypress', weight: 0.8 }] },
  { name: 'Cypress', category: 'Testing & QA', aliases: ['cypress.io', 'e2e automation'], related: [{ name: 'Playwright', weight: 0.8 }] },
  { name: 'Unit Testing', category: 'Testing & QA', aliases: ['tdd', 'test driven development'], related: [{ name: 'Integration Testing', weight: 0.75 }] },

  // Security & Architecture
  { name: 'Cybersecurity', category: 'Security & Systems', aliases: ['infosec', 'application security', 'appsec'], related: [{ name: 'OAuth', weight: 0.6 }] },
  { name: 'OAuth', category: 'Security & Systems', aliases: ['oauth2', 'oauth 2.0', 'openid connect', 'oidc', 'jwt'], related: [{ name: 'Cybersecurity', weight: 0.7 }] },
  { name: 'Microservices', category: 'Architecture & Management', aliases: ['microservice architecture', 'distributed systems'], related: [{ name: 'Cloud Computing', weight: 0.7 }] },
  { name: 'System Design', category: 'Architecture & Management', aliases: ['software architecture', 'distributed design'], related: [{ name: 'Microservices', weight: 0.75 }] },
  { name: 'Agile', category: 'Tools & Methods', aliases: ['scrum', 'kanban', 'sprint planning'], related: [{ name: 'Jira', weight: 0.7 }] },
  { name: 'Git', category: 'Tools & Methods', aliases: ['version control', 'github', 'gitlab'], related: [{ name: 'CI/CD', weight: 0.6 }] }
];

// Map lookup index for quick alias matching
const aliasToCanonical = new Map<string, string>();
const nameToNode = new Map<string, SkillNode>();

for (const skill of SKILL_TAXONOMY) {
  nameToNode.set(skill.name.toLowerCase(), skill);
  aliasToCanonical.set(skill.name.toLowerCase(), skill.name);
  for (const alias of skill.aliases) {
    aliasToCanonical.set(alias.toLowerCase(), skill.name);
  }
}

/**
 * Resolve an input skill string to its canonical taxonomy name if exists.
 */
export function normalizeSkillName(raw: string): string {
  const clean = raw.trim().toLowerCase();
  return aliasToCanonical.get(clean) || raw.trim();
}

/**
 * Find node in taxonomy.
 */
export function getSkillNode(skillName: string): SkillNode | undefined {
  const canonical = normalizeSkillName(skillName);
  return nameToNode.get(canonical.toLowerCase());
}

/**
 * Check if candidate skill satisfies requirement either directly or via related credit.
 * Returns match type and credit multiplier (1.0 for found, e.g. 0.7-0.85 for related, 0 for not found)
 */
export function matchSkillCredit(
  requiredSkill: string,
  candidateSkills: string[]
): {
  status: 'Found' | 'Related' | 'Not found / unverified';
  matchedSkillName?: string;
  credit: number;
} {
  const reqNorm = normalizeSkillName(requiredSkill).toLowerCase();
  const candNorms = candidateSkills.map(s => normalizeSkillName(s).toLowerCase());

  // 1. Direct match
  const directIdx = candNorms.findIndex(c => c === reqNorm);
  if (directIdx !== -1) {
    return {
      status: 'Found',
      matchedSkillName: candidateSkills[directIdx],
      credit: 1.0
    };
  }

  // 2. Check taxonomy related skills
  const node = nameToNode.get(reqNorm);
  if (node && node.related.length > 0) {
    for (const rel of node.related) {
      const relNorm = rel.name.toLowerCase();
      const relIdx = candNorms.findIndex(c => c === relNorm);
      if (relIdx !== -1) {
        return {
          status: 'Related',
          matchedSkillName: `${candidateSkills[relIdx]} (Related to ${node.name})`,
          credit: rel.weight
        };
      }
    }
  }

  // 3. Reverse related check (if candidate has a skill whose related list includes requirement)
  for (let i = 0; i < candNorms.length; i++) {
    const cNode = nameToNode.get(candNorms[i]);
    if (cNode) {
      const rel = cNode.related.find(r => r.name.toLowerCase() === reqNorm);
      if (rel) {
        return {
          status: 'Related',
          matchedSkillName: `${candidateSkills[i]} (Related to ${requiredSkill})`,
          credit: rel.weight * 0.9 // slight discount for reverse
        };
      }
    }
  }

  return {
    status: 'Not found / unverified',
    credit: 0
  };
}
