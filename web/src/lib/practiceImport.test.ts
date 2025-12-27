/**
 * Tests for the practice questions import utility
 */

import {
  validateQuestion,
  validateImportFile,
  convertToFirestoreDocument,
} from './practiceImport';
import { ImportPracticeQuestion } from '@/types/practiceImport';

describe('practiceImport', () => {
  describe('validateQuestion', () => {
    it('should validate a correct question', () => {
      const validQuestion = {
        domainId: 'people',
        taskId: 'people-1',
        question: 'What is a question?',
        choices: [
          { letter: 'A', text: 'Answer A', isCorrect: false },
          { letter: 'B', text: 'Answer B', isCorrect: true },
          { letter: 'C', text: 'Answer C', isCorrect: false },
          { letter: 'D', text: 'Answer D', isCorrect: false },
        ],
        explanation: 'This is the explanation',
        difficulty: 'easy',
      };

      const errors = validateQuestion(validQuestion, 0);
      expect(errors).toHaveLength(0);
    });

    it('should reject question with missing domainId', () => {
      const invalidQuestion = {
        taskId: 'people-1',
        question: 'What is a question?',
        choices: [
          { letter: 'A', text: 'Answer A', isCorrect: false },
          { letter: 'B', text: 'Answer B', isCorrect: true },
          { letter: 'C', text: 'Answer C', isCorrect: false },
          { letter: 'D', text: 'Answer D', isCorrect: false },
        ],
        explanation: 'This is the explanation',
        difficulty: 'easy',
      };

      const errors = validateQuestion(invalidQuestion, 0);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('domainId');
    });

    it('should reject question with invalid domainId', () => {
      const invalidQuestion = {
        domainId: 'invalid-domain',
        taskId: 'people-1',
        question: 'What is a question?',
        choices: [
          { letter: 'A', text: 'Answer A', isCorrect: false },
          { letter: 'B', text: 'Answer B', isCorrect: true },
          { letter: 'C', text: 'Answer C', isCorrect: false },
          { letter: 'D', text: 'Answer D', isCorrect: false },
        ],
        explanation: 'This is the explanation',
        difficulty: 'easy',
      };

      const errors = validateQuestion(invalidQuestion, 0);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('domainId');
    });

    it('should reject question with incorrect number of choices', () => {
      const invalidQuestion = {
        domainId: 'people',
        taskId: 'people-1',
        question: 'What is a question?',
        choices: [
          { letter: 'A', text: 'Answer A', isCorrect: false },
          { letter: 'B', text: 'Answer B', isCorrect: true },
          { letter: 'C', text: 'Answer C', isCorrect: false },
        ],
        explanation: 'This is the explanation',
        difficulty: 'easy',
      };

      const errors = validateQuestion(invalidQuestion, 0);
      expect(errors.some((e) => e.field === 'choices')).toBe(true);
    });

    it('should reject question with no correct answer', () => {
      const invalidQuestion = {
        domainId: 'people',
        taskId: 'people-1',
        question: 'What is a question?',
        choices: [
          { letter: 'A', text: 'Answer A', isCorrect: false },
          { letter: 'B', text: 'Answer B', isCorrect: false },
          { letter: 'C', text: 'Answer C', isCorrect: false },
          { letter: 'D', text: 'Answer D', isCorrect: false },
        ],
        explanation: 'This is the explanation',
        difficulty: 'easy',
      };

      const errors = validateQuestion(invalidQuestion, 0);
      expect(errors.some((e) => e.field === 'choices')).toBe(true);
    });

    it('should reject question with invalid difficulty', () => {
      const invalidQuestion = {
        domainId: 'people',
        taskId: 'people-1',
        question: 'What is a question?',
        choices: [
          { letter: 'A', text: 'Answer A', isCorrect: false },
          { letter: 'B', text: 'Answer B', isCorrect: true },
          { letter: 'C', text: 'Answer C', isCorrect: false },
          { letter: 'D', text: 'Answer D', isCorrect: false },
        ],
        explanation: 'This is the explanation',
        difficulty: 'very_hard',
      };

      const errors = validateQuestion(invalidQuestion, 0);
      expect(errors.some((e) => e.field === 'difficulty')).toBe(true);
    });
  });

  describe('validateImportFile', () => {
    it('should validate a correct import file', () => {
      const validFile = {
        questions: [
          {
            domainId: 'people',
            taskId: 'people-1',
            question: 'What is a question?',
            choices: [
              { letter: 'A', text: 'Answer A', isCorrect: false },
              { letter: 'B', text: 'Answer B', isCorrect: true },
              { letter: 'C', text: 'Answer C', isCorrect: false },
              { letter: 'D', text: 'Answer D', isCorrect: false },
            ],
            explanation: 'This is the explanation',
            difficulty: 'easy',
          },
        ],
      };

      const result = validateImportFile(validFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.questionCount).toBe(1);
    });

    it('should reject file without questions array', () => {
      const invalidFile = {};

      const result = validateImportFile(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject file with empty questions array', () => {
      const invalidFile = {
        questions: [],
      };

      const result = validateImportFile(invalidFile);
      expect(result.isValid).toBe(true); // Valid structure, but warning about empty
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.questionCount).toBe(0);
    });

    it('should validate multiple questions', () => {
      const validFile = {
        questions: [
          {
            domainId: 'people',
            taskId: 'people-1',
            question: 'Question 1?',
            choices: [
              { letter: 'A', text: 'Answer A', isCorrect: false },
              { letter: 'B', text: 'Answer B', isCorrect: true },
              { letter: 'C', text: 'Answer C', isCorrect: false },
              { letter: 'D', text: 'Answer D', isCorrect: false },
            ],
            explanation: 'Explanation 1',
            difficulty: 'easy',
          },
          {
            domainId: 'process',
            taskId: 'process-1',
            question: 'Question 2?',
            choices: [
              { letter: 'A', text: 'Answer A', isCorrect: true },
              { letter: 'B', text: 'Answer B', isCorrect: false },
              { letter: 'C', text: 'Answer C', isCorrect: false },
              { letter: 'D', text: 'Answer D', isCorrect: false },
            ],
            explanation: 'Explanation 2',
            difficulty: 'medium',
          },
        ],
      };

      const result = validateImportFile(validFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.questionCount).toBe(2);
    });
  });

  describe('convertToFirestoreDocument', () => {
    it('should convert question to firestore format', () => {
      const question: ImportPracticeQuestion = {
        domainId: 'people',
        taskId: 'people-1',
        question: 'What is a question?',
        choices: [
          { letter: 'A', text: 'Answer A', isCorrect: false },
          { letter: 'B', text: 'Answer B', isCorrect: true },
          { letter: 'C', text: 'Answer C', isCorrect: false },
          { letter: 'D', text: 'Answer D', isCorrect: false },
        ],
        explanation: 'This is the explanation',
        difficulty: 'easy',
        tags: ['tag1', 'tag2'],
        references: ['ref1'],
        version: 1,
      };

      const doc = convertToFirestoreDocument(question);

      expect(doc.id).toBeDefined();
      expect(doc.domainId).toBe('people');
      expect(doc.taskId).toBe('people-1');
      expect(doc.question).toBe('What is a question?');
      expect(doc.choices).toHaveLength(4);
      expect(doc.explanation).toBe('This is the explanation');
      expect(doc.difficulty).toBe('easy');
      expect(doc.tags).toContain('tag1');
      expect(doc.references).toContain('ref1');
      expect(doc.isActive).toBe(true);
      expect(doc.stats.totalAttempts).toBe(0);
      expect(doc.stats.correctAttempts).toBe(0);
      expect(doc.stats.successRate).toBe(0);
    });

    it('should generate unique IDs for different questions', () => {
      const question1: ImportPracticeQuestion = {
        domainId: 'people',
        taskId: 'people-1',
        question: 'Question 1?',
        choices: [
          { letter: 'A', text: 'A', isCorrect: true },
          { letter: 'B', text: 'B', isCorrect: false },
          { letter: 'C', text: 'C', isCorrect: false },
          { letter: 'D', text: 'D', isCorrect: false },
        ],
        explanation: 'Exp 1',
        difficulty: 'easy',
      };

      const question2: ImportPracticeQuestion = {
        domainId: 'people',
        taskId: 'people-1',
        question: 'Question 2?',
        choices: [
          { letter: 'A', text: 'A', isCorrect: true },
          { letter: 'B', text: 'B', isCorrect: false },
          { letter: 'C', text: 'C', isCorrect: false },
          { letter: 'D', text: 'D', isCorrect: false },
        ],
        explanation: 'Exp 2',
        difficulty: 'easy',
      };

      const doc1 = convertToFirestoreDocument(question1);
      const doc2 = convertToFirestoreDocument(question2);

      expect(doc1.id).not.toBe(doc2.id);
    });

    it('should set default values for optional fields', () => {
      const question: ImportPracticeQuestion = {
        domainId: 'people',
        taskId: 'people-1',
        question: 'What is a question?',
        choices: [
          { letter: 'A', text: 'Answer A', isCorrect: false },
          { letter: 'B', text: 'Answer B', isCorrect: true },
          { letter: 'C', text: 'Answer C', isCorrect: false },
          { letter: 'D', text: 'Answer D', isCorrect: false },
        ],
        explanation: 'This is the explanation',
        difficulty: 'easy',
      };

      const doc = convertToFirestoreDocument(question);

      expect(doc.tags).toEqual([]);
      expect(doc.references).toEqual([]);
      expect(doc.version).toBe(1);
    });
  });
});
