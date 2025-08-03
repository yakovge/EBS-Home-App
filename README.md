# EBS Home - Family Vacation House Management

A comprehensive web application for the Eisenberg family to manage their shared vacation house in Bat Shlomo, Israel. The system handles maintenance requests, booking coordination, exit checklists, and family member notifications.

## 🏗️ Architecture

The application follows a clean, modular architecture:

- **Backend**: Python Flask API with Firebase Admin SDK
- **Frontend**: React with TypeScript and Material-UI
- **Database**: Firebase Firestore (NoSQL)
- **Storage**: Firebase Storage for images
- **Authentication**: Firebase Auth with Google Sign-In
- **Deployment**: Firebase Hosting (frontend) + Cloud Run (backend)

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- Firebase CLI
- Git

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Firebase credentials
```

5. Run the development server:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Firebase Setup

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize project (if not already done):
```bash
firebase init
```

4. Start emulators for local development:
```bash
firebase emulators:start
```

## 🔧 Development Commands

### Backend Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py

# Run tests
pytest

# Run single test
pytest tests/test_module.py::test_function

# Linting
pylint src/

# Type checking
mypy src/
```

### Frontend Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Linting
npm run lint

# Type checking
npm run typecheck
```

## 📁 Project Structure

```
DeepSearch/
├── backend/                    # Python Flask API
│   ├── src/
│   │   ├── api/               # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── repositories/      # Data access layer
│   │   ├── models/            # Data models
│   │   ├── middleware/        # Auth & error handling
│   │   └── utils/             # Shared utilities
│   ├── tests/                 # Backend tests
│   ├── requirements.txt       # Python dependencies
│   └── app.py                 # Flask app entry point
├── frontend/                  # React TypeScript app
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API clients
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── types/             # TypeScript types
│   │   ├── theme/             # Material-UI theme
│   │   └── i18n/              # Internationalization
│   ├── package.json           # Node.js dependencies
│   └── vite.config.ts         # Vite configuration
├── firebase/                  # Firebase configuration
│   ├── firestore.rules        # Database security rules
│   ├── storage.rules          # Storage security rules
│   └── firestore.indexes.json # Database indexes
├── firebase.json              # Firebase project config
├── .gitignore                # Git ignore patterns
├── CLAUDE.md                 # Claude Code guidance
├── PRD.md                    # Product Requirements
└── README.md                 # This file
```

## ✨ Key Features

### 🛠️ Maintenance Request System
- Photo upload for issues
- Location-based organization
- Automatic notifications to maintenance person
- Resolution tracking with notes
- Completion notifications to Yaffa

### 📅 Shared Booking Calendar
- Gregorian and Hebrew date display
- Conflict prevention
- Family member coordination
- Exit reminder system

### 📸 Exit Photo Checklist
- Required photos: 2 refrigerator, 2 freezer, 3 closets
- Mandatory descriptive notes
- Upload validation
- Historical tracking

### 🔐 Single Device Login
- Google authentication
- Device restriction per user
- Session management
- Security enforcement

### 🌍 Internationalization
- English and Hebrew support
- RTL layout for Hebrew
- Cultural considerations

## 🔒 Security Features

- Firebase Authentication with Google Sign-In
- Single device restriction per user
- Role-based access control
- Secure file upload with validation
- API rate limiting
- Input sanitization and validation

## 🚀 Deployment

### Backend Deployment (Cloud Run)

1. Build Docker image:
```bash
docker build -t ebs-home-api .
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy ebs-home-api --image ebs-home-api --platform managed
```

### Frontend Deployment (Firebase Hosting)

1. Build the project:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy --only hosting
```

### Full Deployment

```bash
firebase deploy
```

## 🧪 Testing

The project includes comprehensive testing:

- **Backend**: pytest with unit and integration tests
- **Frontend**: Vitest with React Testing Library
- **E2E**: Cypress tests (planned)

See `TEST_SUMMARY.md` for detailed testing information.

## 🤝 Contributing

1. Follow the established code style
2. Write tests for new features
3. Use conventional commit messages
4. Ensure TypeScript strict mode compliance
5. Follow OOP and SOLID principles

## 📝 License

This is a private family project. All rights reserved.