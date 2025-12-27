/**
 * JSON Import Utility for Practice Questions
 * Provides functions to validate and import practice questions from JSON files
 */

import {
  ImportPracticeQuestion,
  PracticeQuestionsImportFile,
  ImportValidationResult,
  ImportValidationError,
  ImportValidationWarning,
  ImportOptions,
  ImportResult,
} from '@/types/practiceImport';
import {
  PracticeQuestionContentDocument,
  AnswerChoice,
} from '@/types/firestore';
import { db } from '@/config/firebase';
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

/**
 * Valid domain IDs for practice questions
 */
const VALID_DOMAINS = ['people', 'process', 'business_environment'];

/**
 * Valid difficulty levels
 */
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Validate a single practice question from import
 * @param question - The question to validate
 * @param questionIndex - The index in the import array
 * @returns Array of validation errors (empty if valid)
 */
export function validateQuestion(
  question: any,
  questionIndex: number
): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  // Check domainId
  if (!question.domainId) {
    errors.push({
      questionIndex,
      field: 'domainId',
      message: 'domainId is required',
    });
  } else if (!VALID_DOMAINS.includes(question.domainId)) {
    errors.push({
      questionIndex,
      field: 'domainId',
      message: `Invalid domainId: ${question.domainId}. Must be one of: ${VALID_DOMAINS.join(', ')}`,
    });
  }

  // Check taskId
  if (!question.taskId) {
    errors.push({
      questionIndex,
      field: 'taskId',
      message: 'taskId is required',
    });
  } else if (typeof question.taskId !== 'string') {
    errors.push({
      questionIndex,
      field: 'taskId',
      message: 'taskId must be a string',
    });
  }

  // Check question text
  if (!question.question) {
    errors.push({
      questionIndex,
      field: 'question',
      message: 'question text is required',
    });
  } else if (typeof question.question !== 'string') {
    errors.push({
      questionIndex,
      field: 'question',
      message: 'question must be a string',
    });
  }

  // Check choices
  if (!Array.isArray(question.choices)) {
    errors.push({
      questionIndex,
      field: 'choices',
      message: 'choices must be an array',
    });
  } else {
    if (question.choices.length !== 4) {
      errors.push({
        questionIndex,
        field: 'choices',
        message: 'Must have exactly 4 answer choices',
      });
    }

    const letters = ['A', 'B', 'C', 'D'];
    const hasCorrect = question.choices.some((c: any) => c.isCorrect);

    question.choices.forEach((choice: any, idx: number) => {
      if (!choice.letter || !letters.includes(choice.letter)) {
        errors.push({
          questionIndex,
          field: `choices[${idx}].letter`,
          message: 'Choice letter must be A, B, C, or D',
        });
      }
      if (!choice.text || typeof choice.text !== 'string') {
        errors.push({
          questionIndex,
          field: `choices[${idx}].text`,
          message: 'Choice text is required and must be a string',
        });
      }
      if (typeof choice.isCorrect !== 'boolean') {
        errors.push({
          questionIndex,
          field: `choices[${idx}].isCorrect`,
          message: 'isCorrect must be a boolean',
        });
      }
    });

    if (!hasCorrect) {
      errors.push({
        questionIndex,
        field: 'choices',
        message: 'At least one choice must have isCorrect set to true',
      });
    }
  }

  // Check explanation
  if (!question.explanation) {
    errors.push({
      questionIndex,
      field: 'explanation',
      message: 'explanation is required',
    });
  } else if (typeof question.explanation !== 'string') {
    errors.push({
      questionIndex,
      field: 'explanation',
      message: 'explanation must be a string',
    });
  }

  // Check difficulty
  if (!question.difficulty) {
    errors.push({
      questionIndex,
      field: 'difficulty',
      message: 'difficulty is required',
    });
  } else if (!VALID_DIFFICULTIES.includes(question.difficulty)) {
    errors.push({
      questionIndex,
      field: 'difficulty',
      message: `Invalid difficulty: ${question.difficulty}. Must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
    });
  }

  // Check references (optional)
  if (question.references && !Array.isArray(question.references)) {
    errors.push({
      questionIndex,
      field: 'references',
      message: 'references must be an array if provided',
    });
  }

  // Check tags (optional)
  if (question.tags && !Array.isArray(question.tags)) {
    errors.push({
      questionIndex,
      field: 'tags',
      message: 'tags must be an array if provided',
    });
  }

  return errors;
}

/**
 * Validate the structure of an import JSON file
 * @param data - The parsed JSON data
 * @returns Validation result with errors and warnings
 */
export function validateImportFile(
  data: any
): ImportValidationResult {
  const errors: ImportValidationError[] = [];
  const warnings: ImportValidationWarning[] = [];
  let questionCount = 0;

  // Check root structure
  if (!data || typeof data !== 'object') {
    errors.push({
      questionIndex: -1,
      field: 'root',
      message: 'Import file must be a JSON object',
    });
    return {
      isValid: false,
      errors,
      warnings,
      questionCount: 0,
    };
  }

  if (!Array.isArray(data.questions)) {
    errors.push({
      questionIndex: -1,
      field: 'questions',
      message: 'File must contain a "questions" array',
    });
    return {
      isValid: false,
      errors,
      warnings,
      questionCount: 0,
    };
  }

  if (data.questions.length === 0) {
    warnings.push({
      questionIndex: -1,
      field: 'questions',
      message: 'No questions found in import file',
    });
  }

  // Validate each question
  data.questions.forEach((question: any, index: number) => {
    const questionErrors = validateQuestion(question, index);
    errors.push(...questionErrors);
  });

  questionCount = data.questions.length;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    questionCount,
  };
}

/**
 * Parse a JSON file for import
 * @param file - The File object from input
 * @returns Parsed JSON data or null if parsing fails
 */
export async function parseImportFile(
  file: File
): Promise<PracticeQuestionsImportFile | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error('Error parsing import file:', error);
    return null;
  }
}

/**
 * Generate a unique ID for a practice question
 * @returns Unique ID string
 */
function generateQuestionId(): string {
  return `pq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert an imported question to a Firestore document
 * @param question - The imported question
 * @returns Firestore document format
 */
export function convertToFirestoreDocument(
  question: ImportPracticeQuestion
): PracticeQuestionContentDocument {
  const now = new Date();
  const id = generateQuestionId();

  return {
    id,
    domainId: question.domainId,
    taskId: question.taskId,
    question: question.question,
    choices: question.choices as AnswerChoice[],
    explanation: question.explanation,
    references: question.references || [],
    difficulty: question.difficulty,
    tags: question.tags || [],
    version: question.version || 1,
    stats: {
      totalAttempts: 0,
      correctAttempts: 0,
      successRate: 0,
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Import practice questions from a JSON file to Firestore
 * @param file - The JSON file to import
 * @param options - Import options
 * @returns Import result with statistics
 */
export async function importPracticeQuestionsFromJSON(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const importedIds: string[] = [];
  const errors: Array<{ questionIndex: number; reason: string }> = [];

  try {
    // Parse the file
    const data = await parseImportFile(file);
    if (!data) {
      return {
        success: false,
        importedCount: 0,
        failedCount: 0,
        questionIds: [],
        errors: [{ questionIndex: -1, reason: 'Failed to parse JSON file' }],
      };
    }

    // Validate the structure
    const validation = validateImportFile(data);
    if (!validation.isValid && !options.skipInvalid) {
      return {
        success: false,
        importedCount: 0,
        failedCount: validation.questionCount,
        questionIds: [],
        errors: validation.errors.map((e) => ({
          questionIndex: e.questionIndex,
          reason: `${e.field}: ${e.message}`,
        })),
      };
    }

    // Import each question
    for (let i = 0; i < data.questions.length; i++) {
      const question = data.questions[i];

      // Validate individual question
      const questionErrors = validateQuestion(question, i);
      if (questionErrors.length > 0) {
        if (!options.skipInvalid) {
          errors.push({
            questionIndex: i,
            reason: questionErrors.map((e) => `${e.field}: ${e.message}`).join('; '),
          });
          continue;
        }
        // Skip invalid question if skipInvalid is true
        continue;
      }

      try {
        // Convert to Firestore format
        const firestoreDoc = convertToFirestoreDocument(
          question as ImportPracticeQuestion
        );

        // Check if question already exists (by domain, task, and question text)
        const existingQuery = query(
          collection(db, 'practiceQuestions'),
          where('domainId', '==', firestoreDoc.domainId),
          where('taskId', '==', firestoreDoc.taskId),
          where('question', '==', firestoreDoc.question)
        );
        const existingSnap = await getDocs(existingQuery);

        if (existingSnap.size > 0 && !options.overwrite) {
          errors.push({
            questionIndex: i,
            reason: 'Question already exists (set overwrite: true to replace)',
          });
          continue;
        }

        // Save to Firestore
        const docRef = doc(db, 'practiceQuestions', firestoreDoc.id);
        await setDoc(docRef, {
          ...firestoreDoc,
          createdAt: Timestamp.fromDate(firestoreDoc.createdAt),
          updatedAt: Timestamp.fromDate(firestoreDoc.updatedAt),
        });

        importedIds.push(firestoreDoc.id);
      } catch (error) {
        console.error(`Error importing question ${i}:`, error);
        errors.push({
          questionIndex: i,
          reason: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return {
      success: errors.length === 0,
      importedCount: importedIds.length,
      failedCount: errors.length,
      questionIds: importedIds,
      errors,
    };
  } catch (error) {
    console.error('Error importing practice questions:', error);
    return {
      success: false,
      importedCount: 0,
      failedCount: 0,
      questionIds: [],
      errors: [
        {
          questionIndex: -1,
          reason: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Validate a JSON file without importing
 * @param file - The JSON file to validate
 * @returns Validation result
 */
export async function validateImportFile_Async(
  file: File
): Promise<ImportValidationResult> {
  try {
    const data = await parseImportFile(file);
    if (!data) {
      return {
        isValid: false,
        errors: [
          {
            questionIndex: -1,
            field: 'file',
            message: 'Failed to parse JSON file',
          },
        ],
        warnings: [],
        questionCount: 0,
      };
    }

    return validateImportFile(data);
  } catch (error) {
    return {
      isValid: false,
      errors: [
        {
          questionIndex: -1,
          field: 'file',
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      warnings: [],
      questionCount: 0,
    };
  }
}
