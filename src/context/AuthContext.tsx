import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AuthService } from '../services/AuthService';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (email, password) => Promise<void>;
  signup: (email, password) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const userData = await AuthService.getUserData();
      if (userData?.localId) {
        try {
          const backendUser = await AuthService.getBackendUser(userData.localId);
          if (backendUser) {
            userData.backendProfile = backendUser;
          }
        } catch (_) {
          /* keep cached user without profile */
        }
      }
      if (userData) {
        setUser(userData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await AuthService.signIn(email, password);
    const userData = { email: data.email, localId: data.localId };
    
    // Sync with backend and check for locked account
    try {
        const backendUser = await AuthService.getBackendUser(data.localId);
        if (backendUser) {
             // Check if account is locked (should be caught by getBackendUser, but double-check)
             if (backendUser.isLocked || backendUser.deletedAt) {
               await AuthService.logout();
               throw new Error('This account has been locked or deleted. Please contact support.');
             }
             userData['backendProfile'] = backendUser;
        } else {
             // If not exists on backend, create it
             await AuthService.createBackendUser(data.localId, data.email);
        }
    } catch (e: any) {
        // If account is locked, re-throw the error
        if (e.message && e.message.includes('locked')) {
          throw e;
        }
        console.warn('Backend sync failed', e);
    }

    await AuthService.saveToken(data.idToken, userData);
    setUser(userData);
  };

  const signup = async (email, password) => {
    const data = await AuthService.signUp(email, password);
    const userData = { email: data.email, localId: data.localId };
    
    // Create user on backend (will check for locked email)
    try {
      await AuthService.createBackendUser(data.localId, data.email);
    } catch (e: any) {
      // If account creation fails due to locked email, delete Firebase account and throw error
      if (e.message && (e.message.includes('locked') || e.message.includes('ACCOUNT_LOCKED'))) {
        try {
          // Attempt to delete the Firebase account we just created
          await AuthService.deleteAccount(data.localId, data.idToken);
        } catch (deleteError) {
          console.error('Failed to clean up Firebase account after locked email detection', deleteError);
        }
        throw e;
      }
      throw e;
    }
    
    await AuthService.saveToken(data.idToken, userData);
    setUser(userData);
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const deleteAccount = async () => {
    if (!user?.localId) {
      throw new Error('User not found');
    }
    const token = await AuthService.getToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }
    try {
      await AuthService.deleteAccount(user.localId, token);
      setUser(null);
    } catch (error: any) {
      // Re-throw with proper error message
      const errorMessage = error?.message || error?.toString() || 'Failed to delete account';
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

