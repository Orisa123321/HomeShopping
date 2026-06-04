import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const getAuthDomain = () => {
  if (typeof window !== "undefined" && window.location.hostname) {
    const host = window.location.hostname;
    // Don't use window.location.hostname for local dev
    if (host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.")) {
      return import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    }
    return host;
  }
  return import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: getAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export { auth, googleProvider, db };