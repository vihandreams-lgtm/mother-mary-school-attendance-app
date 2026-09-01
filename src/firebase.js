// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhX_b-7ClGSfRdCceqpwfCaclxF5ZwAp4",
  authDomain: "mother-mary-primary-school.firebaseapp.com",
  projectId: "mother-mary-primary-school",
  storageBucket: "mother-mary-primary-school.firebasestorage.app",
  messagingSenderId: "640859341985",
  appId: "1:640859341985:web:86b0af77ddefa84a3d5ce0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);