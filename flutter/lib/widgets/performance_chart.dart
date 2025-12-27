import 'package:flutter/material.dart';
import '../models/practice_models.dart';

/// Widget to display performance breakdown by domain/task
class PerformanceChart extends StatelessWidget {
  final List<PracticeAttemptModel> attempts;
  final bool byDomain;

  const PerformanceChart({
    Key? key,
    required this.attempts,
    this.byDomain = true,
  }) : super(key: key);

  Map<String, ({int correct, int total})> _calculateStats() {
    final stats = <String, ({int correct, int total})>{};

    for (final attempt in attempts) {
      final key = byDomain ? attempt.domainId : attempt.taskId;
      final current = stats[key] ?? (correct: 0, total: 0);

      if (!attempt.skipped) {
        stats[key] = (
          correct: current.correct + (attempt.isCorrect ? 1 : 0),
          total: current.total + 1,
        );
      }
    }

    return stats;
  }

  @override
  Widget build(BuildContext context) {
    final stats = _calculateStats();

    if (stats.isEmpty) {
      return Center(
        child: Text(
          'No data available',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            byDomain ? 'Performance by Domain' : 'Performance by Task',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 16),
        ...stats.entries.map((entry) {
          final key = entry.key;
          final correct = entry.value.correct;
          final total = entry.value.total;
          final percentage = total > 0 ? (correct / total * 100).toStringAsFixed(1) : '0.0';

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        key,
                        style: Theme.of(context).textTheme.bodyMedium,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '$correct/$total',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: total > 0 ? correct / total : 0,
                    minHeight: 8,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _getColor(double.parse(percentage)),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$percentage%',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: _getColor(double.parse(percentage)),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Color _getColor(double percentage) {
    if (percentage >= 80) return Colors.green;
    if (percentage >= 60) return Colors.orange;
    return Colors.red;
  }
}
