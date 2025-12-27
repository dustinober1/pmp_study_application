# Flutter App Setup Guide

This guide covers the complete setup of the PMP Study App Flutter mobile application.

## Project Overview

The Flutter app provides iOS and Android native support for:
- FSRS-based spaced repetition flashcards
- Domain and Task-based organization (PMP 2026 exam structure)
- Real-time synchronization with Firebase backend
- Offline support with local caching
- State management with Riverpod

## Prerequisites

### Development Environment
- Flutter SDK 3.10+ ([Install Flutter](https://flutter.dev/docs/get-started/install))
- Dart SDK (included with Flutter)
- iOS: Xcode 14+ (for iOS development)
- Android: Android Studio 2022+ (for Android development)
- Java Development Kit (JDK) 11+ (for Android)

### Required Accounts
- Google Firebase account with active project
- Apple Developer account (for iOS distribution)
- Google Play Developer account (for Android distribution)

## Initial Setup

### 1. Get Dependencies
```bash
cd flutter
flutter pub get
```

### 2. Generate Code
Some dependencies require code generation:

```bash
# Generate all required code
flutter pub run build_runner build

# Or watch mode for development
flutter pub run build_runner watch
```

### 3. Update Firebase Configuration

The `firebase_options.dart` file contains Firebase configuration. You need to:

1. Update Firebase credentials:
   - Get your Firebase project ID from Firebase Console
   - Replace placeholder API keys in `firebase_options.dart`
   - Update bundle IDs to match your signing configuration

2. Download service files:
   - **iOS**: GoogleService-Info.plist from Firebase Console
   - **Android**: google-services.json from Firebase Console

## Platform-Specific Setup

### iOS Configuration

See `ios/SIGNING.md` for detailed signing setup.

#### Quick Setup:
```bash
# Open iOS project in Xcode
open ios/Runner.xcworkspace

# In Xcode:
# 1. Select Runner project
# 2. Select Runner target
# 3. Go to "Signing & Capabilities"
# 4. Enable "Automatically manage signing"
# 5. Select your team
# 6. Update Bundle Identifier if needed
```

#### Add GoogleService-Info.plist:
1. Download from Firebase Console
2. Open Xcode
3. Right-click on Runner in navigator
4. Select "Add Files to Runner"
5. Select GoogleService-Info.plist
6. Ensure it's added to Runner target

### Android Configuration

See `android/SIGNING.md` for detailed signing setup.

#### Quick Setup:
```bash
# Generate keystore (one time only)
keytool -genkey -v -keystore pmp_study_key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10950 \
  -alias pmp_key

# Copy and edit key.properties
cp android/key.properties.example android/key.properties
# Edit android/key.properties with your passwords
```

#### Add google-services.json:
1. Download from Firebase Console
2. Place at `flutter/android/app/google-services.json`
3. No manual Gradle changes needed (Flutter handles it)

## Development

### Run on Emulator

#### iOS:
```bash
# Start iOS simulator
open -a Simulator

# Run app
flutter run
```

#### Android:
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd emulator_name

# Run app
flutter run
```

### Run on Physical Device

#### iOS:
```bash
# Trust the device in Xcode settings
# Connect device and run
flutter run
```

#### Android:
```bash
# Enable Developer Options on device
# Enable USB Debugging
# Connect via USB

flutter run -d device_id
```

### Debug

```bash
# Run with debug output
flutter run -v

# Attach debugger to running app
flutter attach

# Hot reload
r

# Hot restart (loses state)
R
```

## Build for Release

### iOS Release Build

```bash
# Build for App Store
flutter build ipa --export-method app-store

# Or for TestFlight
flutter build ipa --export-method app-store

# Output: build/ios/ipa/pmp_study_app.ipa
```

See `ios/SIGNING.md` for detailed release signing setup.

### Android Release Build

```bash
# Build App Bundle for Play Store
flutter build appbundle --release

# Or build APK
flutter build apk --release

# Output:
# - AAB: build/app/outputs/bundle/release/app-release.aab
# - APK: build/app/outputs/apk/release/app-release.apk
```

See `android/SIGNING.md` for detailed release signing setup.

## State Management (Riverpod)

The app uses Riverpod for state management:

### Providers Overview

#### Firebase Providers (`lib/providers/firebase_provider.dart`)
- `firebaseAuthProvider` - Firebase Auth instance
- `firestoreProvider` - Firestore database instance
- `firebaseStorageProvider` - Firebase Storage instance
- `currentUserProvider` - Stream of current authenticated user
- `currentUserIdProvider` - Current user ID (convenience provider)

#### Auth Providers (`lib/providers/auth_provider.dart`)
- `authProvider` - Auth state and operations (SignUp, SignIn, SignOut, ResetPassword)

#### User Providers (`lib/providers/user_provider.dart`)
- `userProfileProvider` - Current user's profile data
- `userProfileNotifierProvider` - User profile mutations

#### Flashcard Providers (`lib/providers/flashcard_provider.dart`)
- `userFlashcardsProvider` - All user's flashcards stream
- `dueFlashcardsProvider` - Flashcards due for review stream
- `flashcardsByDomainProvider` - Flashcards filtered by domain
- `flashcardsByTaskProvider` - Flashcards filtered by task
- `flashcardProvider` - Flashcard mutations (Create, Update, Delete)

### Using Providers in Widgets

```dart
// In a ConsumerWidget
class MyScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Read a provider
    final flashcards = ref.watch(userFlashcardsProvider);

    // Watch a provider (rebuilds on change)
    final user = ref.watch(currentUserProvider);

    // Get notifier for mutations
    final flashcardNotifier = ref.read(flashcardProvider.notifier);

    return flashcards.when(
      data: (cards) => ListView(...),
      loading: () => CircularProgressIndicator(),
      error: (err, stack) => Text('Error: $err'),
    );
  }
}
```

## Firebase Configuration

### Firestore Security Rules
The backend has Firestore security rules configured. Ensure:
- Users can only read/write their own documents
- Flashcards are protected by user ID
- Public read access for reference data (domains, tasks)

### Cloud Functions
The backend includes Cloud Functions for:
- FSRS algorithm calculations
- Automatic review date updates
- User profile initialization on signup

## Testing

### Unit Tests
```bash
flutter test
```

### Integration Tests
```bash
flutter test integration_test
```

## Troubleshooting

### Build Issues

#### "Flutter not found"
```bash
# Add Flutter to PATH
export PATH="$PATH:$(flutter --version | grep -oE '\/.*\/flutter')"
```

#### Gradle build failures
```bash
# Clean and rebuild
cd flutter
flutter clean
flutter pub get
flutter build apk
```

#### Firestore connection issues
- Check internet connectivity
- Verify Firebase project ID in firebase_options.dart
- Check Firestore security rules allow read/write

### Runtime Issues

#### App crashes on startup
- Check logcat: `flutter logs`
- Ensure GoogleService-Info.plist (iOS) and google-services.json (Android) are present
- Verify Firebase initialization in main.dart

#### Riverpod provider errors
- Check provider dependencies
- Ensure ProviderScope wraps the app
- Use RefreshControl for manual refresh if needed

## CI/CD Setup

### Environment Variables
Store securely in your CI/CD system:
```bash
# iOS
DEVELOPMENT_TEAM=YOUR_TEAM_ID
CODE_SIGN_IDENTITY=iPhone Developer

# Android
STORE_PASSWORD=your_store_password
KEY_PASSWORD=your_key_password
KEY_ALIAS=pmp_key
```

### Build Scripts
Example GitHub Actions workflow:
```yaml
name: Build Flutter App
on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.10.0'
      - run: flutter pub get
      - run: flutter build apk --release
```

## Performance Optimization

### App Size
- Enable ProGuard minification (Android)
- Remove unused Firebase modules
- Use dynamic feature modules for large features

### Startup Time
- Use lazy loading for providers
- Cache Firestore queries locally
- Preload critical data

### Memory Usage
- Implement proper disposal of providers
- Use HiveDB for local caching to reduce Firestore reads
- Paginate large lists

## Additional Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Firebase Flutter Docs](https://firebase.flutter.dev/)
- [Riverpod Documentation](https://riverpod.dev)
- [PMP Exam Content Outline](https://www.pmi.org/certifications/project-management-pmp)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Flutter and Firebase documentation
3. Check the project's issue tracker
4. Consult Riverpod documentation for state management questions
