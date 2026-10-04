import type { CandidateIntelligenceProfile, DifficultyLevel } from "./types";
import { textDemonstratesSkill } from "@/lib/ats/taxonomy/text-skills";

export type PracticeQuestion = { id:string; skill:string; topicId:string; difficulty:DifficultyLevel; category:string; prompt:string; expectedConcepts:string[]; rubricVersion:string };
const levels:DifficultyLevel[] = ["Easy","Medium","Hard","Expert"];
const concepts = [
  {id:"react",skill:"React",topicId:"software-frontend",keys:["state versus props","effect dependencies and cleanup","component boundaries","loading and error states"],prompts:[
    "In React, explain props and state using a small form. What causes a component to render again?",
    "A React search component fetches results in useEffect. How do you handle dependencies, loading and an outdated response?",
    "A React page renders a long list and becomes slow. Explain how you would measure the bottleneck and choose between memoization and virtualization.",
    "Design React state boundaries for a collaborative form with optimistic edits and concurrent server updates. Explain conflict recovery, accessibility and tests."
  ]},
  {id:"accessibility",skill:"Accessibility",topicId:"software-frontend",keys:["semantic HTML and labels","keyboard access","focus management","assistive technology and testing"],prompts:[
    "How would you make an HTML form accessible? Explain labels, validation messages and keyboard use.",
    "A modal opens but keyboard focus stays behind it. How would you manage initial focus, Escape and focus restoration?",
    "Design accessible asynchronous validation for a multi-step form. Explain announcements, error recovery and keyboard testing.",
    "A virtualized interactive grid must support keyboard and screen-reader users. Explain semantic structure, focus retention, announcements and how you would test trade-offs."
  ]},
  {id:"typescript",skill:"TypeScript",topicId:"software-frontend",keys:["compile-time versus runtime validation","union narrowing","null handling","safe boundaries"],prompts:[
    "Explain a TypeScript union and how you narrow it safely. Does TypeScript validate a network response at runtime?",
    "Model loading, success and failure states in TypeScript without contradictory booleans. Show how a discriminated union helps.",
    "A typed API client receives an unexpected JSON shape. Design runtime validation and error handling while preserving useful TypeScript types.",
    "Design a TypeScript interface for versioned API responses with partial failures. Explain exhaustiveness, compatibility and tests of untrusted inputs."
  ]},
  {id:"sql",skill:"SQL",topicId:"data-sql",keys:["LEFT JOIN unmatched rows","NULL and COUNT semantics","grouping and filter placement","duplicate row multiplication"],prompts:[
    "Explain INNER JOIN and LEFT JOIN using customers and orders. How do you keep customers with no orders?",
    "Write the approach for SQL totals per customer including zero-order customers. Explain COUNT(*), COUNT(order_id), NULL and WHERE versus ON filters.",
    "A SQL revenue report doubles totals after joining orders, items and refunds. Explain the grain, diagnose row multiplication and design a correct aggregation.",
    "Design SQL month-on-month revenue reporting with missing months, late refunds and time zones. Explain the calendar spine, window functions, grain and validation cases."
  ]},
  {id:"python",skill:"Python",topicId:"software-arrays",keys:["data structures and edge cases","time and space complexity","explicit input validation","testing"],prompts:[
    "In Python, how would you find the first repeated value in a list? Explain empty input and a set-based approach.",
    "Implement the approach to deduplicate Python records by a business key while retaining order. Explain missing keys and complexity.",
    "A Python data-processing script exceeds memory on a large file. Explain streaming, generators and a test strategy for correctness.",
    "Design a Python pipeline with bounded memory, retryable failures and duplicate records. Explain backpressure, idempotency and reproducible output."
  ]},
  {id:"api",skill:"REST APIs",topicId:"software-api",keys:["validation and authorization","HTTP error semantics","idempotency","bounded retries and tests"],prompts:[
    "Design validation and error handling for an endpoint that creates an order. How would you test it?",
    "A client retries an order-creation request after a timeout. How do idempotency keys prevent duplicate orders and handle changed payloads?",
    "Two concurrent requests use the same idempotency key. Explain database constraints, atomic changes, cached responses and failure recovery.",
    "Design a retry-safe order API spanning an unreliable payment service. Explain state transitions, outbox or reconciliation, authorization and failure tests."
  ]},
  {id:"database",skill:"PostgreSQL",topicId:"software-db",keys:["atomicity and rollback","isolation and concurrency","index trade-offs","query plan evidence"],prompts:[
    "Explain database transactions using a money transfer. What could go wrong without atomicity?",
    "Two transactions update the same balance. Explain lost updates, row locks and a test that exposes the race.",
    "Investigate a slow PostgreSQL query using its execution plan. Explain index selectivity, write costs and representative measurements.",
    "Design transaction boundaries for limited-stock orders under concurrent load. Explain isolation choices, deadlocks, retries and correctness tests."
  ]},
  {id:"testing",skill:"Testing",topicId:"software-testing",keys:["observable assertions","boundary and failure cases","ownership isolation","deterministic synchronization"],prompts:[
    "What tests would you write for a form endpoint? Include invalid input, valid input and a user trying to change another user's data.",
    "An integration test passes alone but fails in a suite. Explain isolation, fixtures and waiting for completion without arbitrary sleeps.",
    "Design tests for concurrent resume edits and retrying the same submission. What invariants must hold after failures?",
    "A service fails intermittently only under concurrency. Design reproducible fault injection, observability and tests for recovery without duplicate effects."
  ]},
  {id:"quality",skill:"Pandas",topicId:"data-quality",keys:["business keys and valid repetition","missingness handling","metric denominator","validation against source data"],prompts:[
    "How would you investigate missing values and duplicates in a sales dataset before reporting revenue?",
    "Using Pandas, describe checks for types, missing values and duplicate business keys. Explain when deleting duplicates would be incorrect.",
    "Two data sources disagree on placement counts. Explain identity matching, eligibility definitions, time windows and reconciliation checks.",
    "Design a reproducible quality pipeline for changing source schemas and late-arriving records. Explain lineage, quarantining and reconciliation thresholds."
  ]},
  {id:"statistics",skill:"Statistics",topicId:"data-statistics",keys:["outlier sensitivity","sampling and confounding","uncertainty","experiment checks"],prompts:[
    "Explain mean, median and outliers. Which summary would you use for salaries, and why?",
    "An A/B test shows a higher conversion rate. What would you check about sample size, randomization and uncertainty before recommending the change?",
    "An experiment is checked daily and stopped at the first significant result. Explain why this can mislead and how you would plan the analysis.",
    "Design an experiment with unequal traffic, multiple outcomes and novelty effects. Explain power, guardrails, stopping rules and limits of causal inference."
  ]},
  {id:"dashboard",skill:"Power BI",topicId:"data-dashboard",keys:["metric definition and grain","active filters","appropriate visualization","source reconciliation"],prompts:[
    "Design a placement dashboard. Define the numerator, eligible denominator, time window and filters for placement rate.",
    "A Power BI dashboard and an Excel report disagree. Describe how you would check grain, filters, refresh times and metric definitions.",
    "Design a dashboard with offers, unique placed students and accepted offers. Explain why these metrics differ and how drill-down avoids double counting.",
    "Design access-controlled placement reporting across departments. Explain row-level access, small-cohort disclosure, changing definitions and auditability."
  ]},
  {id:"javascript",skill:"JavaScript",topicId:"software-frontend",keys:["asynchronous ordering","error handling","cancellation","state consistency"],prompts:[
    "Explain a JavaScript promise and how you handle a failed network request using async and await.",
    "Two JavaScript search requests finish out of order. How do you prevent old results from overwriting the latest results?",
    "Design bounded parallel JavaScript requests with partial failures and cancellation. Explain how you avoid unhandled rejections.",
    "Design an offline-capable JavaScript form queue with retries and concurrent tabs. Explain ordering, deduplication, conflicts and recovery."
  ]}
];
export const PRACTICE_QUESTIONS:PracticeQuestion[] = concepts.flatMap(c => levels.map((difficulty,i) => ({id:`${c.id}-${difficulty.toLowerCase()}`,skill:c.skill,topicId:c.topicId,difficulty,category:"Technical Fundamentals",prompt:c.prompts[i],expectedConcepts:c.keys,rubricVersion:"question.v1"})));

