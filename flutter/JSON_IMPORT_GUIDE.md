# Flutter JSON Import Utility Guide

## Overview

The Flutter JSON Import Utility provides a comprehensive system for admin users to bulk import practice questions from JSON files into the PMP Study App. It includes validation, error handling, and a user-friendly admin interface.

## Features

- **JSON File Parsing**: Robust parsing with detailed error messages
- **Question Validation**: Validates domain IDs, difficulty levels, answer choices, and more
- **Preview Before Import**: Shows all questions before importing to Firestore
- **Batch Operations**: Efficient Firestore batch writes for large imports
- **Error Handling**: Clear error messages for invalid data
- **Riverpod Integration**: State management for import operations

## Architecture

### Core Components

#### 1. **JsonImportService** (`services/json_import_service.dart`)
Low-level JSON parsing and validation logic.

**Key Methods:**
- `parseJsonFile(File file)` - Parse a JSON file
- `parseJsonString(String jsonString)` - Parse JSON from string
- `isValidDomainId(String domainId)` - Validate domain ID
- `isValidDifficulty(String difficulty)` - Validate difficulty level

#### 2. **FilePickerService** (`services/file_picker_service.dart`)
Platform-specific file picker operations (Android/iOS).

**Key Methods:**
- `pickJsonFile()` - Open native file picker
- `isJsonFile(File file)` - Validate file extension
- `getFileSize(File file)` - Get human-readable file size

#### 3. **PracticeService Extensions** (`services/practice_service.dart`)
Enhanced with import methods:

- `importPracticeQuestionsFromFile(File)` - Import from file
- `importPracticeQuestionsFromString(String)` - Import from string
- `importParsedPracticeQuestions(List)` - Import pre-validated questions

#### 4. **JsonImportProvider** (`providers/json_import_provider.dart`)
Riverpod state management for import operations.

**State Model:**
```dart
class JsonImportState {
  bool isLoading;           // Import in progress
  bool isSuccess;           // Import succeeded
  String? errorMessage;     // Error details
  int? importedCount;       // Questions imported
  List<String>? validationErrors; // Validation failures
}
```

#### 5. **AdminImportScreen** (`screens/admin_import_screen.dart`)
User interface for importing questions:
- Step 1: Select JSON file
- Step 2: Preview and validate
- Step 3: Import confirmation

## JSON File Format

Required JSON structure:

```json
{
  "questions": [
    {
      "domainId": "people",
      "taskId": "people-1",
      "question": "Which conflict resolution technique is best when both parties need to win?",
      "choices": [
        {
          "letter": "A",
          "text": "Withdrawing/Avoiding",
          "isCorrect": false
        },
        {
          "letter": "B",
          "text": "Collaborating/Problem Solving",
          "isCorrect": true
        },
        {
          "letter": "C",
          "text": "Compromising/Reconciling",
          "isCorrect": false
        },
        {
          "letter": "D",
          "text": "Forcing/Directing",
          "isCorrect": false
        }
      ],
      "explanation": "Collaborating/Problem Solving is the best choice because...",
      "references": ["PMBOK 7th Edition, Section 2.3.7.1"],
      "difficulty": "medium",
      "tags": ["conflict-resolution", "stakeholder-management"],
      "version": 1,
      "isActive": true
    }
  ]
}
```

### Required Fields

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `domainId` | String | `people`, `process`, `business-environment` | PMP domain |
| `taskId` | String | `domain-number` | Specific task within domain |
| `question` | String | Any non-empty string | Question text |
| `choices` | Array | 4 objects | Answer choices (A, B, C, D) |
| `explanation` | String | Any non-empty string | Why answer is correct |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `references` | Array | `null` | PMBOK references |
| `difficulty` | String | `medium` | `easy`, `medium`, or `hard` |
| `tags` | Array | `[]` | Topic tags |
| `version` | Number | `1` | Content version |
| `isActive` | Boolean | `true` | Active in system |

### Answer Choice Format

Each choice must have:
- `letter`: `A`, `B`, `C`, or `D`
- `text`: Choice description
- `isCorrect`: Boolean (exactly one must be `true`)

## Usage

### Basic Import (File)

```dart
// In your admin screen
final importer = ref.read(jsonImportProvider.notifier);

// Pick file
final file = await FilePickerService.pickJsonFile();

// Parse and validate
final questions = await importer.parseJsonFile(file);
final errors = await importer.validateQuestions(questions);

if (errors.isEmpty) {
  // Import to Firestore
  final count = await importer.importFromFile(file);
  print('Imported $count questions');
}
```

### Import from String

