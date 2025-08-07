/**
 * Firebase configuration and service initialization for React Native.
 * Central location for all Firebase services used in the mobile application.
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import Constants from 'expo-constants';

// Firebase configuration - same as web version
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "AIzaSyCZKZfRt8k2CmuADEnIy7TXjVFmBQThCa4",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "ebs-home-c4f07.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "ebs-home-c4f07",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "ebs-home-c4f07.firebasestorage.app",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "533256873637",
  appId: Constants.expoConfig?.extra?.firebaseAppId || "1:533256873637:web:1d2f91fe3c30591a7b0f4c"
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