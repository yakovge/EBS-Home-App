# EBS Home Mobile App - Deployment Guide

This document provides comprehensive instructions for deploying the EBS Home mobile application across different environments.

## Table of Contents

1. [Environment Overview](#environment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Build Process](#build-process)
5. [Deployment Process](#deployment-process)
6. [Security Considerations](#security-considerations)
7. [Troubleshooting](#troubleshooting)
8. [CI/CD Integration](#cicd-integration)

## Environment Overview

The EBS Home mobile app supports three environments:

- **Development**: Local development and testing
- **Staging**: Pre-production testing environment
- **Production**: Live app store releases

Each environment has its own:
- API endpoints
- Firebase project
- Build configurations
- Security settings
- Bundle identifiers

## Prerequisites

### Required Tools

1. **Node.js** (v18 or later)
2. **Expo CLI**:
   ```bash
   npm install -g @expo/cli
   ```
3. **EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

### Account Setup

1. **Expo Account**: Required for EAS builds
2. **Apple Developer Account**: For iOS app store deployment
3. **Google Play Console**: For Android app store deployment
4. **Firebase Projects**: One for each environment

### Development Environment

1. Clone the repository
2. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env.local
   ```
4. Update `.env.local` with your development values

## Environment Setup

### 1. Environment Variables

Each environment requires specific configuration files:

- `.env.development` - Development settings
- `.env.staging` - Staging settings  
- `.env.production` - Production settings
- `.env.example` - Template for local development

Key variables to configure:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=https://your-api-domain.com/api

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# EAS Configuration
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

### 2. EAS Project Setup

Initialize EAS for your project:

```bash
eas login
eas init
```

Configure your `eas.json` with environment-specific settings for:
- Build profiles
- Submit profiles
- Update channels

### 3. Firebase Projects

Set up separate Firebase projects for each environment:

1. **Development**: `ebs-home-dev`
2. **Staging**: `ebs-home-staging`  
3. **Production**: `ebs-home-prod`

Each project should have:
- Authentication enabled
- Firestore database
- Cloud Storage
- Cloud Messaging
- Proper security rules

## Build Process

### Development Builds

For development and testing:

```bash
# Build for both platforms
npm run build:dev

# Platform-specific builds
npm run build:dev:ios
npm run build:dev:android
```

### Staging Builds

For pre-production testing:

```bash
# Build for both platforms
npm run build:staging

# Platform-specific builds
npm run build:staging:ios
npm run build:staging:android
```

### Production Builds

For app store releases:

```bash
# Build for both platforms
npm run build:prod

# Platform-specific builds
npm run build:prod:ios
npm run build:prod:android
```

## Deployment Process

### 1. Development Deployment

Development builds are typically distributed internally:

1. Build the app:
   ```bash
   npm run build:dev
   ```
2. Share the generated QR code or download link
3. Install on test devices via Expo Go or development builds

### 2. Staging Deployment

Staging builds are used for pre-production testing:

1. Build the app:
   ```bash
   npm run build:staging
   ```
2. Submit to internal testing tracks:
   ```bash
   npm run submit:staging
   ```
3. Distribute to testers via TestFlight (iOS) or Internal Testing (Android)

### 3. Production Deployment

Production builds go to the app stores:

1. **Pre-deployment Checklist**:
   - [ ] All tests passing
   - [ ] Staging environment validated
   - [ ] App store assets prepared
   - [ ] Version numbers updated
   - [ ] Release notes written

2. **Build for production**:
   ```bash
   npm run build:prod
   ```

3. **Submit to app stores**:
   ```bash
   npm run submit:prod
   ```

4. **Monitor deployment**:
   - Check build status in EAS dashboard
   - Verify app store processing
   - Monitor for any issues

### 4. Over-the-Air Updates

For non-native code changes, use OTA updates:

```bash
# Staging updates
npm run update:staging

# Production updates
npm run update:prod
```

## Security Considerations

### Production Security Measures

1. **Environment Variables**:
   - Never commit sensitive values to version control
   - Use EAS Secrets for production values
   - Rotate API keys regularly

2. **App Transport Security**:
   - Enforced HTTPS in production
   - Certificate pinning enabled
   - No cleartext traffic allowed

3. **Code Protection**:
   - ProGuard enabled for Android
   - Bitcode enabled for iOS
   - Bundle minification

4. **Runtime Security**:
   - Root/jailbreak detection
   - SSL pinning
   - Security headers on API requests

### Setting EAS Secrets

For production builds, use EAS secrets instead of environment files:

```bash
# Set production Firebase API key
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-production-key"

# Set production API URL
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.ebshome.app/api"
```

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check EAS build logs
   - Verify all dependencies are compatible
   - Ensure environment variables are set

2. **Firebase Connection Issues**:
   - Verify Firebase configuration
   - Check network connectivity
   - Validate API keys and project IDs

3. **App Store Rejections**:
   - Review app store guidelines
   - Check metadata and screenshots
   - Ensure proper permissions are requested

### Debug Commands

```bash
# Check configuration
npx expo config

# Validate EAS configuration
eas config

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, staging, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build for staging
        if: github.ref == 'refs/heads/staging'
        run: npm run build:staging
        
      - name: Build for production
        if: github.ref == 'refs/heads/main'
        run: npm run build:prod
```

### Environment-Specific Workflows

Create separate workflows for each environment:
- `.github/workflows/development.yml`
- `.github/workflows/staging.yml`
- `.github/workflows/production.yml`

## Monitoring and Analytics

### Production Monitoring

1. **Error Tracking**: Sentry or Bugsnag integration
2. **Performance Monitoring**: Firebase Performance
3. **Analytics**: Firebase Analytics
4. **Crash Reporting**: Firebase Crashlytics

### Health Checks

Monitor these metrics in production:
- App crashes
- API response times
- User session duration
- Feature usage analytics

## Version Management

### Semantic Versioning

Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes
- **MINOR**: New features
- **PATCH**: Bug fixes

### Release Process

1. Update version in `package.json` and `app.config.js`
2. Create release branch
3. Build and test
4. Submit to app stores
5. Tag release in Git
6. Update documentation

## Support and Maintenance

### Regular Maintenance Tasks

- [ ] Update dependencies monthly
- [ ] Review and rotate API keys quarterly
- [ ] Monitor app store reviews
- [ ] Update device compatibility
- [ ] Review and update security configurations

### Emergency Procedures

For critical issues:
1. Identify the problem scope
2. Prepare hot fix
3. Build emergency release
4. Submit expedited review (if needed)
5. Monitor deployment
6. Post-mortem analysis

---

For questions or issues with deployment, contact the development team or refer to the [Expo documentation](https://docs.expo.dev/) and [EAS documentation](https://docs.expo.dev/eas/).