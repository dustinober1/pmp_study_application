import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:io' show Platform;
import '../models/practice_models.dart';
import '../providers/practice_provider.dart';
import '../providers/firebase_provider.dart';
import 'practice_scope_selection_screen.dart';
import 'practice_questions_screen.dart';
import 'practice_session_results_screen.dart';

/// Orchestrates the complete practice session flow:
/// 1. Scope selection (all/domain/task)
/// 2. Question session with answers
/// 3. Results review
///
/// This is the main entry point for the practice feature
class PracticeSessionFlowScreen extends ConsumerStatefulWidget {
  const PracticeSessionFlowScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<PracticeSessionFlowScreen> createState() =>
      _PracticeSessionFlowScreenState();
}

class _PracticeSessionFlowScreenState
    extends ConsumerState<PracticeSessionFlowScreen> {
  /// Flow states: 'scope' -> 'session' -> 'results'
  String _currentFlow = 'scope';

  /// Session details
  String? _sessionId;
  String? _scopeType;
  String? _selectedDomainId;
  String? _selectedTaskId;
  List<PracticeAttemptModel> _attempts = [];

  /// Get current user ID
  String? _getCurrentUserId() {
    return ref.watch(currentUserIdProvider);
  }

  /// Move to questions screen (scope selected)
  Future<void> _handleScopeSelected(Map<String, dynamic> result) async {
    final userId = _getCurrentUserId();
    if (userId == null) {
      _showError('User not authenticated');
      return;
    }

    final scopeType = result['scope'] as String;
    final domainId = result['domainId'] as String?;
    final taskId = result['taskId'] as String?;

    // Create a new practice session
    try {
      final notifier = ref.read(practiceSessionNotifierProvider.notifier);
      final sessionId = await notifier.createSession(
        userId: userId,
        type: scopeType,
        domainId: domainId,
        taskId: taskId,
      );

      if (mounted) {
        setState(() {
          _sessionId = sessionId;
          _scopeType = scopeType;
          _selectedDomainId = domainId;
          _selectedTaskId = taskId;
          _currentFlow = 'session';
        });
      }
    } catch (e) {
      _showError('Failed to create session: $e');
    }
  }

  /// Move to results screen (session completed)
  Future<void> _handleSessionComplete(
    PracticeSessionModel session,
    List<PracticeAttemptModel> attempts,
  ) async {
    if (mounted) {
      setState(() {
        _attempts = attempts;
        _currentFlow = 'results';
      });
    }
  }

  /// Start a new session (from results)
  void _handleNewSession() {
    setState(() {
      _sessionId = null;
      _scopeType = null;
      _selectedDomainId = null;
      _selectedTaskId = null;
      _attempts = [];
      _currentFlow = 'scope';
    });
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(message: message),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _buildCurrentScreen();
  }

  Widget _buildCurrentScreen() {
    switch (_currentFlow) {
      case 'scope':
        return _buildScopeSelection();
      case 'session':
        return _buildSessionScreen();
      case 'results':
        return _buildResultsScreen();
      default:
        return _buildScopeSelection();
    }
  }

  Widget _buildScopeSelection() {
    return WillPopScope(
      onWillPop: () async {
        Navigator.of(context).pop();
        return false;
      },
      child: Navigator(
        onGenerateRoute: (settings) {
          return MaterialPageRoute(
            builder: (context) => PracticeScopeSelectionScreen(),
          );
        },
        onPopRoute: (route) async {
          if (!route.didPop(null)) {
            return false;
          }
          Navigator.of(context).pop();
          return true;
        },
      ),
      onWillPop: () async {
        // Handle the selected scope and move to session
        // This is handled via Navigator.pop in the scope selection screen
        return true;
      },
    );
  }

  Widget _buildSessionScreen() {
    if (_sessionId == null || _scopeType == null) {
      return const Scaffold(
        body: Center(
          child: Text('Error: Session not initialized'),
        ),
      );
    }

    return _PracticeSessionNavigator(
      sessionId: _sessionId!,
      scopeType: _scopeType!,
      domainId: _selectedDomainId,
      taskId: _selectedTaskId,
      onSessionComplete: _handleSessionComplete,
    );
  }

  Widget _buildResultsScreen() {
    if (_sessionId == null) {
      return const Scaffold(
        body: Center(
          child: Text('Error: Session data missing'),
        ),
      );
    }

    return FutureBuilder<PracticeSessionModel?>(
      future: ref.read(practiceSessionProvider(_sessionId!).future),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        if (snapshot.hasError || snapshot.data == null) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Error loading session results'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _handleNewSession,
                    child: const Text('Start New Session'),
                  ),
                ],
              ),
            ),
          );
        }

        final session = snapshot.data!;

        return PracticeSessionResultsScreen(
          session: session,
          attempts: _attempts,
          onNewSession: _handleNewSession,
        );
      },
    );
  }
}