export function questionRubric(text:string) { return PRACTICE_QUESTIONS.find(q => text.includes(q.prompt)); }

export function selectPracticeQuestion(profile:CandidateIntelligenceProfile, difficulty:DifficultyLevel, previousQuestions:string[]) {
  const data = /data|analyst|analytics/i.test(profile.targetJobTitle);
  const frontend = /front.?end|react|web developer|ui developer/i.test(profile.targetJobTitle);
  const defaults = data ? ["sql","quality","statistics","dashboard"] : frontend ? ["react","accessibility","typescript","javascript","testing"] : ["api","database","testing","python"];
  const seenSkills = previousQuestions.map(questionRubric).filter(Boolean).map(q=>q!.skill);
  const priority = (q:PracticeQuestion) => {
    const exact = profile.requiredSkills.some(s => textDemonstratesSkill(q.skill,s) || textDemonstratesSkill(s,q.skill));
    const preferred = profile.preferredSkills.some(s => textDemonstratesSkill(q.skill,s));
    const roleIndex = defaults.indexOf(q.id.split("-")[0]);
    return (exact ? 100 : preferred ? 40 : 0) + (roleIndex >= 0 ? 20-roleIndex : 0) - (seenSkills.includes(q.skill) ? 150 : 0);
  };
  return PRACTICE_QUESTIONS.filter(q=>q.difficulty===difficulty && !previousQuestions.some(text=>text.includes(q.prompt))).sort((a,b)=>priority(b)-priority(a))[0];
}
