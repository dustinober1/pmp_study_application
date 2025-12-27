# Deployment Guide for PMP Study App

This document provides instructions for deploying the PMP Study App across web, iOS, and Android platforms.

## Web App Deployment (Vercel)

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository linked to Vercel
- Firebase configuration values
- Node.js 18+ installed locally for building

### Configuration Files
The following Vercel deployment configuration files have been created:
- **`web/vercel.json`** - Vercel project configuration with build settings and environment variable definitions
- **`web/.vercelignore`** - Files to exclude from Vercel deployments (node_modules, .next, etc.)
- **`web/src/config/firebase.ts`** - Firebase SDK initialization with environment variables

### Deployment Steps

1. **Connect GitHub Repository to Vercel**
   - Go to https://vercel.com/new
   - Select "Import Git Repository"
   - Connect your GitHub repository containing the PMP Study App
   - Select the `web` directory as the root directory
   - Vercel will automatically detect the Next.js framework

2. **Configure Environment Variables in Vercel**
   - In Vercel project settings, go to **Settings > Environment Variables**
   - Add the following environment variables (get values from Firebase Console):
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
     NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
     NEXT_PUBLIC_API_BASE_URL=https://your-region-your-project.cloudfunctions.net
     ```
   - Set these for Production, Preview, and Development environments

3. **Deploy**
   - Option A (Automatic): Push to your main branch - Vercel will automatically deploy
   - Option B (Manual): Use Vercel CLI: `vercel deploy --prod` from the `web` directory

4. **Monitor Build Status**
   - Check build logs in Vercel dashboard
   - Address any build failures (resolve environment variable issues, TypeScript errors)
   - Once build succeeds, your app will be live at the provided URL

5. **Post-Deployment Verification**
   - Test the web app at your Vercel domain
   - Verify Firebase authentication works (Google Sign-In)
   - Test creating and reviewing flashcards
   - Verify study sessions are being recorded in Firestore

### Vercel CLI Deployment (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to web directory
cd web

# Deploy
vercel deploy --prod
```

### Production Deployment Checklist
- [ ] Environment variables configured
- [ ] Build succeeds without errors
- [ ] Firebase Firestore security rules deployed
- [ ] Firebase Functions deployed
- [ ] HTTPS enabled (default on Vercel)
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring and error tracking configured

---

## Firebase Functions Deployment

### Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project initialized
- Node.js 18 or compatible version

### Deployment Steps

```bash
# Install dependencies
cd functions
npm install

# Build TypeScript
npm run build

# Deploy functions
npm run deploy

# View logs
npm run logs
```

### Functions Deployed
- `calculateNextReview` - FSRS scheduling calculations
- `getDueFlashcards` - Fetch due flashcards for review
- `createStudySession` - Initialize study sessions
- `reviewCardInSession` - Process card reviews
- `getSessionStats` - Retrieve session statistics
- `onUserCreate` - User profile initialization trigger
- `onUserDelete` - User data cleanup trigger

### Testing Functions Locally

```bash
# Start Firebase emulator
npm run serve

# Test functions using Firebase Shell
npm run shell
```

---

## iOS App Deployment (TestFlight/App Store)

### Prerequisites
- Apple Developer Account (paid)
- Xcode 15+
- iOS 12.0 or higher target
- Valid signing certificates and provisioning profiles

### Deployment Steps

1. **Configure Flutter**
   ```bash
   cd flutter
   flutter pub get
   ```

2. **Build for iOS**
   ```bash
   flutter build ios --release
   ```

3. **Archive in Xcode**
   - Open `flutter/ios/Runner.xcworkspace` in Xcode
   - Select Generic iOS Device
   - Product > Archive
   - Wait for archiving to complete

4. **Upload to TestFlight**
   - In Xcode, select Window > Organizer
   - Select the latest archive
   - Click "Distribute App"
   - Select "TestFlight & App Store"
   - Select "Upload"
   - Sign in with Apple ID
   - Select appropriate certificates

5. **TestFlight Testing**
   - Add testers in App Store Connect
   - Testers will receive invitations
   - Collect feedback from beta testers

6. **Submit to App Store**
   - In App Store Connect, go to TestFlight > Builds
   - Select the build for submission
   - Add app preview and screenshots
   - Complete app information
   - Submit for review

