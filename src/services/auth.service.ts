/**
 * MEDiKIOSK — Authentication & Session Service Boundary
 * DEMO MODE: accepts any credentials locally. No backend required.
 */

import { ApiResponse } from '../types/common.types';
import { DEMO_MODE } from '../demo/demoStore';

export interface SpecialIdAccount {
  medikioskId: string;
  name: string;
  mobileNumber: string;
  role: 'kiosk_patient' | 'triage_nurse' | 'physician' | 'system_admin' | 'clinician';
  createdAt: string;
}

export interface UserSession {
  token: string;
  userId: string;
  userName: string;
  medikioskId: string;
  mobileNumber?: string;
  role: 'kiosk_patient' | 'triage_nurse' | 'physician' | 'system_admin' | 'clinician';
  expiresAt: string;
}

export interface IAuthService {
  loginWithSpecialId(medikioskId: string, pin?: string): Promise<ApiResponse<UserSession>>;
  findIdByMobile(mobileNumber: string): Promise<ApiResponse<{ medikioskId: string; name: string }>>;
  createSpecialIdAccount(
    name: string,
    mobileNumber: string
  ): Promise<ApiResponse<{ medikioskId: string; account: SpecialIdAccount; session: UserSession }>>;
  getCurrentSession(): Promise<ApiResponse<UserSession | null>>;
  logout(): Promise<ApiResponse<boolean>>;
}

const STORAGE_KEY_SESSION = 'medikiosk_active_session';

const API_BASE_URL =
  typeof window !== 'undefined' && (window as any).__MEDIKIOSK_API_URL__
    ? (window as any).__MEDIKIOSK_API_URL__
    : 'http://localhost:5000/api/v1';

/**
 * Returns dynamic authorization headers for backend requests based on the active session.
 */
