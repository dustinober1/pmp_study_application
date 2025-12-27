import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import '../screens/dashboard_screen.dart';
import '../screens/login_screen.dart';
import '../providers/firebase_provider.dart';
import '../providers/theme_provider.dart';
import '../widgets/loading_widgets.dart';
import '../widgets/error_widgets.dart';

class MyApp extends ConsumerWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(currentUserProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      title: 'PMP Study App',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: _getThemeMode(themeMode),
      home: authState.when(
        data: (user) {
          if (user != null) {
            return const DashboardScreen();
          } else {
            return const LoginScreen();
          }
        },
        loading: () => const Scaffold(
          body: Center(
            child: LoadingSpinner(),
          ),
        ),
        error: (error, stackTrace) => ErrorScreen(
          title: 'Authentication Error',
          message: error.toString(),
        ),
      ),
      debugShowCheckedModeBanner: false,
    );
  }

  static ThemeMode _getThemeMode(String mode) {
    switch (mode) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }
}
