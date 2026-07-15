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

// Guard: only initialize Firebase if we have the required config (prevents SSR prerender failure)
const hasFirebaseConfig = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

// Initialize Firebase safely to avoid duplicate app errors in HMR/SSR
export const app: FirebaseApp = hasFirebaseConfig
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : ({} as FirebaseApp); // SSR-safe stub during prerender

export const auth: Auth = hasFirebaseConfig ? getAuth(app) : ({} as Auth);
export const db: Firestore = hasFirebaseConfig ? getFirestore(app) : ({} as Firestore);
export const storage = hasFirebaseConfig ? getStorage(app) : null;

// Use explicit region us-central1
export const functions = hasFirebaseConfig ? getFunctions(app, "us-central1") : null;

// Connect to emulator in development if specified
if (hasFirebaseConfig && import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  connectFunctionsEmulator(functions!, "127.0.0.1", 5001);
}

// Pre-bind the Firebase Callable Function wrapper
export const generateAIResponseCallable = hasFirebaseConfig && functions
  ? httpsCallable(functions, "generateAIResponse")
  : null;

export let analytics: Analytics | null = null;

if (typeof window !== "undefined" && hasFirebaseConfig) {
  // Analytics can fail in certain network environments (e.g. firewalls/VPNs)
  try {
    analytics = getAnalytics(app);
  } catch (analyticsError) {
    console.warn("Firebase Analytics failed to initialize:", analyticsError);
  }
}
