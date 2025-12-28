import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/user_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/flashcard_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  String _getInitials(String? name) {
    if (name == null || name.isEmpty) return 'U';
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userProfileProvider);
    final flashcardsAsync = ref.watch(userFlashcardsProvider);
    final authUser = ref.watch(authProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              // Navigate to settings
            },
          ),
        ],
      ),
      body: userAsync.when(
        data: (userProfile) => flashcardsAsync.when(
          data: (flashcards) {
            final userName = userProfile?.name ?? authUser?.displayName ?? 'User';
            final userEmail = authUser?.email ?? 'user@example.com';
            final totalCards = flashcards.length;
            final masteredCards = flashcards
                .where((c) => c.repetitions >= 5 && c.easeFactor >= 2.5)
                .length;
            final profileInitials = _getInitials(userName);

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Profile Avatar
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: Theme.of(context).primaryColor,
                    child: Text(
                      profileInitials,
                      style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Name and Email
                  Text(
                    userName,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    userEmail,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Quick Stats
                  Row(
                    children: [
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                Text(
                                  'Total Cards',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  totalCards.toString(),
                                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).primaryColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                Text(
                                  'Mastered',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  masteredCards.toString(),
                                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Account Section
                  Text(
                    'Account',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  _buildMenuTile(
                    context,
                    icon: Icons.person_outline,
                    title: 'Edit Profile',
                    onTap: () {},
                  ),
                  _buildMenuTile(
                    context,
                    icon: Icons.lock_outline,
                    title: 'Change Password',
                    onTap: () {},
                  ),
                  _buildMenuTile(
                    context,
                    icon: Icons.notifications_outlined,
                    title: 'Notifications',
                    onTap: () {},
                  ),
                  const SizedBox(height: 24),

                  // Study Settings
                  Text(
                    'Study Settings',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  _buildMenuTile(
                    context,
                    icon: Icons.schedule,
                    title: 'Daily Goal',
                    subtitle: '20 cards/day',
                    onTap: () {},
                  ),
                  _buildMenuTile(
                    context,
                    icon: Icons.palette_outlined,
                    title: 'Theme',
                    subtitle: 'System',
                    onTap: () {},
                  ),
                  _buildMenuTile(
                    context,
                    icon: Icons.language,
                    title: 'Language',
                    subtitle: 'English',
                    onTap: () {},
                  ),
                  const SizedBox(height: 24),

                  // Help & Support
                  Text(
                    'Help & Support',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  _buildMenuTile(
                    context,
                    icon: Icons.help_outline,
                    title: 'Help Center',
                    onTap: () {},
                  ),
                  _buildMenuTile(
                    context,
                    icon: Icons.info_outline,
                    title: 'About',
                    onTap: () {},
                  ),
                  _buildMenuTile(
                    context,
                    icon: Icons.mail_outline,
                    title: 'Contact Us',
                    onTap: () {},
                  ),
                  const SizedBox(height: 24),

                  // Logout Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        _showLogoutDialog(context, ref);
                      },
                      icon: const Icon(Icons.logout),
                      label: const Text('Logout'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[600],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Version Info
                  Text(
                    'Version 1.0.0',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            );
          },
          loading: () => const Center(
            child: CircularProgressIndicator(),
          ),
          error: (error, stackTrace) => Center(
            child: Text('Error loading flashcards: $error'),
          ),
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stackTrace) => Center(
          child: Text('Error loading profile: $error'),
        ),
      ),
    );
  }

  Widget _buildMenuTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: subtitle != null ? Text(subtitle) : null,
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final authNotifier = ref.read(authProvider.notifier);
              await authNotifier.signOut();
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
