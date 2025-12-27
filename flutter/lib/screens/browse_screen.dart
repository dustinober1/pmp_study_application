import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Domain model
class Domain {
  final String id;
  final String name;
  final double percentage;
  final int taskCount;

  Domain({
    required this.id,
    required this.name,
    required this.percentage,
    required this.taskCount,
  });
}

// Task model
class Task {
  final String id;
  final String domainId;
  final String name;
  final int flashcardCount;

  Task({
    required this.id,
    required this.domainId,
    required this.name,
    required this.flashcardCount,
  });
}

class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  String? _selectedDomainId;

  // TODO: Replace with data from provider once domain/task data is available
  final List<Domain> domains = [
    Domain(
      id: 'domain_1',
      name: 'People',
      percentage: 33,
      taskCount: 10,
    ),
    Domain(
      id: 'domain_2',
      name: 'Process',
      percentage: 41,
      taskCount: 12,
    ),
    Domain(
      id: 'domain_3',
      name: 'Business Environment',
      percentage: 26,
      taskCount: 4,
    ),
  ];

  List<Task> _getTasksForDomain(String domainId) {
    final domainTasks = {
      'domain_1': [
        Task(id: 'task_1', domainId: 'domain_1', name: 'Manage Project Team', flashcardCount: 12),
        Task(id: 'task_2', domainId: 'domain_1', name: 'Plan Communications', flashcardCount: 8),
        Task(id: 'task_3', domainId: 'domain_1', name: 'Manage Stakeholder Engagement', flashcardCount: 10),
      ],
      'domain_2': [
        Task(id: 'task_4', domainId: 'domain_2', name: 'Plan Project Scope', flashcardCount: 9),
        Task(id: 'task_5', domainId: 'domain_2', name: 'Plan Project Schedule', flashcardCount: 11),
        Task(id: 'task_6', domainId: 'domain_2', name: 'Plan Project Budget', flashcardCount: 10),
      ],
      'domain_3': [
        Task(id: 'task_7', domainId: 'domain_3', name: 'Manage Organizational Change', flashcardCount: 7),
      ],
    };
    return domainTasks[domainId] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse Content'),
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            flex: 1,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(16),
              itemCount: domains.length,
              itemBuilder: (context, index) {
                final domain = domains[index];
                final isSelected = _selectedDomainId == domain.id;

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedDomainId = domain.id;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 12),
                    child: Material(
                      color: Colors.transparent,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? Theme.of(context).primaryColor
                              : Theme.of(context).primaryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: isSelected
                              ? Border.all(
                            color: Theme.of(context).primaryColor,
                            width: 2,
                          )
                              : null,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Text(
                              domain.name,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: isSelected
                                    ? Colors.white
                                    : Theme.of(context).textTheme.titleMedium?.color,
                                fontWeight: FontWeight.w600,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${domain.percentage}%',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: isSelected ? Colors.white70 : null,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Expanded(
            flex: 2,
            child: _selectedDomainId == null
                ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.touch_app,
                    size: 64,
                    color: Colors.grey[300],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Select a domain to browse tasks',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            )
                : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _getTasksForDomain(_selectedDomainId!).length,
              itemBuilder: (context, index) {
                final task = _getTasksForDomain(_selectedDomainId!)[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                      child: Icon(
                        Icons.library_books,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                    title: Text(task.name),
                    subtitle: Text('${task.flashcardCount} flashcards'),
                    trailing: Icon(
                      Icons.arrow_forward_ios,
                      size: 16,
                      color: Colors.grey[400],
                    ),
                    onTap: () {
                      // Navigate to task detail screen
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
