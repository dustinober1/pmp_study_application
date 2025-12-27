import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PMP Study App'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome to PMP Study',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 24),
            Text(
              'Study flashcards and practice questions organized by Domain and Task',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),
            // Flashcards Button
            ElevatedButton.icon(
              onPressed: () {
                // Navigate to flashcards
              },
              icon: const Icon(Icons.library_books),
              label: const Text('Study Flashcards'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                minimumSize: const Size(200, 56),
              ),
            ),
            const SizedBox(height: 16),
            // Practice Questions Button
            ElevatedButton.icon(
              onPressed: () {
                // Navigate to practice questions
              },
              icon: const Icon(Icons.quiz),
              label: const Text('Practice Questions'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                minimumSize: const Size(200, 56),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
