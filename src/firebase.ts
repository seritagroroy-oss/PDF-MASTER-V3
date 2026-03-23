// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// 1. Allez sur https://console.firebase.google.com/
// 2. Créez un projet (gratuit, sans CB)
// 3. Cliquez sur l'icône </> (Web App)
// 4. Copiez votre firebaseConfig et remplacez les valeurs ci-dessous
// 5. Dans Firebase console → Authentication → Sign-in methods
//    → Activez "Email/Password" et "Google"
// ============================================================

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  type User,
} from 'firebase/auth';

// 🔧 REMPLACEZ ces valeurs par celles de votre projet Firebase :
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

const isConfigured = !firebaseConfig.apiKey.includes('YOUR_');

let app: any = null;
let auth: any = null;
let googleProvider: any = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

export {
  auth,
  googleProvider,
  isConfigured,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  type User,
};
