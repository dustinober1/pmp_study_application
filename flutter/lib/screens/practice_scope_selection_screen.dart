import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/domain_task_model.dart';
import '../providers/domain_provider.dart';
import '../providers/task_provider.dart';

/// Screen for selecting the scope of a practice session
/// Users can choose to practice:
/// - All questions
/// - All questions in a specific domain
/// - All questions in a specific task
class PracticeScopeSelectionScreen extends ConsumerStatefulWidget {
  const PracticeScopeSelectionScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<PracticeScopeSelectionScreen> createState() =>
      _PracticeScopeSelectionScreenState();
}

class _PracticeScopeSelectionScreenState
    extends ConsumerState<PracticeScopeSelectionScreen> {
  String _selectedScope = 'all'; // 'all', 'domain', or 'task'
  String? _selectedDomainId;
  String? _selectedTaskId;

  void _handleScopeSelected(String scope, {String? domainId, String? taskId}) {
    setState(() {
      _selectedScope = scope;
      _selectedDomainId = domainId;
      _selectedTaskId = taskId;
    });
  }

  void _startPracticeSession() {
    final result = {
      'scope': _selectedScope,
      'domainId': _selectedDomainId,
      'taskId': _selectedTaskId,
    };
    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    final domainsAsync = ref.watch(allDomainsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Practice Session'),
        elevation: 0,
      ),
      body: domainsAsync.when(
        data: (domains) {
          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Text(
                    'Select Practice Scope',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Choose what you\'d like to practice',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  const SizedBox(height: 32),

                  // All Questions Option
                  _buildScopeOption(
                    context,
                    title: 'All Questions',
                    subtitle: 'Practice questions from all domains',
                    icon: Icons.all_inclusive,
                    isSelected: _selectedScope == 'all',
                    onTap: () => _handleScopeSelected('all'),
                  ),
                  const SizedBox(height: 16),

                  // Domain Selection Option
                  _buildScopeOption(
                    context,
                    title: 'By Domain',
                    subtitle:
                        _selectedDomainId != null
                            ? 'Domain: ${_getDomainName(domains, _selectedDomainId!)}'
                            : 'Choose a specific domain',
                    icon: Icons.category,
                    isSelected: _selectedScope == 'domain',
                    onTap: () => _handleScopeSelected('domain'),
                  ),

                  // Domain List
                  if (_selectedScope == 'domain') ...[
                    const SizedBox(height: 16),
                    _buildDomainsList(context, domains),
                  ],

                  const SizedBox(height: 16),

                  // Task Selection Option
                  _buildScopeOption(
                    context,
                    title: 'By Task',
                    subtitle:
                        _selectedTaskId != null
                            ? 'Task: ${_getTaskName(domains, _selectedTaskId!)}'
                            : 'Choose a specific task',
                    icon: Icons.playlist_add_check,
                    isSelected: _selectedScope == 'task',
                    onTap: () => _handleScopeSelected('task'),
                  ),

                  // Task List
                  if (_selectedScope == 'task') ...[
                    const SizedBox(height: 16),
                    _buildTasksList(context, domains),
                  ],

                  const SizedBox(height: 40),

                  // Start Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _startPracticeSession,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text('Start Practice Session'),
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
          child: Text('Error loading domains: $error'),
        ),
      ),
    );
  }

  Widget _buildScopeOption(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Material(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(
              color: isSelected ? Colors.blue : Colors.grey[300]!,
              width: isSelected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(12),
            color: isSelected ? Colors.blue.withOpacity(0.05) : Colors.transparent,
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.blue : Colors.grey[200],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: isSelected ? Colors.white : Colors.grey[600],
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color:
                                isSelected
                                    ? Colors.blue
                                    : Colors.black,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(
                  Icons.check_circle,
                  color: Colors.blue,
                  size: 24,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDomainsList(BuildContext context, List<DomainModel> domains) {
    return Column(
      children: domains.map((domain) {
        final isSelected = _selectedDomainId == domain.id;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Material(
            child: InkWell(
              onTap: () => _handleScopeSelected('domain', domainId: domain.id),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  border: Border.all(
                    color:
                        isSelected
                            ? Colors.blue
                            : Colors.grey[200]!,
                    width: isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(8),
                  color:
                      isSelected
                          ? Colors.blue.withOpacity(0.05)
                          : Colors.transparent,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            domain.name,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w500,
                                  color:
                                      isSelected
                                          ? Colors.blue
                                          : Colors.black,
                                ),
                          ),
                          if (domain.description != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              domain.description!,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: Colors.grey[600],
                                  ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (isSelected)
                      const Icon(
                        Icons.radio_button_checked,
                        color: Colors.blue,
                        size: 20,
                      )
                    else
                      Icon(
                        Icons.radio_button_unchecked,
                        color: Colors.grey[400],
                        size: 20,
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildTasksList(BuildContext context, List<DomainModel> domains) {
    final allTasks = <TaskModel>[];
    for (final domain in domains) {
      allTasks.addAll(domain.tasks);
    }

    return Column(
      children: allTasks.map((task) {
        final isSelected = _selectedTaskId == task.id;
        final domainName = domains
            .firstWhere(
              (d) => d.tasks.any((t) => t.id == task.id),
              orElse: () => domains.first,
            )
            .name;

        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Material(
            child: InkWell(
              onTap: () => _handleScopeSelected('task', taskId: task.id),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  border: Border.all(
                    color:
                        isSelected
                            ? Colors.blue
                            : Colors.grey[200]!,
                    width: isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(8),
                  color:
                      isSelected
                          ? Colors.blue.withOpacity(0.05)
                          : Colors.transparent,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            task.name,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w500,
                                  color:
                                      isSelected
                                          ? Colors.blue
                                          : Colors.black,
                                ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Domain: $domainName',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(
                                  color: Colors.grey[600],
                                ),
                          ),
                        ],
                      ),
                    ),
                    if (isSelected)
                      const Icon(
                        Icons.radio_button_checked,
                        color: Colors.blue,
                        size: 20,
                      )
                    else
                      Icon(
                        Icons.radio_button_unchecked,
                        color: Colors.grey[400],
                        size: 20,
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  String _getDomainName(List<DomainModel> domains, String domainId) {
    try {
      return domains.firstWhere((d) => d.id == domainId).name;
    } catch (e) {
      return 'Unknown Domain';
    }
  }

  String _getTaskName(List<DomainModel> domains, String taskId) {
    try {
      final domain = domains.firstWhere(
        (d) => d.tasks.any((t) => t.id == taskId),
      );
      final task = domain.tasks.firstWhere((t) => t.id == taskId);
      return task.name;
    } catch (e) {
      return 'Unknown Task';
    }
  }
}
