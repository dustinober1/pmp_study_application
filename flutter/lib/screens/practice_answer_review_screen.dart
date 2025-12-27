import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/practice_models.dart';

/// Screen for reviewing practice question answers with explanation and correct choice
///
/// Displays:
/// - Question text
/// - All answer choices with visual feedback (correct/incorrect/selected)
/// - Explanation and references
/// - Navigation buttons for next/previous questions
class PracticeAnswerReviewScreen extends ConsumerWidget {
  /// The practice question content being reviewed
  final PracticeQuestionContentModel question;

  /// The user's selected answer choice letter (A, B, C, D)
  final String selectedChoice;

  /// Whether the user's answer was correct
  final bool isCorrect;

  /// Current question number in the session (for display only)
  final int questionNumber;

  /// Total questions in the session (for display only)
  final int totalQuestions;

  /// Callback when user clicks next question
  final VoidCallback onNext;

  /// Callback when user clicks previous question (null if not available)
  final VoidCallback? onPrevious;

  /// Callback when user clicks continue to next (closes review)
  final VoidCallback onContinue;

  const PracticeAnswerReviewScreen({
    Key? key,
    required this.question,
    required this.selectedChoice,
    required this.isCorrect,
    required this.questionNumber,
    required this.totalQuestions,
    required this.onNext,
    this.onPrevious,
    required this.onContinue,
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final correctChoice = question.getCorrectChoice();
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('Question $questionNumber of $totalQuestions'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Result Header - Show correct/incorrect
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isCorrect
                    ? Colors.green.withOpacity(0.1)
                    : Colors.red.withOpacity(0.1),
                border: Border(
                  bottom: BorderSide(
                    color: isCorrect ? Colors.green : Colors.red,
                    width: 3,
                  ),
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    isCorrect ? Icons.check_circle : Icons.cancel,
                    size: 64,
                    color: isCorrect ? Colors.green : Colors.red,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isCorrect ? 'Correct!' : 'Incorrect',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: isCorrect ? Colors.green : Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (!isCorrect) ...[
                    const SizedBox(height: 8),
                    Text(
                      'The correct answer is ${correctChoice?.letter}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: isCorrect ? Colors.green : Colors.red,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Question Content
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Question Text
                  Text(
                    'Question',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    question.question,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w500,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Answer Choices
                  Text(
                    'Choices',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildAnswerChoices(
                    context,
                    question.choices,
                    correctChoice?.letter ?? '',
                    selectedChoice,
                  ),
                ],
              ),
            ),

            // Explanation Section
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDarkMode
                    ? Colors.blue.withOpacity(0.1)
                    : Colors.blue.withOpacity(0.05),
                border: Border.all(
                  color: Colors.blue.withOpacity(0.3),
                  width: 1,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.lightbulb_outline,
                        color: Colors.blue[400],
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Explanation',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: Colors.blue[400],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    question.explanation,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      height: 1.6,
                    ),
                  ),
                  if (question.references != null &&
                      question.references!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildReferences(context, question.references!),
                  ],
                ],
              ),
            ),

            // Difficulty Badge
            if (question.difficulty.isNotEmpty) ...[
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: [
                    _buildDifficultyBadge(
                      context,
                      question.difficulty,
                    ),
                    const SizedBox(width: 8),
                    if (question.tags.isNotEmpty)
                      Wrap(
                        spacing: 8,
                        children: question.tags
                            .take(2)
                            .map((tag) => Chip(
                          label: Text(
                            tag,
                            style: const TextTheme(
                              labelSmall: TextStyle(fontSize: 12),
                            ).labelSmall,
                          ),
                          padding: EdgeInsets.zero,
                          visualDensity: VisualDensity.compact,
                        ))
                            .toList(),
                      ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 32),

            // Navigation Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  // Previous button
                  if (onPrevious != null) ...[
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onPrevious,
                        icon: const Icon(Icons.arrow_back),
                        label: const Text('Previous'),
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],

                  // Next/Continue button
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onNext,
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('Next'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Continue to Results button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: OutlinedButton(
                onPressed: onContinue,
                child: const Text('Skip to Results'),
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  /// Build the answer choice cards with visual feedback
  Widget _buildAnswerChoices(
    BuildContext context,
    List<AnswerChoice> choices,
    String correctChoice,
    String selectedChoice,
  ) {
    return Column(
      children: choices.map((choice) {
        final isSelected = choice.letter == selectedChoice;
        final isCorrectAnswer = choice.letter == correctChoice;
        final isWrongSelection = isSelected && !isCorrect;

        Color? backgroundColor;
        Color? borderColor;
        Color? textColor;

        if (isCorrectAnswer) {
          backgroundColor = Colors.green.withOpacity(0.1);
          borderColor = Colors.green;
          textColor = Colors.green;
        } else if (isWrongSelection) {
          backgroundColor = Colors.red.withOpacity(0.1);
          borderColor = Colors.red;
          textColor = Colors.red;
        } else if (isSelected) {
          backgroundColor = Colors.blue.withOpacity(0.05);
          borderColor = Colors.blue;
          textColor = Colors.blue;
        }

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: borderColor ?? Colors.grey.withOpacity(0.3),
                width: borderColor != null ? 2 : 1,
              ),
              color: backgroundColor,
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Choice Letter
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: textColor?.withOpacity(0.2),
                    ),
                    child: Center(
                      child: Text(
                        choice.letter,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: textColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Choice Text
                  Expanded(
                    child: Text(
                      choice.text,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: textColor,
                        height: 1.5,
                      ),
                    ),
                  ),

                  // Feedback Icon
                  const SizedBox(width: 12),
                  if (isCorrectAnswer)
                    Icon(Icons.check_circle, color: Colors.green, size: 24)
                  else if (isWrongSelection)
                    Icon(Icons.cancel, color: Colors.red, size: 24)
                  else if (isSelected)
                    Icon(Icons.radio_button_checked, color: Colors.blue, size: 24),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  /// Build references section
  Widget _buildReferences(BuildContext context, List<String> references) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'References',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        ...references.map((ref) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            children: [
              Text('• ', style: Theme.of(context).textTheme.bodySmall),
              Expanded(
                child: Text(
                  ref,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        )),
      ],
    );
  }

  /// Build difficulty badge
  Widget _buildDifficultyBadge(
    BuildContext context,
    String difficulty,
  ) {
    Color badgeColor;
    Color badgeTextColor;

    switch (difficulty.toLowerCase()) {
      case 'easy':
        badgeColor = Colors.green.withOpacity(0.2);
        badgeTextColor = Colors.green;
      case 'hard':
        badgeColor = Colors.red.withOpacity(0.2);
        badgeTextColor = Colors.red;
      default: // medium
        badgeColor = Colors.orange.withOpacity(0.2);
        badgeTextColor = Colors.orange;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: badgeColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: badgeTextColor.withOpacity(0.5)),
      ),
      child: Text(
        difficulty.capitalize(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: badgeTextColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Extension for String capitalization
extension StringExtension on String {
  String capitalize() {
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}
