import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/practice_models.dart';
import '../providers/practice_provider.dart';

/// Screen displaying practice session results and summary
/// Shows:
/// - Overall score and success rate
/// - Time spent
/// - Questions breakdown (correct, incorrect, skipped)
/// - Domain/task performance
/// - Options to review answers or start a new session
class PracticeSessionResultsScreen extends ConsumerWidget {
  /// The completed practice session
  final PracticeSessionModel session;

  /// List of attempts made during the session
  final List<PracticeAttemptModel> attempts;

  /// Callback when user wants to review answers
  final VoidCallback? onReviewAnswers;

  /// Callback when user wants to start a new session
  final VoidCallback onNewSession;

  const PracticeSessionResultsScreen({
    Key? key,
    required this.session,
    required this.attempts,
    this.onReviewAnswers,
    required this.onNewSession,
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final correctCount = session.correctAnswers;
    final totalAnswered = session.questionsAnswered;
    final successRate = session.successRate;
    final durationMinutes = (session.durationSeconds / 60).toStringAsFixed(1);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Session Results'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Score Card
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.blue[400]!,
                    Colors.blue[600]!,
                  ],
                ),
              ),
              child: Column(
                children: [
                  Text(
                    'Session Complete',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    '$correctCount / $totalAnswered',
                    style: const TextStyle(
                      fontSize: 56,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${(successRate * 100).toStringAsFixed(1)}% Success Rate',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white70,
                        ),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Session Details
                  _buildDetailCard(
                    context,
                    title: 'Session Details',
                    details: [
                      (
                        label: 'Duration',
                        value: '$durationMinutes minutes',
                        icon: Icons.schedule
                      ),
                      (
                        label: 'Questions Answered',
                        value: totalAnswered.toString(),
                        icon: Icons.check_circle
                      ),
                      (
                        label: 'Correct Answers',
                        value: correctCount.toString(),
                        icon: Icons.check_circle_outline
                      ),
                      (
                        label: 'Skipped',
                        value: session.questionsSkipped.toString(),
                        icon: Icons.skip_next
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Performance Breakdown
                  _buildPerformanceBreakdown(
                    context,
                    correctCount: correctCount,
                    incorrectCount: session.incorrectAnswers,
                    skippedCount: session.questionsSkipped,
                  ),
                  const SizedBox(height: 24),

                  // Scope Info
                  _buildScopeCard(context, session.scope),
                  const SizedBox(height: 32),

                  // Action Buttons
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: onNewSession,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text('Start New Session'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (onReviewAnswers != null)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: onReviewAnswers,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: const Text('Review Answers'),
                      ),
                    ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text('Back to Home'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailCard(
    BuildContext context, {
    required String title,
    required List<(String label, String value, IconData icon)> details,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[200]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: details.asMap().entries.map((entry) {
              final isLast = entry.key == details.length - 1;
              final detail = entry.value;

              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          detail.$3,
                          size: 20,
                          color: Colors.blue,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            detail.$1,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
                        Text(
                          detail.$2,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: Colors.blue,
                              ),
                        ),
                      ],
                    ),
                  ),
                  if (!isLast)
                    Divider(
                      height: 1,
                      color: Colors.grey[200],
                      indent: 48,
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildPerformanceBreakdown(
    BuildContext context, {
    required int correctCount,
    required int incorrectCount,
    required int skippedCount,
  }) {
    final total = correctCount + incorrectCount + skippedCount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Performance Breakdown',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 16),
        // Progress bar
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Row(
            children: [
              Expanded(
                flex: correctCount,
                child: Container(
                  height: 24,
                  color: Colors.green,
                ),
              ),
              Expanded(
                flex: incorrectCount,
                child: Container(
                  height: 24,
                  color: Colors.red,
                ),
              ),
              Expanded(
                flex: skippedCount,
                child: Container(
                  height: 24,
                  color: Colors.grey[300],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildBreakdownItem(
              context,
              label: 'Correct',
              count: correctCount,
              total: total,
              color: Colors.green,
            ),
            _buildBreakdownItem(
              context,
              label: 'Incorrect',
              count: incorrectCount,
              total: total,
              color: Colors.red,
            ),
            _buildBreakdownItem(
              context,
              label: 'Skipped',
              count: skippedCount,
              total: total,
              color: Colors.grey,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBreakdownItem(
    BuildContext context, {
    required String label,
    required int count,
    required int total,
    required Color color,
  }) {
    final percentage = total > 0 ? (count / total * 100).toStringAsFixed(0) : '0';

    return Column(
      children: [
        Text(
          '$count',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          '$percentage%',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _buildScopeCard(
    BuildContext context,
    PracticeSessionScope scope,
  ) {
    String scopeText;
    String scopeDescription;

    switch (scope.type) {
      case 'domain':
        scopeText = 'Domain Practice';
        scopeDescription = scope.domainId ?? 'Unknown Domain';
      case 'task':
        scopeText = 'Task Practice';
        scopeDescription = scope.taskId ?? 'Unknown Task';
      default:
        scopeText = 'All Questions';
        scopeDescription = 'Full question bank';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[200]!),
        borderRadius: BorderRadius.circular(12),
        color: Colors.blue.withOpacity(0.05),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            color: Colors.blue,
            size: 24,
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                scopeText,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: Colors.blue,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                scopeDescription,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