### App Store Submission Checklist
- [ ] App name and description finalized
- [ ] Keywords and category selected
- [ ] App icon and screenshots uploaded (3.5" and 5.5" screens)
- [ ] Privacy policy URL provided
- [ ] EULA provided (optional)
- [ ] Version number and build number correct
- [ ] Firebase configuration included
- [ ] Push notifications properly configured
- [ ] All permissions justified
- [ ] Marketing material reviewed

---

## Android App Deployment (Play Store)

### Prerequisites
- Google Play Developer Account ($25 one-time fee)
- Android SDK and build tools installed
- Java Development Kit (JDK) 11+
- Keystore file for signing

### Create Release Keystore

```bash
keytool -genkey -v -keystore ~/key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pmp-study-key
```

### Deployment Steps

1. **Configure Flutter**
   ```bash
   cd flutter
   flutter pub get
   ```

2. **Build Release APK/AAB**
   ```bash
   # For App Bundle (recommended)
   flutter build appbundle --release

   # Or for APK
   flutter build apk --release
   ```

3. **Sign the Build**
   - Update `android/key.properties` with keystore info:
     ```
     storePassword=<your_password>
     keyPassword=<your_password>
     keyAlias=pmp-study-key
     storeFile=<path_to_keystore>
     ```

4. **Upload to Google Play**
   - Go to Google Play Console
   - Create new app or select existing
   - Go to Internal Testing > Releases
   - Create new release
   - Upload AAB file
   - Fill in release notes
   - Review and submit for testing

5. **Internal Testing**
   - Add testers via Google Play Console
   - Testers can install from internal test track
   - Collect feedback

6. **Closed Testing (Beta)**
   - Move release from internal to closed testing
   - Add more testers
   - Monitor crash reports and ratings
   - Fix issues before production

7. **Production Release**
   - Review all screenshots and descriptions
   - Set rollout percentage (e.g., 10%, 25%, 50%, 100%)
   - Monitor user feedback and crash rates
   - Increase rollout percentage gradually

### Google Play Submission Checklist
- [ ] App name and short description
- [ ] Full description (4000 chars max)
- [ ] Screenshots (2-8 required, 1024x500px minimum)
- [ ] Feature graphic (1024x500px)
- [ ] Category and content rating
- [ ] Privacy policy URL
- [ ] App icon (512x512px)
- [ ] Permissions justified in description
- [ ] Minimum API level correct
- [ ] Target API level current
- [ ] Build signed with release keystore
- [ ] Version code incremented
- [ ] Release notes provided

---

## Monitoring & Analytics

### Vercel Analytics
- Monitor deployment performance
- Track request/response times
- View error logs

### Firebase Console
- Monitor real-time database usage
- View Cloud Functions logs
- Track authentication metrics
- Monitor Firestore usage and quotas

### App Store & Google Play Metrics
- Monitor crash rates
- View user ratings
- Track installation numbers
- Monitor active users

---

## Rollback Procedures

### Web (Vercel)
1. Go to Vercel project dashboard
2. Navigate to Deployments
3. Find the previous stable deployment
4. Click "Promote to Production"

### Firebase Functions
```bash
# List all deployed versions
firebase functions:list

# Revert to previous version
firebase functions:delete <function-name>
firebase functions:deploy
```

### Mobile Apps
- iOS: Revert to previous TestFlight build or App Store version
- Android: Increase rollout on previous version, pause current version

---

## Common Issues & Solutions

### Vercel Build Failures
- **Issue**: Build timeout
  - **Solution**: Optimize bundle size, cache dependencies

- **Issue**: Missing environment variables
  - **Solution**: Verify all NEXT_PUBLIC_* variables are set

### Firebase Deployment Issues
- **Issue**: TypeScript compilation errors
  - **Solution**: Run `npm run build` locally to debug

- **Issue**: Functions fail to deploy
  - **Solution**: Check Node.js version matches Firebase requirement (18+)

### Mobile App Issues
- **iOS**: "No provisioning profile" error
  - **Solution**: Update provisioning profiles in Apple Developer account

- **Android**: "Keystore file not found"
  - **Solution**: Verify keystore path in key.properties

---

## Continuous Deployment Setup

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Deploy Functions
        run: |
          cd functions
          npm install
          npm run build
          npm run deploy
        env:
          FIREBASE_CLI_TOKEN: ${{ secrets.FIREBASE_CLI_TOKEN }}
```

---

## Support & Contact

For deployment issues:
1. Check Firebase console for errors
2. Review Vercel deployment logs
3. Check Google Play/App Store review guidelines
4. Contact Firebase support or your team lead
