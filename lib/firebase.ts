"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyB09j-wLtU7KY14lGLR9qJMKYyzT54N5mI",
  authDomain: "ebn-express.firebaseapp.com",
  projectId: "ebn-express",
  storageBucket: "ebn-express.firebasestorage.app",
  messagingSenderId: "1089123320592",
  appId: "1:1089123320592:web:f7bd8f547f6ea094b81b95",
  measurementId: "G-P0Q2LN48FV",
}

// Initialize Firebase only on the client to avoid SSR build-time errors
const isClient = typeof window !== "undefined"

const app = isClient ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : (undefined as unknown as ReturnType<typeof initializeApp>)
const auth = isClient ? getAuth(app) : (undefined as unknown as ReturnType<typeof getAuth>)
const db = isClient ? getFirestore(app) : (undefined as unknown as ReturnType<typeof getFirestore>)

export { app, auth, db }
