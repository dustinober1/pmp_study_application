import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/practice_models.dart';
import '../providers/practice_provider.dart';
import '../providers/firebase_provider.dart';
import 'practice_answer_review_screen.dart';
import 'practice_question_screen.dart';

/// Screen for conducting a practice test session
///
/// Manages:
/// - Session lifecycle (create, track progress, end)
/// - Question navigation (next, previous, skip to results)
/// - Answer review state
/// - Session statistics
class PracticeTestScreen extends ConsumerStatefulWidget {
  /// Session scope configuration
  final PracticeSessionScope scope;

  /// Number of questions to present in this session
  final int questionLimit;

  const PracticeTestScreen({
    Key? key,
    required this.scope,
    this.questionLimit = 10,
  }) : super(key: key);

  @override
  ConsumerState<PracticeTestScreen> createState() => _PracticeTestScreenState();
}

class _PracticeTestScreenState extends ConsumerState<PracticeTestScreen> {
  late String sessionId;
  int currentQuestionIndex = 0;
  late List<PracticeQuestionContentModel> questions;
  late Map<int, String> selectedAnswers; // question index -> selected choice
  bool showReview = false;

  @override
  void initState() {
    super.initState();
    selectedAnswers = {};
    _initializeSession();
  }

  Future<void> _initializeSession() async {
    final userId = ref.read(currentUserIdProvider);
    if (userId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User not authenticated')),
        );
      }
      return;
    }

    try {
      // Create session
      final newSessionId = await ref.read(practiceProvider.notifier).createSession(
        userId: userId,
        type: widget.scope.type,
        domainId: widget.scope.domainId,
        taskId: widget.scope.taskId,
      );

      // Load questions based on scope
      final questionsAsync = switch (widget.scope.type) {
        'domain' =>
          ref.read(practiceQuestionsByDomainProvider(widget.scope.domainId!)),
        'task' =>
          ref.read(practiceQuestionsByTaskProvider(widget.scope.taskId!)),
        _ => ref.read(allPracticeQuestionsProvider),
      };

      final loadedQuestions = switch (questionsAsync) {
        AsyncData(value: final q) =>
          q.take(widget.questionLimit).toList(),
        _ => <PracticeQuestionContentModel>[],
      };

      if (mounted) {
        setState(() {
          sessionId = newSessionId;
          questions = loadedQuestions;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error starting session: $e')),
        );
      }
    }
  }

  void _handleAnswerSelected(String choice) {
    setState(() {
      selectedAnswers[currentQuestionIndex] = choice;
      showReview = true;
    });
  }

  void _handleNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      setState(() {
        currentQuestionIndex++;
        showReview = false;
      });
    } else {
      _endSession();
    }
  }

  void _handlePreviousQuestion() {
    if (currentQuestionIndex > 0) {
      setState(() {
        currentQuestionIndex--;
        showReview = selectedAnswers.containsKey(currentQuestionIndex);
      });
    }
  }

  void _handleSkipToResults() {
    _endSession();
  }

  Future<void> _endSession() async {
    final userId = ref.read(currentUserIdProvider);
    if (userId == null) return;

    try {
      // Count correct answers
      int correctCount = 0;
      for (int i = 0; i < questions.length; i++) {
        if (selectedAnswers.containsKey(i)) {
          final selected = selectedAnswers[i];
          final correct = questions[i]
              .getCorrectChoice()
              ?.letter;
          if (selected == correct) {
            correctCount++;
          }
        }
      }

      // Record all attempts
      for (int i = 0; i < questions.length; i++) {
        if (selectedAnswers.containsKey(i)) {
          await ref.read(practiceProvider.notifier).recordAttempt(
            userId: userId,
            contentId: questions[i].id,
            domainId: questions[i].domainId,
            taskId: questions[i].taskId,
            sessionId: sessionId,
            selectedChoice: selectedAnswers[i]!,
            isCorrect: selectedAnswers[i] ==
                questions[i].getCorrectChoice()?.letter,
            timeSpent: 0, // TODO: track actual time
            attemptNumber: 1,
            skipped: !selectedAnswers.containsKey(i),
          );
        }
      }

      // Update session metrics
      await ref.read(practiceProvider.notifier).updateSessionMetrics(
        sessionId: sessionId,
        questionsPresented: questions.length,
        questionsAnswered: selectedAnswers.length,
        questionsSkipped: questions.length - selectedAnswers.length,
        correctAnswers: correctCount,
        incorrectAnswers: selectedAnswers.length - correctCount,
        questionIds: questions.map((q) => q.id).toList(),
      );

      // End session
      await ref.read(practiceProvider.notifier).endSession(sessionId);

      if (mounted) {
        // Navigate to results screen
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Session ended: $correctCount/${selectedAnswers.length} correct',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error ending session: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Practice Test')),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    final currentQuestion = questions[currentQuestionIndex];
    final selectedChoice = selectedAnswers[currentQuestionIndex];
    final isAnswered = selectedChoice != null;
    final isCorrect = selectedChoice ==
        currentQuestion.getCorrectChoice()?.letter;

    return showReview && isAnswered
        ? PracticeAnswerReviewScreen(
            question: currentQuestion,
            selectedChoice: selectedChoice!,
            isCorrect: isCorrect,
            questionNumber: currentQuestionIndex + 1,
            totalQuestions: questions.length,
            onNext: _handleNextQuestion,
            onPrevious: currentQuestionIndex > 0
                ? _handlePreviousQuestion
                : null,
            onContinue: _handleSkipToResults,
          )
        : PracticeQuestionScreen(
            question: currentQuestion,
            questionNumber: currentQuestionIndex + 1,
            totalQuestions: questions.length,
            onAnswerSelected: _handleAnswerSelected,
            selectedChoice: selectedChoice,
          );
  }
}
