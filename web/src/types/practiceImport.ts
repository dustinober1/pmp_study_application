/**
 * Type definitions for importing practice questions from JSON files
 * Defines the expected structure of JSON import files and validation
 */

/**
 * Answer choice in JSON import format
 */
export interface ImportAnswerChoice {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
}

/**
 * Practice question in JSON import format
 * This is the format used in bulk import JSON files
 */
export interface ImportPracticeQuestion {
  domainId: string;
  taskId: string;
  question: string;
  choices: ImportAnswerChoice[];
  explanation: string;
  references?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  version?: number;
}

/**
 * Root structure of a practice questions JSON import file
 */
export interface PracticeQuestionsImportFile {
  questions: ImportPracticeQuestion[];
}

/**
 * Validation result for import operations
 */
export interface ImportValidationResult {
  isValid: boolean;
  errors: ImportValidationError[];
  warnings: ImportValidationWarning[];
  questionCount: number;
}

/**
 * A validation error that prevents import
 */
export interface ImportValidationError {
  questionIndex: number;
  field: string;
  message: string;
}

/**
 * A validation warning that doesn't prevent import
 */
export interface ImportValidationWarning {
  questionIndex: number;
  field: string;
  message: string;
}

/**
 * Options for the import operation
 */
export interface ImportOptions {
  /** Whether to include questions that fail validation (default: false) */
  skipInvalid?: boolean;
  /** Whether to overwrite existing questions with the same ID (default: false) */
  overwrite?: boolean;
}

/**
 * Result of a successful import operation
 */
export interface ImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  questionIds: string[];
  errors: Array<{
    questionIndex: number;
    reason: string;
  }>;
}
