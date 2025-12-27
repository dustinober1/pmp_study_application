'use client'

import { initializeApp, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

function initializeFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage } {
  if (auth && db && storage && app) {
    return { app, auth, db, storage }
  }

  try {
    app = getApp()
  } catch (error) {
    app = initializeApp(firebaseConfig)
  }

  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)

  // Configure emulators if in development
  if (process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true') {
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
      const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST.split(':')
      try {
        connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true })
      } catch (error) {
        // Emulator already configured
      }
    }

    if (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) {
      const [host, port] = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST.split(':')
      try {
        connectFirestoreEmulator(db, host, parseInt(port))
      } catch (error) {
        // Emulator already configured
      }
    }
  }

  return { app, auth, db, storage }
}

const { app: appInstance, auth: authInstance, db: dbInstance, storage: storageInstance } = initializeFirebase()

export { authInstance as auth, dbInstance as db, storageInstance as storage, appInstance as app }
