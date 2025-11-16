"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Vérifier que toutes les variables d'environnement sont définies
if (typeof window !== "undefined") {
  const requiredEnvVars = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error(
      `Variables d'environnement Firebase manquantes: ${missingVars.join(", ")}`
    );
  }
}

// Initialize Firebase only on the client to avoid SSR build-time errors
const isClient = typeof window !== "undefined";

const app = isClient ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : (undefined as unknown as ReturnType<typeof initializeApp>);
const auth = isClient ? getAuth(app) : (undefined as unknown as ReturnType<typeof getAuth>);
const db = isClient ? getFirestore(app) : (undefined as unknown as ReturnType<typeof getFirestore>);

export { app, auth, db };
