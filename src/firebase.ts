import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup,
         onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc,
         collection, query, where, getDocs, getDoc,
         deleteDoc } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey:        import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:     import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  databaseURL:   import.meta.env.VITE_FIREBASE_DATABASE_URL,
  appId:         import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// FIXED: Use DEFAULT Firestore database — no second argument.
// The old code passed VITE_FIREBASE_DATABASE_ID (a named AI Studio DB).
// The backend always writes to the DEFAULT database.
// Mismatch = frontend listeners see zero tasks and zero logs.
export const db   = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export {
  doc, onSnapshot, setDoc, updateDoc, collection, query,
  where, getDocs, getDoc, deleteDoc, ref, onValue,
  signInWithPopup, onAuthStateChanged
};
export type { User };
