import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKTkDjvC73dMK2RYZAwmFPihttQRUmhus",
  authDomain: "zing-bot-b47e7.firebaseapp.com",
  projectId: "zing-bot-b47e7",
  storageBucket: "zing-bot-b47e7.firebasestorage.app",
  messagingSenderId: "120426537537",
  appId: "1:120426537537:web:5ade380d68e4452f545cc0",
  measurementId: "G-TJPX2WBCFP"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db }; 