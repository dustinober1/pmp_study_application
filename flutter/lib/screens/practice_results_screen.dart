import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../models/practice_models.dart';
import '../providers/practice_provider.dart';
import '../widgets/performance_chart.dart';
import '../widgets/attempt_history_widget.dart';

class PracticeResultsScreen extends ConsumerWidget {
  final String sessionId;

  const PracticeResultsScreen({
    Key? key,
    required this.sessionId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(practiceSessionProvider(sessionId));
    final attemptsAsync = ref.watch(sessionAttemptsProvider(sessionId));
    final allQuestionsAsync = ref.watch(allPracticeQuestionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Practice Results'),
        elevation: 0,
      ),
      body: sessionAsync.when(
        data: (session) {
          if (session == null) {
            return Center(
              child: Text(
                'Session not found',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            );
          }

          return attemptsAsync.when(
            data: (attempts) {
              return allQuestionsAsync.when(
                data: (questions) {
                  // Build map of questions by ID for easy lookup
                  final questionsMap = {
                    for (final q in questions) q.id: q,
                  };

                  return SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header with overall score
                        _buildScoreHeader(context, session),
                        const SizedBox(height: 24),

                        // Session stats
                        _buildSessionStats(context, session, attempts),
                        const SizedBox(height: 24),

                        // Performance by domain
                        _buildPerformanceByDomain(context, attempts),
                        const SizedBox(height: 24),

                        // Performance by task
                        _buildPerformanceByTask(context, attempts),
                        const SizedBox(height: 24),

                        // Detailed attempt history
                        _buildDetailedHistory(context, attempts, questionsMap),
                        const SizedBox(height: 32),

                        // Action buttons
                        _buildActionButtons(context),
                        const SizedBox(height: 32),
                      ],
                    ),
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(),
                ),
                error: (error, st) => Center(
                  child: Text('Error loading questions: $error'),
                ),
              );
            },
            loading: () => const Center(
              child: CircularProgressIndicator(),
            ),
            error: (error, st) => Center(
              child: Text('Error loading attempts: $error'),
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, st) => Center(
          child: Text('Error loading session: $error'),
        ),
      ),
    );
  }

  Widget _buildScoreHeader(
    BuildContext context,
    PracticeSessionModel session,
  ) {
    final percentage = (session.successRate * 100).toStringAsFixed(1);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).primaryColor.withOpacity(0.8),
            Theme.of(context).primaryColor.withOpacity(0.6),
          ],
        ),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            'Practice Test Complete',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withOpacity(0.2),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$percentage%',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Score',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            '${session.correctAnswers}/${session.questionsAnswered} Correct',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSessionStats(
    BuildContext context,
    PracticeSessionModel session,
    List<PracticeAttemptModel> attempts,
  ) {
    final duration = _formatDuration(session.durationSeconds);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _StatCard(
            icon: Icons.done_all,
            label: 'Answered',
            value: '${session.questionsAnswered}',
          ),
          _StatCard(
            icon: Icons.skip_next,
            label: 'Skipped',
            value: '${session.questionsSkipped}',
          ),
          _StatCard(
            icon: Icons.timer,
            label: 'Duration',
            value: duration,
          ),
          _StatCard(
            icon: Icons.schedule,
            label: 'Avg/Question',
            value: _calculateAvgTime(session, attempts),
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceByDomain(
    BuildContext context,
    List<PracticeAttemptModel> attempts,
  ) {
    return PerformanceChart(
      attempts: attempts,
      byDomain: true,
    );
  }

  Widget _buildPerformanceByTask(
    BuildContext context,
    List<PracticeAttemptModel> attempts,
  ) {
    return PerformanceChart(
      attempts: attempts,
      byDomain: false,
    );
  }

  Widget _buildDetailedHistory(
    BuildContext context,
    List<PracticeAttemptModel> attempts,
    Map<String, PracticeQuestionContentModel> questionsMap,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Detailed History',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          AttemptHistoryWidget(
            attempts: attempts,
            questionsMap: questionsMap,
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.home),
              label: const Text('Back to Home'),
              onPressed: () {
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.replay),
              label: const Text('Practice Again'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ),
        ],
      ),
    );
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    if (minutes > 0) {
      return '${minutes}m ${secs}s';
    }
    return '${secs}s';
  }

  String _calculateAvgTime(
    PracticeSessionModel session,
    List<PracticeAttemptModel> attempts,
  ) {
    if (attempts.isEmpty) return '0s';
    final totalTime = attempts.fold<int>(0, (sum, a) => sum + a.timeSpent);
    final avg = totalTime ~/ attempts.length;
    return '${avg}s';
  }
}

/// Individual stat card widget
class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(
          icon,
          color: Theme.of(context).primaryColor,
          size: 28,
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}
