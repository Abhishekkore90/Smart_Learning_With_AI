import { FirebaseApp, initializeApp, getApps, getApp } from "firebase/app";
import { Analytics, getAnalytics } from "firebase/analytics";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase safely to avoid duplicate app errors in HMR/SSR
const isConfigured = !!firebaseConfig.apiKey;
export const app = isConfigured ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null as any;

export let auth = null as unknown as Auth;
export let db = null as unknown as Firestore;
export let storage: any = null;
export let functions: any = null;

if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    // Use explicit region us-central1
    functions = getFunctions(app, "us-central1");
  } catch (error) {
    console.warn("Firebase services failed to initialize:", error);
  }
} else {
  console.warn("Firebase is not configured. Missing API key.");
}

// Connect to emulator in development if specified
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Pre-bind the Firebase Callable Function wrapper
export const generateAIResponseCallable = httpsCallable(functions, "generateAIResponse");

export let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  // Analytics can fail in certain network environments (e.g. firewalls/VPNs)
  try {
    analytics = getAnalytics(app);
  } catch (analyticsError) {
    console.warn("Firebase Analytics failed to initialize:", analyticsError);
  }
}
