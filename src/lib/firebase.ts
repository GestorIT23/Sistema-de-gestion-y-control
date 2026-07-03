import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCMByHxzBHdIIighyogifJxts8RMaW13z8",
  authDomain: "directorio-grupomedikal.firebaseapp.com",
  projectId: "directorio-grupomedikal",
  storageBucket: "directorio-grupomedikal.firebasestorage.app",
  messagingSenderId: "456878389957",
  appId: "1:456878389957:web:650ebfde430b952e064eac"
};

const app = initializeApp(firebaseConfig);

let db: any;

try {
  // Use explicit custom databaseId on getFirestore signature
  db = getFirestore(app, "ai-studio-4907c4f2-d145-4ad9-a2a1-46563202ecee");
} catch (e) {
  console.warn("Error initializing Firestore with custom databaseId, falling back to default:", e);
  db = getFirestore(app);
}

// Silent anonymous sign-in for authenticated connection
const auth = getAuth(app);
signInAnonymously(auth)
  .then(() => {
    console.log("BIOTRASH-SGI: Autenticación anónima establecida con éxito.");
  })
  .catch((err) => {
    console.warn("BIOTRASH-SGI: Error al iniciar sesión anónima:", err);
  });

export { app, db, auth };

