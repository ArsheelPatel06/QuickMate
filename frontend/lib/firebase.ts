import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

// ─── Firebase config ──────────────────────────────────────────────────────────
// Fill these in from Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? '',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? '',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? '',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? '',
};

const isConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.apiKey !== '' &&
  firebaseConfig.projectId && firebaseConfig.projectId !== ''
);

// Prevent duplicate initialisation in Next.js hot-reload
const app = isConfigured
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

const auth = app ? getAuth(app) : null;

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Sign in with email + password via Firebase, then sync with backend DB.
 * Returns the DB user profile and the Firebase ID token.
 */
async function firebaseLogin(email: string, password: string) {
  if (!auth) throw new Error('Firebase not configured');
  const cred  = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();
  return syncWithBackend(idToken);
}

/**
 * Register via Firebase, then sync with backend DB.
 */
async function firebaseRegister(name: string, email: string, password: string, role?: string) {
  if (!auth) throw new Error('Firebase not configured');
  const cred    = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();
  return syncWithBackend(idToken, name, role);
}

/**
 * Call backend /auth/sync with the Firebase ID token.
 * Backend verifies token, finds/creates DB user, returns full profile.
 */
async function syncWithBackend(idToken: string, name?: string, role?: string) {
  const res = await fetch(`${API}/auth/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, name, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Sync failed');
  return { idToken, user: data.data.user };
}

/**
 * Get a fresh Firebase ID token for the currently signed-in user.
 * Firebase refreshes it automatically every hour — this forces a fresh fetch.
 */
async function getFreshToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken(/* forceRefresh */ false);
}

async function firebaseLogout() {
  if (auth) await signOut(auth);
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
}

export {
  auth,
  isConfigured,
  firebaseLogin,
  firebaseRegister,
  firebaseLogout,
  getFreshToken,
  onAuthStateChanged,
  type User,
};
