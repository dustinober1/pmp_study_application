import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/theme_provider.dart';

class ThemeToggle extends ConsumerWidget {
  const ThemeToggle({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final notifier = ref.read(themeModeProvider.notifier);

    final icons = {
      'light': Icons.light_mode,
      'dark': Icons.dark_mode,
      'system': Icons.brightness_auto,
    };

    return IconButton(
      icon: Icon(icons[themeMode] ?? Icons.brightness_auto),
      onPressed: () async {
        await notifier.toggleTheme();
      },
      tooltip: 'Current theme: $themeMode',
    );
  }
}

class ThemeSelector extends ConsumerWidget {
  const ThemeSelector({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final notifier = ref.read(themeModeProvider.notifier);

    return Dialog(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Select Theme',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            ...[
              ('light', 'Light', Icons.light_mode),
              ('dark', 'Dark', Icons.dark_mode),
              ('system', 'System Default', Icons.brightness_auto),
            ].map((option) {
              final (value, label, icon) = option;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: ListTile(
                  leading: Icon(icon),
                  title: Text(label),
                  trailing: themeMode == value
                      ? const Icon(Icons.check, color: Colors.blue)
                      : null,
                  onTap: () async {
                    await notifier.setTheme(value);
                    Navigator.of(context).pop();
                  },
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }
}
