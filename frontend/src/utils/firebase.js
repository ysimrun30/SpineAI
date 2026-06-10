import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Replace with your Firebase project config from Firebase Console
const firebaseConfig = {
  apiKey: "[GCP_API_KEY]",
  authDomain: "nakshatra-63367.firebaseapp.com",
  projectId: "nakshatra-63367",
  storageBucket: "nakshatra-63367.firebasestorage.app",
  messagingSenderId: "1099026384190",
  appId: "1:1099026384190:web:87208191852147207955",
  measurementId: "G-506713771"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
