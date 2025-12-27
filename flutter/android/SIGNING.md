# Android Signing Configuration

## Prerequisites
- Java Development Kit (JDK) 11+
- Android SDK

## Generate Keystore

### Create Signing Key
```bash
keytool -genkey -v -keystore pmp_study_key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10950 \
  -alias pmp_key \
  -storepass your_store_password \
  -keypass your_key_password
```

This creates a keystore file valid for 30 years.

### Store Keystore Securely
1. Keep `pmp_study_key.jks` in a secure location
2. Never commit to version control
3. Store passwords in a secure vault

## Configure Gradle Signing

### 1. Create key.properties File
Create `android/key.properties`:
```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=pmp_key
storeFile=../pmp_study_key.jks
```

**Important**: Add key.properties to .gitignore

### 2. Configure build.gradle
Update `android/app/build.gradle`:

```gradle
android {
    // Load keystore configuration
    def keystoreProperties = new Properties()
    def keystorePropertiesFile = rootProject.file('key.properties')
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    }

    // Configure signing
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Build for Release

### Build APK
```bash
cd flutter
flutter build apk --release
```

Output: `build/app/outputs/apk/release/app-release.apk`

### Build App Bundle (for Play Store)
```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

## Play Store Upload

### Prerequisites
- Google Play Developer account
- Signed AAB file
- App listing information

### Upload Process
1. Go to Google Play Console
2. Select your app
3. Go to Release > Production
4. Click "Create new release"
5. Upload the app-release.aab
6. Add release notes
7. Review and publish

## Environment Variables for CI/CD

```bash
export STORE_PASSWORD="your_store_password"
export KEY_PASSWORD="your_key_password"
export KEY_ALIAS="pmp_key"
export STORE_FILE="pmp_study_key.jks"
```

## Firebase Setup for Android

After creating keystore:
1. Get SHA-1 and SHA-256 fingerprints:
   ```bash
   keytool -list -v -keystore pmp_study_key.jks -alias pmp_key
   ```

2. Add fingerprints to Firebase Console:
   - Go to Project Settings
   - Add your Android app
   - Register SHA-1 and SHA-256 fingerprints
   - Download google-services.json
   - Place in android/app/

3. Update android/app/build.gradle:
   ```gradle
   plugins {
       id 'com.android.application'
       id 'com.google.gms.google-services'
   }
   ```

## Troubleshooting

### Keystore Not Found
- Check path in key.properties is correct
- Verify file exists at specified location

### Wrong Password Error
- Verify passwords in key.properties match
- Regenerate keystore if passwords forgotten

### SHA Fingerprint Mismatch
- Ensure correct keystore is being used
- Get new fingerprints if keystore changed
- Update Firebase Console with new fingerprints

### ProGuard Issues
- Check proguard-rules.pro for conflicts
- Add keep rules for Firebase classes if needed

## Best Practices

1. **Secure Keystore**
   - Use strong passwords (16+ characters)
   - Store in secure location
   - Backup securely

2. **Version Control**
   - Never commit keystore to git
   - Never commit key.properties
   - Use CI/CD secure variables for passwords

3. **Key Rotation**
   - Plan key rotation every 2-3 years
   - Keep old certificates for updates

4. **Backup**
   - Keep secure backup of keystore
   - Document creation date and passwords separately
