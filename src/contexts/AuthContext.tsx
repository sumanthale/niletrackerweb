import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, fullName: string, role: User['role']) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null); // Clear user state immediately
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  }, []);

  const createUser = useCallback(async (email: string, password: string, fullName: string, role: User['role']) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser: Omit<User, 'id'> = {
        uid: userCredential.user.uid,
        email,
        fullName,
        role,
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      toast.success('User created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
      throw error;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              fullName: userData.fullName || userData.displayName || firebaseUser.displayName || '',
              role: userData.role || 'employee',
              managerId: userData.managerId,
              createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt || Date.now()),
              lastLogin: userData.lastLogin?.toDate ? userData.lastLogin.toDate() : userData.lastLogin ? new Date(userData.lastLogin) : undefined,
              photoURL: userData.photoURL || firebaseUser.photoURL || undefined,
              isActive: userData.isActive !== false
            });
          } else {
            // Create user document if it doesn't exist
            const newUser: Omit<User, 'id'> = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              fullName: firebaseUser.displayName || '',
              role: 'employee',
              createdAt: new Date(),
              lastLogin: new Date(),
              isActive: true
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser({ id: firebaseUser.uid, ...newUser });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Error loading user data');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);
  

  const value = {
    user,
    loading,
    signIn,
    signOut,
    createUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}