export function getAuthHeaders(): Record<string, string> {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (raw) {
        const session: UserSession = JSON.parse(raw);
        if (session && session.token) {
          return {
            Authorization: `Bearer ${session.token}`,
            'x-user-id': session.userId,
            'x-user-role': session.role || 'clinician',
            'x-user-name': session.userName || ''
          };
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  // Fallback dev context
  return {
    'x-user-id': 'user-clinician-001',
    'x-user-role': 'physician',
    'x-user-name': 'Dr. Ananya Verma'
  };
}

class AuthService implements IAuthService {
  private normalizeId(id: string): string {
    const clean = id.trim().toUpperCase();
    if (!clean.startsWith('MK-') && clean.startsWith('MK')) {
      return `MK-${clean.slice(2)}`;
    }
    return clean;
  }

  private normalizeMobile(mobile: string): string {
    const digits = mobile.replace(/\D/g, '');
    if (digits.length > 10 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    return digits;
  }

  /**
   * Login using MEDiKIOSK ID (and optional PIN) via real backend API
   */
  async loginWithSpecialId(specialId: string, _pin?: string): Promise<ApiResponse<UserSession>> {
    const trimmed = specialId.trim();
    if (!trimmed) {
      return { success: false, data: null as unknown as UserSession, message: 'Please enter a MEDiKIOSK ID or email address.', timestamp: new Date().toISOString() };
    }

    // DEMO MODE: accept any non-empty ID/email
    if (DEMO_MODE) {
      const session: UserSession = {
        token: 'token-' + Date.now(),
        userId: 'clinician-001',
        userName: 'Dr. Arjun Mehta',
        medikioskId: trimmed.toUpperCase().startsWith('MK') ? trimmed.toUpperCase() : 'MK-1042',
        role: 'clinician',
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() // 30 days
      };
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      return { success: true, data: session, message: 'Authentication successful.', timestamp: new Date().toISOString() };
    }

    const normalized = this.normalizeId(trimmed);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medikioskId: normalized, pin: _pin }),
        signal: AbortSignal.timeout(10000)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        return { success: false, data: null as unknown as UserSession, message: result?.error?.message || 'Invalid credentials.', timestamp: new Date().toISOString() };
      }
      const session: UserSession = result.data;
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      return { success: true, data: session, message: 'Authentication successful.', timestamp: new Date().toISOString() };
    } catch (error: any) {
      return { success: false, data: null as unknown as UserSession, message: error?.message || 'Authentication service unreachable.', timestamp: new Date().toISOString() };
    }
  }

  /**
   * Find MEDiKIOSK ID by registered mobile number via backend API
   */
  async findIdByMobile(mobileNumber: string): Promise<ApiResponse<{ medikioskId: string; name: string }>> {
    const normalized = this.normalizeMobile(mobileNumber);
    if (!normalized || normalized.length < 10) {
      return { success: false, data: null as unknown as { medikioskId: string; name: string }, message: 'Please enter a valid 10-digit mobile number.', timestamp: new Date().toISOString() };
    }
    if (DEMO_MODE) {
      return { success: true, data: { medikioskId: 'MK-1042', name: 'Dr. Arjun Mehta' }, timestamp: new Date().toISOString() };
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/find-by-mobile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileNumber: normalized }), signal: AbortSignal.timeout(10000) });
      const result = await response.json();
      if (!response.ok || !result.success) return { success: false, data: null as unknown as { medikioskId: string; name: string }, message: result?.error?.message || 'No ID found for this number.', timestamp: new Date().toISOString() };
      return { success: true, data: result.data, timestamp: new Date().toISOString() };
    } catch (error: any) {
      return { success: false, data: null as unknown as { medikioskId: string; name: string }, message: error?.message || 'Mobile lookup service unreachable.', timestamp: new Date().toISOString() };
    }
  }

  /**
   * Register new user account in backend MongoDB
   */
  async createSpecialIdAccount(
    name: string,
    mobileNumber: string
  ): Promise<ApiResponse<{ medikioskId: string; account: SpecialIdAccount; session: UserSession }>> {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) return { success: false, data: null as unknown as any, message: 'Please enter your full name.', timestamp: new Date().toISOString() };
    const normalizedMobile = this.normalizeMobile(mobileNumber);
    if (!normalizedMobile || normalizedMobile.length < 10) return { success: false, data: null as unknown as any, message: 'Please enter a valid 10-digit mobile number.', timestamp: new Date().toISOString() };

    if (DEMO_MODE) {
      const medikioskId = 'MK-' + Math.floor(Math.random() * 9000 + 1000);
      const account: SpecialIdAccount = { medikioskId, name: trimmedName, mobileNumber: normalizedMobile, role: 'clinician', createdAt: new Date().toISOString() };
      const session: UserSession = { token: 'token-' + Date.now(), userId: 'user-new', userName: trimmedName, medikioskId, role: 'clinician', expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() };
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      return { success: true, data: { medikioskId, account, session }, message: 'Account created successfully.', timestamp: new Date().toISOString() };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: trimmedName, mobileNumber: normalizedMobile, role: 'clinician' }), signal: AbortSignal.timeout(12000) });
      const result = await response.json();
      if (!response.ok || !result.success) return { success: false, data: null as unknown as any, message: result?.error?.message || 'Unable to register account.', timestamp: new Date().toISOString() };
      const { medikioskId, account, session } = result.data;
      if (typeof window !== 'undefined' && session) localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      return { success: true, data: { medikioskId, account, session }, message: 'Account registered.', timestamp: new Date().toISOString() };
    } catch (error: any) {
      return { success: false, data: null as unknown as any, message: error?.message || 'Registration service unreachable.', timestamp: new Date().toISOString() };
    }
  }

  /**
   * Validate and retrieve current persistent session against backend
   */
  async getCurrentSession(): Promise<ApiResponse<UserSession | null>> {
    if (typeof window === 'undefined') {
      return { success: true, data: null, timestamp: new Date().toISOString() };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (!raw) {
        return { success: true, data: null, timestamp: new Date().toISOString() };
      }

      const session: UserSession = JSON.parse(raw);
      if (!session || !session.token || (session.expiresAt && new Date(session.expiresAt) <= new Date())) {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        return { success: true, data: null, timestamp: new Date().toISOString() };
      }

      // DEMO MODE or offline: trust local session without backend verification
      if (DEMO_MODE) {
        return { success: true, data: session, timestamp: new Date().toISOString() };
      }

      // Non-demo: verify token with backend
      try {
        const response = await fetch(`${API_BASE_URL}/auth/session`, { headers: { Authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const freshSession: UserSession = { ...session, ...result.data };
            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(freshSession));
            return { success: true, data: freshSession, timestamp: new Date().toISOString() };
          }
        } else if (response.status === 401) {
          localStorage.removeItem(STORAGE_KEY_SESSION);
          return { success: true, data: null, timestamp: new Date().toISOString() };
        }
      } catch {
        // Backend offline — use local session
      }

      return { success: true, data: session, timestamp: new Date().toISOString() };
    } catch {
      return { success: true, data: null, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Logout user and clear session state
   */
  async logout(): Promise<ApiResponse<boolean>> {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_SESSION);
        if (raw) {
          const session: UserSession = JSON.parse(raw);
          if (session && session.token && !DEMO_MODE) {
            fetch(`${API_BASE_URL}/auth/logout`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.token}` }
            }).catch(() => {});
          }
        }
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch {
      // Ignore
    }

    return {
      success: true,
      data: true,
      message: 'Logged out successfully.',
      timestamp: new Date().toISOString()
    };
  }
}

export const authService = new AuthService();
