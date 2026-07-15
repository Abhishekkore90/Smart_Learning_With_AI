import { FirebaseApp, initializeApp, getApps, getApp } from "firebase/app";
import { Analytics, getAnalytics } from "firebase/analytics";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration with fallback values for production resilience
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCfVSQggxj-kZ2yJAW2xB0BcupzfCJsowU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "education-89c54.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "education-89c54",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "education-89c54.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "292663641725",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:292663641725:web:076b161074bb891513d314",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-S4WJTJZ4XC",
};

// Initialize Firebase safely to avoid duplicate app errors in HMR/SSR
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage = getStorage(app);

// Use explicit region us-central1
export const functions = getFunctions(app, "us-central1");

// Connect to emulator in development if specified
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Pre-bind the Firebase Callable Function wrapper
export const generateAIResponseCallable = httpsCallable(functions, "generateAIResponse");

export let analytics: Analytics | null = null;

if (typeof window !== "undefined" && hasFirebaseConfig) {
  // Analytics can fail in certain network environments (e.g. firewalls/VPNs)
  try {
    analytics = getAnalytics(app);
  } catch (analyticsError) {
    console.warn("Firebase Analytics failed to initialize:", analyticsError);
  }
}
