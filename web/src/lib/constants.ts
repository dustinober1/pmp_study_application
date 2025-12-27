/**
 * PMP Domain and Task Constants
 * Used across the application for practice questions and flashcards
 */

export const DOMAINS = {
  PEOPLE: 'people',
  PROCESS: 'process',
  BUSINESS_ENVIRONMENT: 'business_environment',
} as const;

export const DOMAIN_NAMES: Record<string, string> = {
  people: 'People',
  process: 'Process',
  business_environment: 'Business Environment',
};

export const DOMAIN_PERCENTAGES: Record<string, number> = {
  people: 33,
  process: 41,
  business_environment: 26,
};

export const TASKS: Record<string, string[]> = {
  people: [
    'people-1',
    'people-2',
    'people-3',
    'people-4',
    'people-5',
    'people-6',
    'people-7',
    'people-8',
    'people-9',
    'people-10',
    'people-11',
  ],
  process: [
    'process-1',
    'process-2',
    'process-3',
    'process-4',
    'process-5',
    'process-6',
    'process-7',
    'process-8',
    'process-9',
    'process-10',
  ],
  business_environment: [
    'business_environment-1',
    'business_environment-2',
    'business_environment-3',
    'business_environment-4',
    'business_environment-5',
  ],
};

export const TASK_NAMES: Record<string, string> = {
  'people-1': 'Stakeholder Identification and Analysis',
  'people-2': 'Stakeholder Engagement',
  'people-3': 'Team Performance',
  'people-4': 'Team Development',
  'people-5': 'Motivation and Influence',
  'people-6': 'Decision Making and Problem Solving',
  'people-7': 'Conflict Resolution',
  'people-8': 'Negotiation',
  'people-9': 'Mentoring',
  'people-10': 'Adaptability and Resilience',
  'people-11': 'Trustworthiness and Ethics',
  'process-1': 'Scope Planning',
  'process-2': 'Scope Definition',
  'process-3': 'Schedule Development',
  'process-4': 'Budget Development',
  'process-5': 'Resource Planning',
  'process-6': 'Quality Planning',
  'process-7': 'Risk Identification',
  'process-8': 'Risk Analysis',
  'process-9': 'Communications Planning',
  'process-10': 'Execution and Delivery',
  'business_environment-1': 'Organizational Strategy Alignment',
  'business_environment-2': 'Compliance and Governance',
  'business_environment-3': 'Environmental and Social Factors',
  'business_environment-4': 'Organizational Change',
  'business_environment-5': 'Enterprise Environmental Factors',
};
