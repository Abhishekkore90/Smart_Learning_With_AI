import { FirebaseApp, initializeApp, getApps, getApp } from "firebase/app";
import { Analytics, getAnalytics } from "firebase/analytics";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
<<<<<<< HEAD
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
=======
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfVSQggxj-kZ2yJAW2xB0BcupzfCJsowU",
  authDomain: "education-89c54.firebaseapp.com",
  projectId: "education-89c54",
  storageBucket: "education-89c54.firebasestorage.app",
  messagingSenderId: "292663641725",
  appId: "1:292663641725:web:076b161074bb891513d314",
  measurementId: "G-S4WJTJZ4XC",
};

// Initialize Firebase safely to avoid duplicate app errors in HMR/SSR
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Use explicit region us-central1
export const functions = getFunctions(app, "us-central1");

// Connect to emulator in development
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Pre-bind the Firebase Callable Function wrapper
<<<<<<< HEAD
export const generateAIResponseCallable = httpsCallable(functions, "generateAIResponse");
=======
export const generateAIResponseCallable = httpsCallable(
  functions,
  "generateAIResponse",
);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

export let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  // Analytics can fail in certain network environments (e.g. firewalls/VPNs)
  try {
    analytics = getAnalytics(app);
  } catch (analyticsError) {
    console.warn("Firebase Analytics failed to initialize:", analyticsError);
  }
}
