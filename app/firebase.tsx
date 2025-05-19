import firebase from "firebase/compat/app";
import "firebase/auth";
import "firebase/firestore";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgzYhF7HlI4fAzCX-chECFT5ZidAP1XhE",
  authDomain: "la-goon-games.firebaseapp.com",
  projectId: "la-goon-games",
  storageBucket: "la-goon-games.firebasestorage.app",
  messagingSenderId: "861817789057",
  appId: "1:861817789057:web:2a923f4b02b3ce00cd8b80"
};
// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };