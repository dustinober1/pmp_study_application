import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, String>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<String> {
  ThemeModeNotifier() : super('system') {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getString('theme_mode') ?? 'system';
  }

  Future<void> setTheme(String theme) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme_mode', theme);
    state = theme;
  }

  Future<void> toggleTheme() async {
    final themes = ['light', 'dark', 'system'];
    final currentIndex = themes.indexOf(state);
    final nextTheme = themes[(currentIndex + 1) % themes.length];
    await setTheme(nextTheme);
  }
}
