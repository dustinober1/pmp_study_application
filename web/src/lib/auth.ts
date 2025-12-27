import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  User,
} from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, setDoc } from 'firebase/firestore'

const googleProvider = new GoogleAuthProvider()

export interface AuthError {
  code: string
  message: string
}

// Email/Password Registration
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)

    // Update profile with display name
    if (displayName) {
      await updateProfile(user, { displayName })
    }

    // Create user profile in Firestore
    await createUserProfile(user)

    return user
  } catch (error) {
    throw formatAuthError(error)
  }
}

// Email/Password Sign In
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    return user
  } catch (error) {
    throw formatAuthError(error)
  }
}

// Google Sign In
export async function signInWithGoogle(): Promise<User> {
  try {
    const { user } = await signInWithPopup(auth, googleProvider)

    // Create or update user profile in Firestore
    await createUserProfile(user)

    return user
  } catch (error) {
    throw formatAuthError(error)
  }
}

// Sign Out
export async function logout(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error) {
    throw formatAuthError(error)
  }
}

// Create user profile in Firestore
async function createUserProfile(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid)

    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
      { merge: true }
    )
  } catch (error) {
    console.error('Error creating user profile:', error)
  }
}

// Format Firebase auth errors
function formatAuthError(error: unknown): AuthError {
  if (error instanceof Error) {
    const message = error.message

    if (message.includes('email-already-in-use')) {
      return {
        code: 'email-already-in-use',
        message: 'This email is already registered. Try signing in instead.',
      }
    }
    if (message.includes('weak-password')) {
      return {
        code: 'weak-password',
        message: 'Password should be at least 6 characters long.',
      }
    }
    if (message.includes('user-not-found')) {
      return {
        code: 'user-not-found',
        message: 'No account found with this email. Please check or sign up.',
      }
    }
    if (message.includes('wrong-password')) {
      return {
        code: 'wrong-password',
        message: 'Incorrect password. Please try again.',
      }
    }
    if (message.includes('too-many-requests')) {
      return {
        code: 'too-many-requests',
        message: 'Too many failed login attempts. Please try again later.',
      }
    }
    if (message.includes('popup-blocked')) {
      return {
        code: 'popup-blocked',
        message: 'Sign-in popup was blocked. Please allow popups and try again.',
      }
    }
    if (message.includes('popup-closed-by-user')) {
      return {
        code: 'popup-closed-by-user',
        message: 'Sign-in was cancelled.',
      }
    }

    return {
      code: 'unknown-error',
      message: error.message || 'An authentication error occurred.',
    }
  }

  return {
    code: 'unknown-error',
    message: 'An unexpected error occurred.',
  }
}
