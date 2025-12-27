# iOS Signing Configuration

## Prerequisites
- Apple Developer Account
- Xcode 14+
- Apple Developer Certificate

## Steps to Configure Signing

### 1. Automatic Signing (Recommended for Development)
```bash
cd flutter
open ios/Runner.xcworkspace
```

In Xcode:
1. Select Runner project
2. Select Runner target
3. Go to "Signing & Capabilities" tab
4. Enable "Automatically manage signing"
5. Select your team from the dropdown
6. Set Bundle Identifier to: `com.pmp.studyApp`

### 2. Manual Signing (Required for Release/Distribution)

#### Create Signing Certificate
1. Go to Apple Developer Portal (https://developer.apple.com)
2. Go to Certificates, Identifiers & Profiles
3. Create a new iOS App Development certificate
4. Download and install in Keychain

#### Create App Identifier
1. In Certificates, Identifiers & Profiles
2. Create new App ID: `com.pmp.studyApp`
3. Enable required capabilities:
   - Push Notifications
   - Sign in with Apple (optional)

#### Create Provisioning Profile
1. Create new iOS App Development provisioning profile
2. Select the App ID and certificate
3. Download and install

#### Configure in Xcode
1. Select Runner project
2. Select Runner target
3. Go to Build Settings tab
4. Search for "code signing"
5. Set:
   - Code Signing Identity: "iPhone Developer"
   - Provisioning Profile: Select your profile
   - Development Team: Your team ID

### 3. Build for Release

For App Store release:
```bash
cd flutter
flutter build ipa
```

For TestFlight:
```bash
flutter build ipa --export-method app-store
```

## Environment Variables for CI/CD

```bash
export DEVELOPMENT_TEAM="YOUR_TEAM_ID"
export CODE_SIGN_IDENTITY="iPhone Developer"
export PROVISIONING_PROFILE_SPECIFIER="iOS Team Provisioning Profile"
```

## Troubleshooting

### Code Signing Error
- Ensure certificate is installed in Keychain
- Check that provisioning profile matches bundle ID
- Verify team ID is correct

### Profile Not Found
- Regenerate provisioning profile
- Re-download and install
- Clean build folder (Cmd+Shift+K)

### Team Selection Error
- Add team manually in Xcode preferences
- Sign in with Apple Developer account in Xcode

## Firebase Setup for iOS

After configuring signing:
1. Add GoogleService-Info.plist to the project
2. Ensure it's added to Build Phases
3. Configure iOS-specific Firebase features in lib/firebase_options.dart
