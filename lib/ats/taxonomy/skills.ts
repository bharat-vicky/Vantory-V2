/**
 * Centralized Skill Taxonomy & Normalization Engine (v3.0)
 * Handles exact matching, normalization, alias resolution, & related skill distinctions.
 * Enforces rule: Related technologies (e.g. MySQL vs PostgreSQL, Docker vs Kubernetes) receive RELATED status, NOT full match credit.
 */

import { SkillMatchType } from "../types";

export const CANONICAL_SKILL_MAP: Record<string, string> = {
  // REST API Variations
  "rest api": "REST API",
  "rest apis": "REST API",
  "restful api": "REST API",
  "restful apis": "REST API",
  "rest api development": "REST API",
  "restful api development": "REST API",

  // Frontend
  react: "React",
  "react.js": "React",
  reactjs: "React",
  next: "Next.js",
  "next.js": "Next.js",
  nextjs: "Next.js",
  vue: "Vue.js",
  "vue.js": "Vue.js",
  vuejs: "Vue.js",
  angular: "Angular",
  angularjs: "Angular",
  ts: "TypeScript",
  typescript: "TypeScript",
  js: "JavaScript",
  javascript: "JavaScript",
  html: "HTML5",
  html5: "HTML5",
  css: "CSS3",
  css3: "CSS3",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",

  // Backend & Languages
  python: "Python",
  python3: "Python",
  node: "Node.js",
  "node.js": "Node.js",
  nodejs: "Node.js",
  express: "Express.js",
  expressjs: "Express.js",
  fastapi: "FastAPI",
  django: "Django",
  flask: "Flask",
  java: "Java",
  cpp: "C++",
  "c++": "C++",
  csharp: "C#",
  "c#": "C#",
  go: "Go",
  golang: "Go",
  rust: "Rust",

  // Cloud & DevOps
  aws: "AWS",
  "aws ec2": "AWS",
  "amazon web services": "AWS",
  gcp: "Google Cloud Platform",
  "google cloud": "Google Cloud Platform",
  azure: "Microsoft Azure",
  docker: "Docker",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  terraform: "Terraform",
  ansible: "Ansible",
  jenkins: "Jenkins",
  ci: "CI/CD",
  cd: "CI/CD",
  "ci/cd": "CI/CD",

  // Data analyst and fresher preparation vocabulary
  sql: "SQL",
  "structured query language": "SQL",
  excel: "Excel",
  "microsoft excel": "Excel",
  pandas: "Pandas",
  numpy: "NumPy",
  tableau: "Tableau",
  "power bi": "Power BI",
  powerbi: "Power BI",
  statistics: "Statistics",
  "data visualization": "Data Visualization",
  "data visualisation": "Data Visualization",
  "data analysis": "Data Analysis",
  "data cleaning": "Data Cleaning",
  git: "Git",
  "unit testing": "Unit Testing",
  "data structures": "Data Structures",
  algorithms: "Algorithms",

  // Databases & Storage
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  "postgres db": "PostgreSQL",
  "postgresql database": "PostgreSQL",
  mysql: "MySQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  redis: "Redis",
  sqlite: "SQLite",
  qdrant: "Qdrant",
  pinecone: "Pinecone",

  // AI & ML
  rag: "Retrieval-Augmented Generation (RAG)",
  "retrieval-augmented generation": "Retrieval-Augmented Generation (RAG)",
  llm: "Large Language Models (LLMs)",
  llms: "Large Language Models (LLMs)",
  langchain: "LangChain",
  llamaindex: "LlamaIndex",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  scikit: "Scikit-Learn",
};

// Known Related Skill Categories (Related, NOT Matched)
export const RELATED_SKILLS_GRAPH: Record<string, string[]> = {
  Docker: ["Kubernetes", "Podman", "Containerization"],
  Kubernetes: ["Docker", "Helm", "K3s"],
  React: ["Vue.js", "Angular", "Svelte"],
  FastAPI: ["Flask", "Django", "Express.js"],
  PostgreSQL: ["MySQL", "SQLite", "Oracle DB"],
  MySQL: ["PostgreSQL", "SQLite", "MariaDB"],
  MongoDB: ["DynamoDB", "CouchDB"],
  AWS: ["Google Cloud Platform", "Microsoft Azure"],
  Python: ["Ruby", "Go"],
};

/**
 * Normalize skill string to canonical standard name
 */
export function normalizeSkill(rawSkill: string): string {
  if (!rawSkill) return "";
  const cleaned = rawSkill.trim().toLowerCase().replace(/[-_]/g, " ");
  return CANONICAL_SKILL_MAP[cleaned] || rawSkill.trim();
}

/**
 * Compare JD Skill against Resume Skill and produce strict Match Type
 */
export function evaluateSkillMatch(
  jdSkill: string,
  resumeSkills: string[]
): { matchType: SkillMatchType; matchedSkillName?: string; confidence: number } {
  const normJd = normalizeSkill(jdSkill);
  const normJdLower = normJd.toLowerCase();

  // 1. Exact Match
  for (const resumeSkill of resumeSkills) {
    if (resumeSkill.trim().toLowerCase() === jdSkill.trim().toLowerCase()) {
      return { matchType: "EXACT", matchedSkillName: resumeSkill, confidence: 100 };
    }
  }

  // 2. Normalized / Alias Match
  for (const resumeSkill of resumeSkills) {
    const normResume = normalizeSkill(resumeSkill);
    if (normResume.toLowerCase() === normJdLower) {
      return { matchType: "ALIAS", matchedSkillName: resumeSkill, confidence: 95 };
    }
  }

  // 3. Substring / Partial Match
  for (const resumeSkill of resumeSkills) {
    const rLower = resumeSkill.toLowerCase();
    if (rLower.includes(normJdLower) || normJdLower.includes(rLower)) {
      if (rLower.length > 3 && normJdLower.length > 3) {
        return { matchType: "PARTIAL", matchedSkillName: resumeSkill, confidence: 80 };
      }
    }
  }

  // 4. Check for Related Skills (e.g. MySQL vs PostgreSQL -> RELATED, NOT MATCHED)
  const relatedList = RELATED_SKILLS_GRAPH[normJd] || [];
  for (const resumeSkill of resumeSkills) {
    const normResume = normalizeSkill(resumeSkill);
    if (relatedList.includes(normResume)) {
      return { matchType: "RELATED", matchedSkillName: resumeSkill, confidence: 40 };
    }
  }

  return { matchType: "NOT_FOUND", confidence: 0 };
}
