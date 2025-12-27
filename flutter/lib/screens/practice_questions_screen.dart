import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/practice_models.dart';
import '../providers/practice_provider.dart';
import '../providers/firebase_provider.dart';
import '../services/practice_service.dart';

class PracticeQuestionsScreen extends ConsumerStatefulWidget {
  final String? domainId;
  final String? taskId;
  final String? sessionId;
  final Function(PracticeSessionModel, List<PracticeAttemptModel>)?
      onSessionComplete;

  const PracticeQuestionsScreen({
    Key? key,
    this.domainId,
    this.taskId,
    this.sessionId,
    this.onSessionComplete,
  }) : super(key: key);

  @override
  ConsumerState<PracticeQuestionsScreen> createState() =>
      _PracticeQuestionsScreenState();
}

class _PracticeQuestionsScreenState extends ConsumerState<PracticeQuestionsScreen>
    with TickerProviderStateMixin {
  int _currentQuestionIndex = 0;
  int _correctCount = 0;
  int _totalAnswered = 0;
  bool _showFeedback = false;
  String? _selectedChoice;
  late Stopwatch _questionTimer;
  late AnimationController _feedbackAnimationController;

  @override
  void initState() {
    super.initState();
    _questionTimer = Stopwatch()..start();
    _feedbackAnimationController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _questionTimer.stop();
    _feedbackAnimationController.dispose();
    super.dispose();
  }

  void _selectChoice(String letter) {
    if (_showFeedback) return; // Prevent changing answer after submission

    setState(() {
      _selectedChoice = letter;
    });
  }

  void _submitAnswer(PracticeQuestionContentModel question) {
    if (_selectedChoice == null) return;

    final isCorrect = question
        .choices
        .firstWhere((c) => c.letter == _selectedChoice!)
        .isCorrect;

    setState(() {
      _showFeedback = true;
      _totalAnswered++;
      if (isCorrect) {
        _correctCount++;
      }
    });

    _feedbackAnimationController.forward();
  }

  void _nextQuestion(List<PracticeQuestionContentModel> questions) {
    if (_currentQuestionIndex < questions.length - 1) {
      setState(() {
        _currentQuestionIndex++;
        _selectedChoice = null;
        _showFeedback = false;
        _questionTimer.reset();
      });
      _feedbackAnimationController.reset();
    } else {
      _showCompletionDialog();
    }
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Session Complete'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Score: $_correctCount / $_totalAnswered',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            Text(
              'Success Rate: ${(_correctCount / _totalAnswered * 100).toStringAsFixed(1)}%',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final questionsAsync = widget.domainId != null
        ? ref.watch(practiceQuestionsByDomainProvider(widget.domainId!))
        : widget.taskId != null
            ? ref.watch(practiceQuestionsByTaskProvider(widget.taskId!))
            : ref.watch(allPracticeQuestionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Practice Questions'),
        elevation: 0,
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '${_currentQuestionIndex + 1} / ${questionsAsync.whenData((q) => q.length).value ?? '?'}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ),
        ],
      ),
      body: questionsAsync.when(
        data: (questions) {
          if (questions.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.quiz,
                    size: 80,
                    color: Colors.grey[300],
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'No questions available',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Check back soon for more practice questions',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          final currentQuestion = questions[_currentQuestionIndex];

          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: (_currentQuestionIndex + 1) / questions.length,
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Current score
                  if (_totalAnswered > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Current Score: $_correctCount / $_totalAnswered',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.blue,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  const SizedBox(height: 20),

                  // Question text
                  Text(
                    currentQuestion.question,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 24),

                  // Answer choices
                  ...currentQuestion.choices.map((choice) {
                    final isSelected = _selectedChoice == choice.letter;
                    final isCorrect = choice.isCorrect;
                    final showResult = _showFeedback;

                    Color backgroundColor = Colors.transparent;
                    Color borderColor = Colors.grey[300]!;
                    Color textColor = Colors.black;

                    if (showResult) {
                      if (isSelected && isCorrect) {
                        backgroundColor = Colors.green.withOpacity(0.1);
                        borderColor = Colors.green;
                        textColor = Colors.green;
                      } else if (isSelected && !isCorrect) {
                        backgroundColor = Colors.red.withOpacity(0.1);
                        borderColor = Colors.red;
                        textColor = Colors.red;
                      } else if (isCorrect) {
                        backgroundColor = Colors.green.withOpacity(0.05);
                        borderColor = Colors.green;
                        textColor = Colors.green;
                      }
                    } else if (isSelected) {
                      backgroundColor = Colors.blue.withOpacity(0.1);
                      borderColor = Colors.blue;
                      textColor = Colors.blue;
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: GestureDetector(
                        onTap: _showFeedback ? null : () => _selectChoice(choice.letter),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: backgroundColor,
                            border: Border.all(color: borderColor, width: 2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: textColor.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Center(
                                  child: Text(
                                    choice.letter,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: textColor,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Text(
                                  choice.text,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyLarge
                                      ?.copyWith(color: textColor),
                                ),
                              ),
                              if (showResult && isCorrect)
                                const Icon(Icons.check_circle,
                                    color: Colors.green)
                              else if (showResult && isSelected && !isCorrect)
                                const Icon(Icons.cancel, color: Colors.red),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),

                  const SizedBox(height: 24),

                  // Feedback section
                  if (_showFeedback)
                    ScaleTransition(
                      scale: Tween<double>(begin: 0.8, end: 1.0).animate(
                        CurvedAnimation(
                          parent: _feedbackAnimationController,
                          curve: Curves.elasticOut,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: _selectedChoice ==
                                      currentQuestion
                                          .getCorrectChoice()
                                          ?.letter
                                  ? Colors.green.withOpacity(0.1)
                                  : Colors.orange.withOpacity(0.1),
                              border: Border.all(
                                color: _selectedChoice ==
                                        currentQuestion
                                            .getCorrectChoice()
                                            ?.letter
                                    ? Colors.green
                                    : Colors.orange,
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
                                      _selectedChoice ==
                                              currentQuestion
                                                  .getCorrectChoice()
                                                  ?.letter
                                          ? Icons.check_circle
                                          : Icons.info,
                                      color: _selectedChoice ==
                                              currentQuestion
                                                  .getCorrectChoice()
                                                  ?.letter
                                          ? Colors.green
                                          : Colors.orange,
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      _selectedChoice ==
                                              currentQuestion
                                                  .getCorrectChoice()
                                                  ?.letter
                                          ? 'Correct!'
                                          : 'Incorrect',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: _selectedChoice ==
                                                    currentQuestion
                                                        .getCorrectChoice()
                                                        ?.letter
                                                ? Colors.green
                                                : Colors.orange,
                                          ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'Explanation',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  currentQuestion.explanation,
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                                if (currentQuestion.references != null &&
                                    currentQuestion.references!.isNotEmpty)
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 12),
                                      Text(
                                        'References',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleSmall
                                            ?.copyWith(
                                                fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(height: 8),
                                      ...currentQuestion.references!
                                          .map((ref) => Padding(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        vertical: 4),
                                                child: Text(
                                                  '• $ref',
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .bodySmall,
                                                ),
                                              )),
                                    ],
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Action buttons
                  if (!_showFeedback)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _selectedChoice == null
                            ? null
                            : () => _submitAnswer(currentQuestion),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: const Text('Submit Answer'),
                      ),
                    )
                  else
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => _nextQuestion(questions),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: Text(
                          _currentQuestionIndex == questions.length - 1
                              ? 'Finish'
                              : 'Next Question',
                        ),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stackTrace) => Center(
          child: Text('Error: $error'),
        ),
      ),
    );
  }
}
