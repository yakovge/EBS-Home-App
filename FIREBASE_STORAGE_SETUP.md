# Firebase Storage Setup Instructions

## Problem Identified
The Firebase Storage bucket `ebs-home-c4f07.appspot.com` does not exist, which is causing all photo uploads to fail with the error: `Failed to submit checklist`.

## Root Cause
- Firebase Storage was not properly initialized for the project
- The bucket needs to be manually created in the Firebase Console

## Solution Steps

### 1. Enable Firebase Storage
1. Go to https://console.firebase.google.com/project/ebs-home-c4f07/storage
2. Click "Get started" to enable Cloud Storage
3. Choose "Start in test mode" for development
4. Select a location (use the default or choose one close to your users)
5. Click "Done"

### 2. Configure Storage Rules (for development)
Replace the default rules with:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // DEVELOPMENT ONLY - change for production
    }
  }
}
```

### 3. Verify Setup
After creating the bucket, restart the backend server:
```bash
cd backend
python app.py
```

Look for this message in the logs:
```
Bucket access test successful - found X files
```

### 4. Test Photo Upload
Try uploading a photo in a checklist. The upload should now work successfully.

## Security Note
The test rules above allow all read/write access. For production, implement proper authentication:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /checklists/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /maintenance/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /profiles/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Alternative: Local File Storage (Temporary)
If Firebase Storage setup is not immediately possible, consider implementing local file storage as a temporary workaround.