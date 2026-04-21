import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCk2KVUQoKr2BgGah8f-QEjMQxXuFFP89g",
  authDomain: "nomadflow-b5074.firebaseapp.com",
  projectId: "nomadflow-b5074",
  storageBucket: "nomadflow-b5074.firebasestorage.app",
  messagingSenderId: "351788153458",
  appId: "1:351788153458:web:28f3b1d6116eef0e58e0eb"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);