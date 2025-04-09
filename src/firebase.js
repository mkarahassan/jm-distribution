// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDng1K40Z75ZeKm_aw_qQpL0qu-IOiaz9E",
  authDomain: "jm-distribution-cda92.firebaseapp.com",
  projectId: "jm-distribution-cda92",
  storageBucket: "jm-distribution-cda92.firebasestorage.app",
  messagingSenderId: "1019505475972",
  appId: "1:1019505475972:web:96471f25de6c96c3219dd1"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);