/// Nested navigator for managing the practice session flow
/// (scope selection -> questions -> results)
class _PracticeSessionScopeNavigator extends ConsumerStatefulWidget {
  const _PracticeSessionScopeNavigator();

  @override
  ConsumerState<_PracticeSessionScopeNavigator> createState() =>
      _PracticeSessionScopeNavigatorState();
}

class _PracticeSessionScopeNavigatorState
    extends ConsumerState<_PracticeSessionScopeNavigator> {
  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        return await showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Exit Practice Session?'),
                content:
                    const Text('Your progress will not be saved.'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Continue'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    child: const Text('Exit'),
                  ),
                ],
              ),
            ) ??
            false;
      },
      child: Navigator(
        onGenerateRoute: (settings) {
          return MaterialPageRoute(
            builder: (context) => PracticeScopeSelectionScreen(),
          );
        },
      ),
    );
  }
}

/// Manages question navigation within a session
class _PracticeSessionNavigator extends ConsumerStatefulWidget {
  final String sessionId;
  final String scopeType;
  final String? domainId;
  final String? taskId;
  final Future<void> Function(
    PracticeSessionModel,
    List<PracticeAttemptModel>,
  ) onSessionComplete;

  const _PracticeSessionNavigator({
    required this.sessionId,
    required this.scopeType,
    this.domainId,
    this.taskId,
    required this.onSessionComplete,
  });

  @override
  ConsumerState<_PracticeSessionNavigator> createState() =>
      _PracticeSessionNavigatorState();
}

class _PracticeSessionNavigatorState
    extends ConsumerState<_PracticeSessionNavigator> {
  @override
  Widget build(BuildContext context) {
    return PracticeQuestionsScreen(
      domainId: widget.domainId,
      taskId: widget.taskId,
      sessionId: widget.sessionId,
      onSessionComplete: (session, attempts) {
        widget.onSessionComplete(session, attempts);
      },
    );
  }
}

/// Extended PracticeQuestionsScreen with session tracking
/// This is a stateful wrapper that handles the session lifecycle
class _EnhancedPracticeQuestionsScreen extends ConsumerStatefulWidget {
  final String? domainId;
  final String? taskId;
  final String sessionId;
  final Function(PracticeSessionModel, List<PracticeAttemptModel>)
      onSessionComplete;

  const _EnhancedPracticeQuestionsScreen({
    required this.domainId,
    required this.taskId,
    required this.sessionId,
    required this.onSessionComplete,
  });

  @override
  ConsumerState<_EnhancedPracticeQuestionsScreen> createState() =>
      _EnhancedPracticeQuestionsScreenState();
}

class _EnhancedPracticeQuestionsScreenState
    extends ConsumerState<_EnhancedPracticeQuestionsScreen> {
  @override
  Widget build(BuildContext context) {
    return PracticeQuestionsScreen(
      domainId: widget.domainId,
      taskId: widget.taskId,
      sessionId: widget.sessionId,
      onSessionComplete: widget.onSessionComplete,
    );
  }
}
