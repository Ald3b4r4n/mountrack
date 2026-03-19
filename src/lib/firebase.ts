import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

function readFirebaseClientEnv(primaryKey: string, legacyKey: string): string | undefined {
  return process.env[primaryKey] ?? process.env[legacyKey];
}

const firebaseConfig = {
  apiKey: readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_WEB_API", "NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readFirebaseClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_HOST", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if there are no instantiated apps
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
