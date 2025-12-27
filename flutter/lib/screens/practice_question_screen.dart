import 'package:flutter/material.dart';
import '../models/practice_models.dart';

/// Screen for displaying a single practice question with answer choices
///
/// Allows user to:
/// - Read the question
/// - Select one of four multiple choice answers
/// - Submit their answer
class PracticeQuestionScreen extends StatelessWidget {
  /// The practice question to display
  final PracticeQuestionContentModel question;

  /// Current question number for display
  final int questionNumber;

  /// Total questions in the session
  final int totalQuestions;

  /// Callback when user selects an answer
  final Function(String) onAnswerSelected;

  /// Currently selected answer choice (null if not yet selected)
  final String? selectedChoice;

  const PracticeQuestionScreen({
    Key? key,
    required this.question,
    required this.questionNumber,
    required this.totalQuestions,
    required this.onAnswerSelected,
    this.selectedChoice,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('Question $questionNumber of $totalQuestions'),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Progress indicator
          LinearProgressIndicator(
            value: questionNumber / totalQuestions,
            minHeight: 4,
          ),

          // Question content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Difficulty badge
                  _buildDifficultyBadge(context),
                  const SizedBox(height: 16),

                  // Question text
                  Text(
                    question.question,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      height: 1.6,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Answer choices
                  Text(
                    'Select your answer:',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildAnswerChoices(context),
                  const SizedBox(height: 24),

                  // Helper text
                  if (selectedChoice == null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Colors.blue.withOpacity(0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: Colors.blue[400],
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Tap an answer to submit and see the explanation',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Build answer choice buttons
  Widget _buildAnswerChoices(BuildContext context) {
    return Column(
      children: question.choices.map((choice) {
        final isSelected = choice.letter == selectedChoice;

        return GestureDetector(
          onTap: () => onAnswerSelected(choice.letter),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected
                      ? Colors.blue
                      : Colors.grey.withOpacity(0.3),
                  width: isSelected ? 2 : 1,
                ),
                color: isSelected
                    ? Colors.blue.withOpacity(0.05)
                    : Colors.transparent,
              ),
              child: Material(
                color: Colors.transparent,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      // Letter circle
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected
                              ? Colors.blue
                              : Colors.grey.withOpacity(0.2),
                        ),
                        child: Center(
                          child: Text(
                            choice.letter,
                            style: Theme.of(context)
                                .textTheme
                                .labelLarge
                                ?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white : null,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),

                      // Choice text
                      Expanded(
                        child: Text(
                          choice.text,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                            height: 1.5,
                          ),
                        ),
                      ),

                      // Selection indicator
                      if (isSelected)
                        Icon(
                          Icons.radio_button_checked,
                          color: Colors.blue,
                          size: 24,
                        )
                      else
                        Icon(
                          Icons.radio_button_unchecked,
                          color: Colors.grey.withOpacity(0.5),
                          size: 24,
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  /// Build difficulty badge
  Widget _buildDifficultyBadge(BuildContext context) {
    Color badgeColor;
    Color badgeTextColor;
    Color badgeBgColor;

    switch (question.difficulty.toLowerCase()) {
      case 'easy':
        badgeColor = Colors.green;
        badgeTextColor = Colors.green;
        badgeBgColor = Colors.green.withOpacity(0.1);
      case 'hard':
        badgeColor = Colors.red;
        badgeTextColor = Colors.red;
        badgeBgColor = Colors.red.withOpacity(0.1);
      default: // medium
        badgeColor = Colors.orange;
        badgeTextColor = Colors.orange;
        badgeBgColor = Colors.orange.withOpacity(0.1);
    }

    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: badgeBgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: badgeColor.withOpacity(0.5)),
          ),
          child: Text(
            question.difficulty.capitalize(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: badgeTextColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        if (question.tags.isNotEmpty) ...[
          const SizedBox(width: 8),
          Wrap(
            spacing: 6,
            children: question.tags
                .take(2)
                .map((tag) => Chip(
                  label: Text(
                    tag,
                    style: const TextTheme(
                      labelSmall: TextStyle(fontSize: 11),
                    ).labelSmall,
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  visualDensity: VisualDensity.compact,
                ))
                .toList(),
          ),
        ],
      ],
    );
  }
}

/// Extension for String capitalization
extension StringExtension on String {
  String capitalize() {
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}
