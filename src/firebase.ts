import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDocs, getDoc, deleteDoc,
  ref, onValue,
  signInWithPopup, onAuthStateChanged
};
export type { User };
