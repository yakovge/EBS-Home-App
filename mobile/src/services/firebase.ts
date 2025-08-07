/**
 * Firebase configuration and service initialization for React Native.
 * Central location for all Firebase services used in the mobile application.
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Config } from '../config';

// Firebase configuration using centralized config
const firebaseConfig = {
  apiKey: Config.FIREBASE.apiKey,
  authDomain: Config.FIREBASE.authDomain,
  projectId: Config.FIREBASE.projectId,
  storageBucket: Config.FIREBASE.storageBucket,
  messagingSenderId: Config.FIREBASE.messagingSenderId,
  appId: Config.FIREBASE.appId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Export the app instance
export default app;