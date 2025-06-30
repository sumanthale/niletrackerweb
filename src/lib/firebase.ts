import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAg6L_q1cB4Pu6eQYXA-xx09T-9rlBIRGA",
  authDomain: "nile-track.firebaseapp.com",
  projectId: "nile-track",
  storageBucket: "nile-track.firebasestorage.app",
  messagingSenderId: "421194884833",
  appId: "1:421194884833:web:c72b5169967da203bd79a0"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;