# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **EBS Home**, a web application for managing a shared vacation house in Bat Shlomo, Israel. The app is being built for the Eisenberg family to handle maintenance requests, booking coordination, and house management tasks.

## Current Project Status

This is a new project in the planning stage. The codebase currently contains only the Product Requirements Document (PRD.md) and this file. No implementation has begun yet.

## Tech Stack

The technology stack includes:
- **Python** - Backend API development
- **React** - Frontend web application
- **Firebase** - Deployment platform and backend services (Auth, Firestore, Storage, Cloud Messaging)
- **TypeScript** - Type-safe frontend development
- **i18n** - Internationalization (English + Hebrew)

## Development Commands

Once the project is initialized, the following commands will be used:

### Backend (Python)
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
python app.py

# Run tests
pytest

# Run single test
pytest tests/test_module.py::test_function

# Linting
pylint src/
```

### Frontend (React)
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run single test
npm test -- --testNamePattern="test name"

# TypeScript checking
npm run typecheck

# Linting
npm run lint
```

## Architecture Overview

The application follows a client-server architecture with Firebase integration:

### Backend (Python)
- **API Layer** - RESTful endpoints for business logic
- **Service Layer** - Core business logic following OOP and SOLID principles
- **Repository Layer** - Firebase Firestore integration
- **Authentication** - Firebase Auth integration with single device restriction

### Frontend (React)
- **Component Layer** - React components with TypeScript
- **State Management** - Context API or Redux (TBD based on complexity)
- **Service Layer** - API client and Firebase SDK integration
- **UI Layer** - Material-UI or similar component library
- **Routing** - React Router for navigation

### Shared Services
- **Firebase Auth** - Google Sign-In with device tracking
- **Firestore** - Real-time data synchronization
- **Firebase Storage** - Image storage for maintenance requests and checklists
- **Cloud Messaging** - Push notifications

## Key Features to Implement

1. **Maintenance Request System** - Photo upload, location selection, notification to maintenance person
2. **Shared Booking Calendar** - Gregorian/Hebrew date display, occupancy coordination
3. **Exit Photo Checklist** - Required photos of refrigerator, freezer, and closets with text notes
4. **Exit Reminders** - Push notifications based on booking calendar
5. **Single Device Login** - Security feature limiting each user to one device

## Development Guidelines

### Code Organization
- Follow OOP and SOLID principles throughout the codebase
- Ensure modular design with single responsibility for each module
- Document each file and folder's role in the project
- Avoid code duplication - extract shared functionality into reusable modules
- Check for existing implementations before creating new functionality

### TypeScript/Type Safety
- Strict TypeScript typing (no `any` types)
- Define all interfaces and types in dedicated files
- Use type guards and proper type narrowing

### Testing
- Write comprehensive tests for every functionality and module
- Maintain `TEST_SUMMARY.md` to track testing coverage and status
- Use pytest for backend tests, Jest for frontend tests
- Aim for high test coverage

### Git Workflow
- Commit after every meaningful change with detailed commit messages
- Maintain `.gitignore` file with appropriate exclusions
- Follow conventional commit message format

### Security
- No hardcoded Firebase keys or credentials
- Use environment variables for configuration
- Implement proper validation and sanitization

## File Structure (Proposed)

```
DeepSearch/
├── backend/
│   ├── src/
│   │   ├── api/          # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Data access layer
│   │   ├── models/       # Data models
│   │   └── utils/        # Shared utilities
│   ├── tests/
│   ├── requirements.txt
│   └── app.py
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API clients
│   │   ├── contexts/     # React contexts
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Shared utilities
│   │   └── i18n/         # Translations
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   └── functions/
├── .gitignore
├── TEST_SUMMARY.md
├── PRD.md
└── CLAUDE.md
```

## Next Steps

The PRD requests starting with:
1. Architecture plan
2. File structure outline
3. Implementation steps

Wait for user confirmation before beginning actual development.