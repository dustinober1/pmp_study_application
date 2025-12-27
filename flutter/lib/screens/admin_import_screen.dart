import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/practice_models.dart';
import '../providers/json_import_provider.dart';
import '../services/file_picker_service.dart';
import '../services/json_import_service.dart';
import '../widgets/error_widgets.dart';
import '../widgets/loading_widgets.dart';

/// Admin screen for importing practice questions from JSON files
///
/// This screen allows admins to:
/// 1. Select a JSON file from device storage
/// 2. Preview and validate questions
/// 3. Import questions to Firestore
class AdminImportScreen extends ConsumerStatefulWidget {
  const AdminImportScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<AdminImportScreen> createState() => _AdminImportScreenState();
}

class _AdminImportScreenState extends ConsumerState<AdminImportScreen> {
  File? _selectedFile;
  List<PracticeQuestionContentModel>? _previewQuestions;
  List<String>? _validationErrors;
  bool _showPreview = false;

  @override
  Widget build(BuildContext context) {
    final importState = ref.watch(jsonImportProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Import Practice Questions'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Section 1: File Selection
              _buildFileSelectionSection(context),
              const SizedBox(height: 24),

              // Section 2: Preview (if file selected)
              if (_selectedFile != null && _previewQuestions != null)
                _buildPreviewSection(context),

              // Section 3: Status/Results
              if (importState.isLoading)
                _buildLoadingSection(context)
              else if (importState.isSuccess)
                _buildSuccessSection(context, importState)
              else if (importState.errorMessage != null)
                _buildErrorSection(context, importState),

              // Validation Errors
              if (_validationErrors != null && _validationErrors!.isNotEmpty)
                _buildValidationErrorsSection(context),

              const SizedBox(height: 24),

              // Action Buttons
              _buildActionButtons(context, importState),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFileSelectionSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Step 1: Select JSON File',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Choose a JSON file containing practice questions. The file should follow the standard format with a "questions" array.',
          style: TextStyle(color: Colors.grey),
        ),
        const SizedBox(height: 16),
        if (_selectedFile == null)
          ElevatedButton.icon(
            onPressed: () => _pickFile(context),
            icon: const Icon(Icons.folder_open),
            label: const Text('Select JSON File'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 12,
              ),
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.1),
              border: Border.all(color: Colors.green),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.green),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'File selected',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      Text(
                        _selectedFile!.path.split('/').last,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() {
                    _selectedFile = null;
                    _previewQuestions = null;
                    _validationErrors = null;
                    _showPreview = false;
                  }),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildPreviewSection(BuildContext context) {
    final totalQuestions = _previewQuestions?.length ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Step 2: Preview Questions',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.1),
            border: Border.all(color: Colors.blue),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(Icons.info, color: Colors.blue),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Found $totalQuestions questions',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (!_showPreview)
          TextButton(
            onPressed: () => setState(() => _showPreview = true),
            child: const Text('Show Preview'),
          )
        else
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextButton(
                onPressed: () => setState(() => _showPreview = false),
                child: const Text('Hide Preview'),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 400,
                child: ListView.builder(
                  itemCount: _previewQuestions!.length,
                  itemBuilder: (context, index) {
                    final question = _previewQuestions![index];
                    return _buildQuestionPreviewCard(context, question, index);
                  },
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildQuestionPreviewCard(
    BuildContext context,
    PracticeQuestionContentModel question,
    int index,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Q${index + 1}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    question.question,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Chip(
                  label: Text(question.domainId),
                  backgroundColor: Colors.blue.withOpacity(0.2),
                  labelStyle: const TextStyle(fontSize: 12),
                ),
                const SizedBox(width: 8),
                Chip(
                  label: Text(question.difficulty),
                  backgroundColor: _getDifficultyColor(question.difficulty)
                      .withOpacity(0.2),
                  labelStyle: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildValidationErrorsSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        const Text(
          'Validation Errors',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Colors.red,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.red.withOpacity(0.1),
            border: Border.all(color: Colors.red),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ..._validationErrors!.map(
                (error) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          error,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          const LoadingSpinner(),
          const SizedBox(height: 16),
          Text(
            'Importing questions...',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessSection(BuildContext context, JsonImportState state) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.green.withOpacity(0.1),
          border: Border.all(color: Colors.green),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 32),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Import Successful',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${state.importedCount} questions imported',
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorSection(BuildContext context, JsonImportState state) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: ErrorWidget(
        title: 'Import Failed',
        message: state.errorMessage ?? 'An unknown error occurred',
        onRetry: () {
          ref.read(jsonImportProvider.notifier).reset();
        },
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, JsonImportState state) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        TextButton(
          onPressed: state.isLoading
              ? null
              : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        const SizedBox(width: 12),
        if (_previewQuestions != null && _validationErrors == null)
          ElevatedButton(
            onPressed: state.isLoading ? null : () => _importQuestions(),
            child: const Text('Import'),
          ),
      ],
    );
  }

  Future<void> _pickFile(BuildContext context) async {
    try {
      final file = await FilePickerService.pickJsonFile();
      if (file == null) return;

      // Validate file
      if (!FilePickerService.isJsonFile(file)) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a JSON file')),
        );
        return;
      }

      // Parse and preview
      final importer = ref.read(jsonImportProvider.notifier);
      try {
        final questions = await importer.parseJsonFile(file);
        final errors = await importer.validateQuestions(questions);

        if (!mounted) return;
        setState(() {
          _selectedFile = file;
          _previewQuestions = questions;
          _validationErrors = errors.isNotEmpty ? errors : null;
        });
      } on JsonImportException catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _importQuestions() async {
    if (_selectedFile == null) return;

    try {
      final importer = ref.read(jsonImportProvider.notifier);
      await importer.importFromFile(_selectedFile!);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Questions imported successfully')),
      );

      // Reset state after successful import
      await Future.delayed(const Duration(seconds: 2));
      if (!mounted) return;
      setState(() {
        _selectedFile = null;
        _previewQuestions = null;
        _validationErrors = null;
        _showPreview = false;
      });
      importer.reset();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Import failed: $e')),
      );
    }
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty) {
      case 'easy':
        return Colors.green;
      case 'hard':
        return Colors.red;
      case 'medium':
      default:
        return Colors.orange;
    }
  }
}
