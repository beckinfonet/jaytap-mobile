/**
 * Shared axios client for the Railway backend.
 *
 * Phase 1 / Plan 10 (ROLE-05, ROLE-09): consolidates the duplicated
 * `getHeaders()` boilerplate from the 5 service files (CONCERNS.md
 * "Duplicated service boilerplate"), and adds the 401 silent-refresh +
 * 403 role-revoked retry interceptor pair (ROLE-09 final fallback).
 *
 * Anti-pattern guard (PATTERNS.md line 624): this file MUST NOT import from
 * `../context/AuthContext`. The dependency direction is
 * AuthContext → registerAuthHooks → apiClient. Services do not import context.
 *
 * Plan 11 migrates the 5 services to consume this client. Plan 12 adds the
 * `auth.accessChanged.{title,body}` + `auth.session.expired.{title,body}`
 * locale keys that the registered toast hook expands.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from './AuthService';

const PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: PRODUCTION_URL,
  timeout: 15000,
});

// --- Request interceptor — attach Bearer ---------------------------------

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Always read at request time. The token rotates every ~60min after refresh,
  // so caching at module scope would race the silent-refresh path.
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  // No token = no header. Public endpoints (e.g. GET /properties) keep working.
  return config;
});

// --- Single-flight refresh -----------------------------------------------

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * Module-scope promise so N parallel 401s share ONE refresh call
 * (PITFALLS Pitfall 7: refresh-token race). Resolves to the new id_token,
 * or null if refresh is impossible (no refresh token / Firebase rejected it).
 */
let refreshPromise: Promise<string | null> | null = null;
async function refreshIdTokenSingleflight(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) return null;
        try {
          return await AuthService.refreshIdToken(refreshToken);
        } catch (_e) {
          return null;
        }
      } finally {
        // Always clear so the next 401 can start a fresh refresh attempt.
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Single-flight role refresh. Mirrors the refresh-token pattern: N parallel
 * 403 role-revoked responses share one `GET /api/auth/me` call.
 */
let refreshRolePromise: Promise<void> | null = null;
async function refreshRoleSingleflight(): Promise<void> {
  if (!refreshRoleHook) return;
  if (!refreshRolePromise) {
    refreshRolePromise = (async () => {
      try {
        await refreshRoleHook!();
      } finally {
        refreshRolePromise = null;
      }
    })();
  }
  return refreshRolePromise;
}

// --- Auth hooks (registered by AuthContext) -------------------------------

// Three hooks: refreshRole, logout, toast. Toast accepts a locale-key prefix
// (e.g. 'auth.accessChanged') and AuthContext expands it to title + body.
//
// HI-01: logout accepts an optional `silent` flag. AuthContext.logout(silent=false)
// fires the bilingual "Session expired" Alert.alert (D-11 path); silent=true skips
// it. Branch 3 below (post-retry 403, ROLE-09 final fallback) passes silent=true
// so only the 'auth.accessChanged' toast surfaces — without this, the user gets
// two stacked alerts ("Session expired" THEN "Your access changed").
let refreshRoleHook: (() => Promise<void>) | null = null;
let logoutHook: ((silent?: boolean) => Promise<void>) | null = null;
let toastHook: ((localeKeyPrefix: string) => void) | null = null;

export function registerAuthHooks(hooks: {
  refreshRole: () => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
  toast: (localeKeyPrefix: string) => void;
}) {
  refreshRoleHook = hooks.refreshRole;
  logoutHook = hooks.logout;
  toastHook = hooks.toast;
}

// --- Response interceptor ------------------------------------------------
//
// Branch 1: 401 token-expired
//   → silent-refresh via Firebase REST → retry once → return.
//   On refresh failure: hard logout (D-11). Toast for D-11 is wired by Plan 12
//   directly inside AuthContext.logout — not here, so 'auth.session.expired'
//   stays out of this file.
//
// Branch 2: 403 role-revoked (first pass)
//   → call refreshRoleHook (single-flight) → retry once.
//
// Branch 3: 403 role-revoked (post-retry, ROLE-09 final fallback)
//   → if the retry STILL returns 403, the user's access is genuinely revoked.
//   Force logout + 'auth.accessChanged' toast (the prefix; AuthContext expands
//   to title+body for Alert.alert).
//
// Other error envelope codes from Plan 05/06 ('invalid-token', 'missing-token',
// 'account-locked', 'insufficient-role') are propagated to the caller without
// special interceptor handling — the UI surfaces them.

apiClient.interceptors.response.use(
  resp => resp,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const code = (error.response?.data as { code?: string } | undefined)?.code;

    // Branch 1: 401 token-expired → silent refresh → retry once.
    if (original && status === 401 && code === 'token-expired' && !original._retry) {
      original._retry = true;
      const newToken = await refreshIdTokenSingleflight();
      if (!newToken) {
        // Refresh-token itself expired or rejected. D-11 hard logout.
        // Plan 12 surfaces the 'auth.session.expired' toast inside
        // AuthContext.logout itself; we just trigger the logout here.
        await logoutHook?.();
        return Promise.reject(error);
      }
      original.headers!.set('Authorization', `Bearer ${newToken}`);
      return apiClient.request(original);
    }

    // Branch 2: 403 role-revoked → refreshRole → retry once.
    // Branch 3: post-retry 403 → ROLE-09 final-fallback logout + toast.
    if (original && status === 403 && code === 'role-revoked' && !original._retry) {
      original._retry = true;
      await refreshRoleSingleflight();
      try {
        return await apiClient.request(original);
      } catch (retryErr: unknown) {
        const retryStatus = (retryErr as AxiosError | undefined)?.response?.status;
        if (retryStatus === 403) {
          // Role really was revoked (not stale-cache). Force re-auth.
          // HI-01: silent=true so AuthContext.logout skips the 'auth.session.expired'
          // Alert.alert — we surface 'auth.accessChanged' immediately below as the
          // single, correct toast for ROLE-09's final fallback. Branch 1 (above) keeps
          // silent=false (default) because that path IS the D-11 session-expired path.
          await logoutHook?.(true);
          toastHook?.('auth.accessChanged');
        }
        throw retryErr;
      }
    }

    return Promise.reject(error);
  }
);
