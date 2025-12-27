# iOS & Android App Store Submission Guide

Complete guide for submitting the PMP Study App to Apple App Store and Google Play Store.

## iOS App Store Submission

### Prerequisites
- Apple Developer Account (Paid membership required, $99/year)
- Mac with Xcode 15+
- Certificates and provisioning profiles from Apple Developer Account
- App identifier created in App Store Connect
- Build signed with release certificate

### Pre-Submission Checklist

#### App Metadata
- [ ] App name (max 30 characters) - "PMP Study App"
- [ ] Subtitle (max 30 characters) - "2026 Exam Prep"
- [ ] Description (max 4000 characters) - Clear, professional description of features
- [ ] Keywords (max 100 characters) - "PMP, exam, study, flashcards, spaced repetition"
- [ ] Support URL - Link to your support website
- [ ] Privacy Policy URL - Required (https://yoursite.com/privacy)
- [ ] Terms of Service URL - Optional

#### App Icon & Screenshots
- [ ] App Icon: 1024x1024 px (required)
- [ ] Screenshots (min 2, max 10) for each screen size:
  - 6.7" display (e.g., iPhone 14 Pro Max): 1290x2796 px
  - 6.1" display (e.g., iPhone 14): 1170x2532 px
  - 5.8" display (e.g., iPhone 13 mini): 1125x2436 px
- [ ] Preview video (max 30 seconds) - Optional but recommended
- [ ] Promotional artwork (1200x628 px) - Optional

#### Content Rating
- [ ] Complete content rating questionnaire
- [ ] Select appropriate category (e.g., Education)
- [ ] Rate content for violence, language, etc.

#### Build Configuration
- [ ] Version number increased (semantic versioning: 1.0.0)
- [ ] Build number incremented
- [ ] No debug code or logs
- [ ] All required frameworks included
- [ ] Bitcode enabled (if required)

### Step-by-Step Submission Process

#### 1. Create App Record in App Store Connect
```
1. Go to App Store Connect (https://appstoreconnect.apple.com)
2. Click "My Apps" → "+"
3. Select "New App"
4. Fill in:
   - Platform: iOS
   - App Name: PMP Study App
   - Primary Language: English
   - Bundle ID: com.pmp.studyapp (must match your provisioning profile)
   - SKU: pmp-study-app-2026
   - Access Rights: Full Access (select appropriate)
```

#### 2. Build & Archive with Xcode
```bash
cd flutter

# Clean build
flutter clean

# Get dependencies
flutter pub get

# Build iOS app
flutter build ios --release

# Open Xcode workspace (NOT xcodeproj)
open ios/Runner.xcworkspace

# In Xcode:
# - Select Generic iOS Device
# - Product → Archive
# - Wait for archiving to complete
```

#### 3. Upload to App Store Connect
```
In Xcode:
1. Window → Organizer
2. Select latest archive
3. Click "Distribute App"
4. Select "TestFlight & App Store"
5. Select "Upload"
6. Sign in with Apple ID
7. Select appropriate signing certificate
8. Review and upload
```

#### 4. Configure App Store Listing
In App Store Connect:
1. **App Information**
   - Category: Education
   - Content Rating: Complete questionnaire
   - Age Rating: 4+

2. **Pricing and Availability**
   - Price Tier: Free (0)
   - Availability: Select countries
   - Release date: Automatic or manual

3. **Screenshots and Preview**
   - Upload required screenshots for each device size
   - Add descriptive captions (max 170 characters)
   - Upload preview video if available

4. **Build**
   - Select the uploaded build
   - Set as minimum OS version compatibility

5. **App Review Information**
   - Demo account (if needed): Optional
   - Demo credentials: Optional
   - Notes for reviewers: Explain any special features
   - Contact information
   - Sign in requirements

#### 5. Submit for Review
```
In App Store Connect:
1. Go to "App Review Information"
2. Complete all required fields
3. Check "Ready to Submit for Review" checkbox
4. Click "Submit for Review"
```

#### 6. Monitor Review Status
```
In App Store Connect:
- Check TestFlight > Builds section for build status
- Review status updates sent via email
- Average review time: 24-48 hours
- Common rejection reasons:
  - Missing privacy policy
  - Crashes or bugs
  - Unclear functionality
  - Content rating issues
```

### Post-Approval Steps
- App available on App Store within 24-48 hours
- Update "What's New" section for new versions
- Monitor reviews and ratings
- Respond to user reviews professionally

---

## Android Play Store Submission

### Prerequisites
- Google Play Developer Account ($25 one-time fee)
- Keystore file for signing releases
- Android SDK 33+ (compileSdkVersion)
- Java Development Kit (JDK) 11+

### Create Release Keystore

```bash
# Generate keystore (first time only)
keytool -genkey -v \
  -keystore ~/key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias pmp-study-key

# Or use Android Studio:
# Build > Generate Signed Bundle / APK
```

### Pre-Submission Checklist

#### App Metadata
- [ ] App title (max 50 characters) - "PMP Study App"
- [ ] Short description (max 80 characters)
- [ ] Full description (max 4000 characters)
- [ ] Feature graphic (1024x500 px)
- [ ] Screenshots (2-8 recommended):
  - 1080x1920 px for phone
  - 1440x2560 px for tablet (optional)
- [ ] App icon (512x512 px)
- [ ] Category: Education
- [ ] Content rating: Completed questionnaire

#### APK/AAB Configuration
- [ ] Target API 34+
- [ ] Minimum API 24+ (Android 7.0)
- [ ] Signing configured correctly
- [ ] Version code incremented (each release)
- [ ] Version name updated (semantic versioning)
- [ ] No debugging code
- [ ] All Firebase services configured

### Step-by-Step Submission Process

#### 1. Create Application in Google Play Console
```
1. Go to Google Play Console (https://play.google.com/console)
2. Click "Create App"
3. Fill in:
   - App name: PMP Study App
   - Default language: English
   - App type: Application (not game)
   - Category: Education
   - Content rating: Full Questionnaire
4. Complete store listing questionnaire
```

#### 2. Configure Signing
```bash
# Update android/key.properties
cat > android/key.properties << 'EOF'
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=pmp-study-key
storeFile=/path/to/key.jks
EOF
```

#### 3. Build Release Bundle/APK
```bash
cd flutter

# Clean and get dependencies
flutter clean
flutter pub get

# Build App Bundle (recommended for Play Store)
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab

# Or build APK for testing
flutter build apk --release --split-per-abi
# Output: build/app/outputs/apk/release/*.apk
```

#### 4. Upload to Google Play
In Google Play Console:
1. **Create Release**
   - Go to Release > Testing > Internal testing
   - Click "Create new release"
   - Upload `app-release.aab`
   - Add release notes

2. **Test Internal Build**
   - Add testers (internal email addresses)
   - Monitor for crashes
   - Test all features
   - Duration: 1-2 weeks typically

3. **Closed Testing Release**
   - Create release from successful internal build
   - Add beta testers (separate list)
   - Monitor beta feedback
   - Collect user reviews

4. **Production Release**
   - Create release from tested build
   - Complete all store listing information
   - Add release notes
   - Set rollout percentage (e.g., 10% → 25% → 50% → 100%)

#### 5. Complete Store Listing
In Play Console > Store listing:

**Basic Info**
- Language: English (US)
- Title: PMP Study App
- Short description (80 chars max)
- Full description (4000 chars max)
- Category: Education

**Graphics**
- Feature Graphic: 1024x500 px
- Screenshots (min 2, max 8):
  - 1080x1920 px each
  - 2-5 sentence description
- App Icon: 512x512 px (32-bit PNG)

**Categorization**
- Category: Education
- Content Rating: Complete questionnaire
- Target Audience: Select appropriate age range

**Policies**
- Privacy Policy URL: https://yoursite.com/privacy
- Email address for support
- Website (optional)

#### 6. Complete Content Rating Questionnaire
- Violence: None
- Language: None
- Sexual Content: None
- Alcohol/Tobacco: None
- Financial: None
- Other content: Answer honestly

#### 7. Submit for Review
```
In Play Console:
1. Go to Release > Production
2. Create new release
3. Upload tested AAB
4. Add release notes
5. Review all information
6. Click "Save" then "Review"
7. Click "Rollout to production"
```

#### 8. Monitor Review Status
- Average review time: 2-4 hours (usually)
- Can be up to 48 hours in some cases
- Updates via email when status changes
- Common rejection reasons:
  - Insufficient functionality
  - Crashes/bugs
  - Missing privacy policy
  - Misleading description

### Post-Approval Steps

**After Approval**
- Set rollout percentage (start at 10%)
- Monitor crash reports in Play Console
- Monitor user reviews and ratings
- Respond to negative reviews
- Gradually increase rollout based on stability

**Update Process**
- Increment versionCode in `android/app/build.gradle`
- Update versionName (e.g., 1.0.1)
- Build new AAB: `flutter build appbundle --release`
- Upload to Play Console
- Repeat submission process

---

## Parallel Submission Timeline

### Recommended Timeline
- **Week 1**:
  - Finalize app for both platforms
  - Complete all metadata (screenshots, descriptions)
  - Build and test on both platforms

- **Week 2**:
  - Submit iOS to App Store
  - Submit Android to Google Play (internal testing)

- **Week 3-4**:
  - iOS: Handle review feedback (usually approved this week)
  - Android: Beta test with closed testers

- **Week 5**:
  - iOS: Live on App Store
  - Android: Escalate to production release

### Key Dates to Track
- iOS submission date: ___________
- iOS approval date: ___________
- Android submission date: ___________
- Android approval date: ___________
- Live date: ___________

---

## Platform-Specific Considerations

### iOS
- Requires annual developer account fee ($99/year)
- Longer approval process (24-48 hours typical)
- Strict guidelines on functionality
- Privacy policy must be accessible in app
- Push notifications require setup in App Store Connect

### Android
- One-time developer account fee ($25)
- Faster approval (usually 2-4 hours)
- More flexible content policies
- Can update apps without re-review
- A/B testing built into Play Console

---

## Marketing After Launch

### Pre-Launch Marketing
- Create landing page
- Set up social media accounts
- Prepare press release
- Create demo video

### Post-Launch Marketing
- Email existing users
- Post on social media
- Get reviews from users
- Respond to reviews
- Plan feature releases

---

## Troubleshooting

### iOS Issues
| Issue | Solution |
|-------|----------|
| "No provisioning profile" | Update certificates in Apple Developer Account |
| "Architecture mismatch" | Ensure architecture matches (arm64 for devices) |
| "Crashes on iOS" | Test thoroughly on TestFlight before App Store |
| "Review rejected" | Review Apple's guidelines, fix issues, resubmit |

### Android Issues
| Issue | Solution |
|-------|----------|
| "Keystore not found" | Verify path in key.properties |
| "Upload failed" | Check bundle size, signing, and version code |
| "Low rating" | Monitor reviews, fix reported issues, respond to users |
| "Crashes" | Check Play Console crash reports, fix, and update |

---

## References

- [Apple App Store Connect Guide](https://help.apple.com/app-store-connect/)
- [iOS App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)
- [Firebase iOS Setup](https://firebase.google.com/docs/ios/setup)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
