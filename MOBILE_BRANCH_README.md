# Mobile Expo App Development Branch

## Branch Overview
This branch (`mobile-expo-app`) is dedicated to rebuilding EBS Home as a true native mobile application using React Native and Expo.

## Why This Branch Exists
The original implementation in `main` branch was built as a web application (React + Flask), but the PRD specified "EBS Home is a mobile application." To provide the best mobile experience with native iOS and Android capabilities, we're rebuilding the frontend using React Native/Expo.

## What's Preserved from Main Branch
✅ **Backend (Flask API)** - Complete and working
✅ **Business Logic** - All API endpoints and services
✅ **Firebase Configuration** - Authentication and Storage setup
✅ **Database Models** - User, Booking, Maintenance, Checklist models
✅ **Core Features** - All functionality logic is proven and working

## What Will Be Rebuilt
🔄 **Frontend Framework** - React → React Native
🔄 **UI Components** - Material-UI → React Native Elements/NativeBase
🔄 **Navigation** - React Router → React Navigation
🔄 **Styling** - CSS → StyleSheet API
🔄 **Photo Capture** - Web input → Native camera API
🔄 **Storage** - localStorage → AsyncStorage

## Key Advantages of Expo Approach
- ✅ True native app experience
- ✅ App Store and Google Play distribution
- ✅ Native camera and photo capabilities
- ✅ Push notifications
- ✅ Offline capabilities
- ✅ Native performance

## Branch Status
- **Current**: Setting up Expo development environment
- **Next**: Rebuild core components in React Native
- **Goal**: Feature-complete native mobile app

## Deployment Strategy
1. **Development**: Expo Go app for testing
2. **Staging**: Expo Development Build
3. **Production**: Standalone apps for iOS/Android stores

## How to Switch Between Branches

### Work on Web Version (main branch):
```bash
git checkout main
cd frontend && npm run dev  # Web app
cd backend && python app.py
```

### Work on Mobile Version (mobile-expo-app branch):
```bash
git checkout mobile-expo-app
cd mobile && npx expo start  # Mobile app (when ready)
cd backend && python app.py
```

## Backend Compatibility
The backend remains **100% compatible** between both versions. Same API endpoints, same database, same authentication.

This allows us to:
- Run both versions simultaneously
- Compare features side-by-side
- Gradually migrate users from web to mobile
- Fall back to web version if needed