/**
 * Firebase configuration and service initialization.
 * Central location for all Firebase services used in the application.
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCZKZfRt8k2CmuADEnIy7TXjVFmBQThCa4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ebs-home-c4f07.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ebs-home-c4f07",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ebs-home-c4f07.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "533256873637",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:533256873637:web:1d2f91fe3c30591a7b0f4c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize messaging conditionally (only if supported)
export const messaging = isSupported().then(supported => {
  if (supported) {
    return getMessaging(app);
  }
  return null;
});

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Export the app instance
export default app; 