import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/AuthService';
import { apiClient, registerAuthHooks } from '../services/apiClient';
import { AuthUser, BackendProfile } from '../types/Auth';
import { useLanguage } from './LanguageContext';
import { t, type TranslationKeys } from '../locales';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isLoadingRole: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  /**
   * Sign the user out. When `silent` is true, no toast is fired — used for
   * user-initiated logouts (e.g. Profile screen "Sign out"). When omitted /
   * false, a bilingual "Session expired" Alert is shown — D-11 hard-logout
   * path triggered by apiClient's 401 refresh-token-revoked branch.
   */
  logout: (silent?: boolean) => Promise<void>;
  refreshRole: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const { language } = useLanguage();

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
        // Rehydrate refreshToken into the in-memory user shape for AuthUser
        // consistency. The interceptor re-reads from AsyncStorage at request
        // time, so this is for shape parity, not functional correctness.
        const refreshToken = (await AsyncStorage.getItem('refreshToken')) ?? undefined;
        setUser({ ...userData, refreshToken } as AuthUser);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await AuthService.signIn(email, password);
    const userData: AuthUser = {
      email: data.email,
      localId: data.localId,
      refreshToken: data.refreshToken,
    };

    // Sync with backend and check for locked account
    try {
      const backendUser = await AuthService.getBackendUser(data.localId);
      if (backendUser) {
        // Check if account is locked (should be caught by getBackendUser, but double-check)
        if (backendUser.isLocked || backendUser.deletedAt) {
          await AuthService.logout();
          throw new Error('This account has been locked or deleted. Please contact support.');
        }
        userData.backendProfile = backendUser as BackendProfile;
      } else {
        // If not exists on backend, create it. Pass the fresh idToken explicitly —
        // AsyncStorage hasn't been written yet (saveToken runs below), so the apiClient
        // Bearer interceptor would otherwise have no token to attach (Phase 4.5 fix).
        await AuthService.createBackendUser(data.localId, data.email, {}, data.idToken);
      }
    } catch (e: any) {
      // If account is locked, re-throw the error
      if (e.message && e.message.includes('locked')) {
        throw e;
      }
      console.warn('Backend sync failed', e);
    }

    await AuthService.saveToken(data.idToken, userData, data.refreshToken);
    setUser(userData);
  };

  const signup = async (email: string, password: string) => {
    const data = await AuthService.signUp(email, password);
    const userData: AuthUser = {
      email: data.email,
      localId: data.localId,
      refreshToken: data.refreshToken,
    };

    // Create user on backend (will check for locked email). Pass the fresh idToken
    // explicitly — saveToken hasn't run yet at this point (Phase 4.5 fix).
    try {
      await AuthService.createBackendUser(data.localId, data.email, {}, data.idToken);
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

    await AuthService.saveToken(data.idToken, userData, data.refreshToken);
    setUser(userData);
  };

  /**
   * Sign the user out.
   *
   * D-11 hard-logout toast (Phase 1 / Plan 12):
   * The apiClient 401 silent-refresh interceptor calls `logoutHook?.()`
   * (no arg) when refreshIdTokenSingleflight returns null (refresh token
   * revoked / expired). Surfacing a bilingual Alert.alert BEFORE the state
   * reset gives the user context — they're then routed to the login screen
   * by App.tsx's state machine when `user === null`.
   *
   * `silent=true` is used by user-initiated logouts (Profile screen) to
   * avoid showing a "Session expired" toast on a deliberate sign-out.
   */
  // MD-01: useCallback so the registered apiClient hook reflects the current `language`
  // closure. Without this, a session that started in EN and switched to RU mid-flight
  // would still fire the EN session-expired alert (and vice-versa) because the registered
  // closure was captured once at mount.
  const logout = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      Alert.alert(
        t(language, 'auth.session.expired.title'),
        t(language, 'auth.session.expired.body')
      );
    }
    await AuthService.logout();
    setUser(null);
  }, [language]);

  /**
   * Re-fetch the backend user profile and merge into AuthUser. Called by:
   * (a) the apiClient 403 role-revoked interceptor (single-flight),
   * (b) the role-refresh banner tap handler (Plan 12, D-12),
   * (c) the AppState 'active' listener (Phase 2 placement).
   */
  // MD-01: useCallback with [user?.localId, language]. The early-return guard reads
  // user?.localId, so the registered closure must update whenever localId changes
  // (especially null → realId after first login) — otherwise the apiClient 403
  // role-revoked retry path silently no-ops post-login. `language` is included for
  // future-proofing in case any toast/error path inside refreshRole reads `t(language)`.
  const refreshRole = useCallback(async () => {
    if (!user?.localId) return;
    setIsLoadingRole(true);
    try {
      const fresh = await apiClient.get<BackendProfile>('/auth/me');
      setUser(prev => (prev ? { ...prev, backendProfile: fresh.data } : null));
    } catch (e) {
      // Non-fatal: leave the cached backendProfile in place. The interceptor
      // path that called us will continue with whatever data we already had.
      console.warn('refreshRole failed', e);
    } finally {
      setIsLoadingRole(false);
    }
  }, [user?.localId, language]);

  /**
   * Toast hook fired by `apiClient`'s 403 final-fallback branch. Takes a
   * locale-key prefix (e.g. 'auth.accessChanged') and expands it to
   * `${prefix}.title` + `${prefix}.body` strings for `Alert.alert(title, body)`.
   *
   * Phase 1 consumers:
   *  - 'auth.accessChanged' — apiClient post-retry 403 (this plan, ROLE-09).
   *  - 'auth.session.expired' — AuthContext D-11 hard-logout path (Plan 12).
   *
   * The locale keys themselves are added in Plan 12 Task 1. Until that lands,
   * `t()` falls back to returning the key string verbatim — acceptable
   * interim behavior per Plan 10 Task 3 item 12. The cast to TranslationKeys
   * silences the strict-union check; runtime is safe.
   */
  // MD-01: useCallback so the registered toast hook reflects the current language.
  // Without this, an apiClient interceptor toast fired after a mid-session language
  // switch would render in the original mount-time language.
  const toast = useCallback((localeKeyPrefix: string) => {
    Alert.alert(
      t(language, `${localeKeyPrefix}.title` as TranslationKeys),
      t(language, `${localeKeyPrefix}.body` as TranslationKeys)
    );
  }, [language]);

  // Register the THREE hooks (refreshRole, logout, toast) with apiClient.
  // MD-01: deps are `[refreshRole, logout, toast]` so the registered closures
  // refresh whenever the underlying user / language changes — not just on mount.
  // Each hook is useCallback-stable, so this effect only re-runs when something
  // material changes (login/logout for refreshRole, language switch for logout/toast).
  // Avoids the services-import-context circular and keeps the interceptor decoupled
  // from React's render cycle.
  useEffect(() => {
    registerAuthHooks({ refreshRole, logout, toast });
  }, [refreshRole, logout, toast]);

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
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoadingRole,
        login,
        signup,
        logout,
        refreshRole,
        deleteAccount,
      }}
    >
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
