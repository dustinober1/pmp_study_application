import 'package:flutter_test/flutter_test.dart';
import 'package:pmp_study_app/models/practice_models.dart';
import 'package:pmp_study_app/services/json_import_service.dart';

void main() {
  group('JsonImportService', () {
    group('parseJsonString', () {
      test('parses valid JSON with single question', () async {
        const jsonString = '''
        {
          "questions": [
            {
              "domainId": "people",
              "taskId": "people-1",
              "question": "What is conflict resolution?",
              "choices": [
                {"letter": "A", "text": "Choice A", "isCorrect": false},
                {"letter": "B", "text": "Choice B", "isCorrect": true},
                {"letter": "C", "text": "Choice C", "isCorrect": false},
                {"letter": "D", "text": "Choice D", "isCorrect": false}
              ],
              "explanation": "This is the correct answer",
              "difficulty": "medium",
              "tags": ["tag1"]
            }
          ]
        }
        ''';

        final questions = await JsonImportService.parseJsonString(jsonString);

        expect(questions.length, 1);
        expect(questions[0].domainId, 'people');
        expect(questions[0].question, 'What is conflict resolution?');
        expect(questions[0].choices.length, 4);
      });

      test('parses valid JSON with multiple questions', () async {
        const jsonString = '''
        {
          "questions": [
            {
              "domainId": "people",
              "taskId": "people-1",
              "question": "Question 1?",
              "choices": [
                {"letter": "A", "text": "A", "isCorrect": true},
                {"letter": "B", "text": "B", "isCorrect": false},
                {"letter": "C", "text": "C", "isCorrect": false},
                {"letter": "D", "text": "D", "isCorrect": false}
              ],
              "explanation": "Explanation 1"
            },
            {
              "domainId": "process",
              "taskId": "process-1",
              "question": "Question 2?",
              "choices": [
                {"letter": "A", "text": "A", "isCorrect": false},
                {"letter": "B", "text": "B", "isCorrect": true},
                {"letter": "C", "text": "C", "isCorrect": false},
                {"letter": "D", "text": "D", "isCorrect": false}
              ],
              "explanation": "Explanation 2"
            }
          ]
        }
        ''';

        final questions = await JsonImportService.parseJsonString(jsonString);

        expect(questions.length, 2);
        expect(questions[0].domainId, 'people');
        expect(questions[1].domainId, 'process');
      });

      test('throws error on invalid JSON structure', () async {
        const jsonString = '{"invalid": "structure"}';

        expect(
          () => JsonImportService.parseJsonString(jsonString),
          throwsA(isA<JsonImportException>()),
        );
      });

      test('throws error when questions is not an array', () async {
        const jsonString = '''
        {
          "questions": {
            "invalid": "structure"
          }
        }
        ''';

        expect(
          () => JsonImportService.parseJsonString(jsonString),
          throwsA(isA<JsonImportException>()),
        );
      });

      test('throws error on missing required field', () async {
        const jsonString = '''
        {
          "questions": [
            {
              "domainId": "people",
              "question": "Missing explanation?",
              "choices": [
                {"letter": "A", "text": "A", "isCorrect": true},
                {"letter": "B", "text": "B", "isCorrect": false},
                {"letter": "C", "text": "C", "isCorrect": false},
                {"letter": "D", "text": "D", "isCorrect": false}
              ]
            }
          ]
        }
        ''';

        expect(
          () => JsonImportService.parseJsonString(jsonString),
          throwsA(isA<JsonImportException>()),
        );
      });

      test('throws error when not exactly 4 choices', () async {
        const jsonString = '''
        {
          "questions": [
            {
              "domainId": "people",
              "taskId": "people-1",
              "question": "Question?",
              "choices": [
                {"letter": "A", "text": "A", "isCorrect": true},
                {"letter": "B", "text": "B", "isCorrect": false}
              ],
              "explanation": "Explanation"
            }
          ]
        }
        ''';

        expect(
          () => JsonImportService.parseJsonString(jsonString),
          throwsA(isA<JsonImportException>()),
        );
      });

      test('throws error when no correct answer marked', () async {
        const jsonString = '''
        {
          "questions": [
            {
              "domainId": "people",
              "taskId": "people-1",
              "question": "Question?",
              "choices": [
                {"letter": "A", "text": "A", "isCorrect": false},
                {"letter": "B", "text": "B", "isCorrect": false},
                {"letter": "C", "text": "C", "isCorrect": false},
                {"letter": "D", "text": "D", "isCorrect": false}
              ],
              "explanation": "Explanation"
            }
          ]
        }
        ''';

        expect(
          () => JsonImportService.parseJsonString(jsonString),
          throwsA(isA<JsonImportException>()),
        );
      });

      test('throws error when multiple correct answers', () async {
        const jsonString = '''
        {
          "questions": [
            {
              "domainId": "people",
              "taskId": "people-1",
              "question": "Question?",
              "choices": [
                {"letter": "A", "text": "A", "isCorrect": true},
                {"letter": "B", "text": "B", "isCorrect": true},
                {"letter": "C", "text": "C", "isCorrect": false},
                {"letter": "D", "text": "D", "isCorrect": false}
              ],
              "explanation": "Explanation"
            }
          ]
        }
        ''';

        expect(
          () => JsonImportService.parseJsonString(jsonString),
          throwsA(isA<JsonImportException>()),
        );
      });
    });

    group('isValidDomainId', () {
      test('accepts valid domain IDs', () {
        expect(JsonImportService.isValidDomainId('people'), true);
        expect(JsonImportService.isValidDomainId('process'), true);
        expect(JsonImportService.isValidDomainId('business-environment'), true);
      });

      test('rejects invalid domain IDs', () {
        expect(JsonImportService.isValidDomainId('invalid'), false);
        expect(JsonImportService.isValidDomainId('People'), false); // Case sensitive
      });
    });

    group('isValidDifficulty', () {
      test('accepts valid difficulties', () {
        expect(JsonImportService.isValidDifficulty('easy'), true);
        expect(JsonImportService.isValidDifficulty('medium'), true);
        expect(JsonImportService.isValidDifficulty('hard'), true);
      });

      test('rejects invalid difficulties', () {
        expect(JsonImportService.isValidDifficulty('invalid'), false);
        expect(JsonImportService.isValidDifficulty('Easy'), false); // Case sensitive
      });
    });
  });
}