```dart
final importer = ref.read(jsonImportProvider.notifier);
final count = await importer.importFromString(jsonString);
```

### Direct Service Usage

```dart
final service = ref.read(practiceServiceProvider);

// From file
final count = await service.importPracticeQuestionsFromFile(file);

// From string
final count = await service.importPracticeQuestionsFromString(jsonString);

// Pre-validated questions
final questions = [...];
final count = await service.importParsedPracticeQuestions(questions);
```

## Error Handling

### JsonImportException

Thrown for all import-related errors:

```dart
try {
  final questions = await JsonImportService.parseJsonFile(file);
} on JsonImportException catch (e) {
  print('Error: ${e.message}');
  if (e.originalError != null) {
    print('Cause: ${e.originalError}');
  }
}
```

### Common Validation Errors

1. **Invalid JSON Structure**
   - Root must be an object with "questions" array

2. **Missing Required Fields**
   - domainId, taskId, question, choices, explanation

3. **Invalid Domain ID**
   - Must be: people, process, business-environment

4. **Invalid Difficulty**
   - Must be: easy, medium, hard

5. **Choice Count**
   - Must have exactly 4 choices

6. **Correct Answer**
   - Must have exactly 1 correct answer

## Testing

### Unit Tests

Run tests with:
```bash
cd flutter
flutter test test/services/json_import_service_test.dart
```

Test coverage includes:
- Valid JSON parsing
- Multiple questions
- Error conditions
- Domain ID validation
- Difficulty validation

### Manual Testing

1. **Create test JSON file** with 5-10 questions
2. **Use AdminImportScreen**:
   - Navigate to admin import screen
   - Select JSON file
   - Review preview
   - Verify validation errors (if any)
   - Import questions
3. **Verify in Firestore**:
   - Check practiceQuestions collection
   - Confirm question count
   - Verify answer structures

## Dependencies

The JSON import utility uses:
- `flutter` - Core framework
- `riverpod` & `flutter_riverpod` - State management
- `cloud_firestore` - Database operations
- `json_annotation` - Model serialization (existing)

**Optional (for file picker):**
- `file_picker: ^5.5.0` - Native file selection

## Integration with Admin UI

To add import to your admin UI:

```dart
// In your admin dashboard/settings
ElevatedButton(
  onPressed: () {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const AdminImportScreen(),
      ),
    );
  },
  child: const Text('Import Questions'),
)
```

## Performance Considerations

1. **Batch Size**: Firestore batch operations support ~500 operations
   - Current implementation handles this automatically
   - Large imports (1000+) may need splitting

2. **Validation**: All questions validated before Firestore write
   - Prevents partial imports on error
   - Detailed error reporting

3. **Async Operations**: All imports are async
   - UI remains responsive
   - Loading states provided

## Future Enhancements

- CSV import support
- Bulk question updates
- Import templates/samples
- Progress tracking for large imports
- Duplicate detection
- Question versioning/history

## Troubleshooting

### File Picker Not Working
- Ensure `file_picker` package is added to `pubspec.yaml`
- Check platform-specific permissions (Android/iOS)
- Test with different file apps

### Import Fails with "No valid questions found"
- Verify JSON structure matches format
- Check all required fields present
- Validate domain IDs and difficulty values

### Validation Errors for Valid Data
- Check field types (string vs number)
- Verify difficulty values case-sensitive
- Ensure exactly 4 choices with 1 correct

## Example JSON Files

### Single Question
See `data/seed/practice-questions.json` for complete example format.

### Bulk Import
Create a JSON file with multiple questions following the same structure.

## API Reference

### JsonImportService

```dart
// Static methods
static Future<List<PracticeQuestionContentModel>> parseJsonFile(File file)
static Future<List<PracticeQuestionContentModel>> parseJsonString(String json)
static bool isValidDomainId(String domainId)
static bool isValidDifficulty(String difficulty)
static Future<List<PracticeQuestionContentModel>> loadSampleQuestions()
```

### PracticeService

```dart
// Import methods
Future<int> importPracticeQuestionsFromFile(File jsonFile)
Future<int> importPracticeQuestionsFromString(String jsonString)
Future<int> importParsedPracticeQuestions(List<PracticeQuestionContentModel> questions)
```

### JsonImportProvider

```dart
// Notifier methods
Future<List<PracticeQuestionContentModel>> parseJsonFile(File file)
Future<List<PracticeQuestionContentModel>> parseJsonString(String jsonString)
Future<List<String>> validateQuestions(List<PracticeQuestionContentModel> questions)
Future<int> importFromFile(File file)
Future<int> importFromString(String jsonString)
void reset()
```
