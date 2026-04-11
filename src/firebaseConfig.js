import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // הוספנו את השורה הזו

const firebaseConfig = {
  apiKey: "AIzaSyBYModqV2RyfPkDlhtj5titf2UQx3gpcSk",
  authDomain: "home-shopping-sharabi.firebaseapp.com",
  projectId: "home-shopping-sharabi",
  storageBucket: "home-shopping-sharabi.firebasestorage.app",
  messagingSenderId: "261915217600",
  appId: "1:261915217600:web:60b040d9bcbf938b132725",
  measurementId: "G-QMW2Z4HQXJ"
};

// אתחול Firebase
const app = initializeApp(firebaseConfig);

// הפעלת מסד הנתונים וייצוא שלו החוצה כדי ש-App.jsx יוכל להשתמש בו
export const db = getFirestore(app);