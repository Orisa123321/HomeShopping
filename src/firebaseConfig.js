import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"; // הוספנו את ההפעלה של האופליין
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBYModqV2RyfPkDlhtj5titf2UQx3gpcSk",
  authDomain: "home-shopping-sharabi.firebaseapp.com",
  projectId: "home-shopping-sharabi",
  storageBucket: "home-shopping-sharabi.firebasestorage.app",
  messagingSenderId: "261915217600",
  appId: "1:261915217600:web:60b040d9bcbf938b132725",
  measurementId: "G-QMW2Z4HQXJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- הפעלת מצב לא מקוון (Offline Mode) ---
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // יכול לקרות אם יש כמה חלוניות פתוחות במקביל, לא נורא
        console.log("לא ניתן להפעיל אופליין בכמה חלונות במקביל");
    } else if (err.code == 'unimplemented') {
        // הדפדפן לא תומך
        console.log("הדפדפן לא תומך במצב לא מקוון");
    }
});

// הפעלת שירותי ההתחברות
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();