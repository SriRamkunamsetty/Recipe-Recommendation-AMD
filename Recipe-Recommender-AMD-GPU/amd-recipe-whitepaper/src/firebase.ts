import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBeOSfX1e5ykMYZ4tMc6pWkgwU3dwhhqeY",
  authDomain: "recipe-recommendation-9dbc8.firebaseapp.com",
  projectId: "recipe-recommendation-9dbc8",
  storageBucket: "recipe-recommendation-9dbc8.firebasestorage.app",
  messagingSenderId: "920484859452",
  appId: "1:920484859452:web:7c621bc8bea6fc17e8bd39",
  measurementId: "G-Q2ECPV9N7P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
