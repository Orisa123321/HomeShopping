// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBYModqV2RyfPkDlhtj5titf2UQx3gpcSk",
  authDomain: "home-shopping-sharabi.firebaseapp.com",
  projectId: "home-shopping-sharabi",
  storageBucket: "home-shopping-sharabi.firebasestorage.app",
  messagingSenderId: "261915217600",
  appId: "1:261915217600:web:60b040d9bcbf938b132725",
  measurementId: "G-QMW2Z4HQXJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
