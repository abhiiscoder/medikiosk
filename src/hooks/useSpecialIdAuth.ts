/**
 * MEDiKIOSK — Special ID Authentication Hook
 *
 * Explicit State Machine:
 * LOGGED_OUT -> SIGN_IN -> AUTHENTICATED
 *             \-> FORGOT_ID -> FORGOT_ID_SUCCESS -> SIGN_IN
 *             \-> SIGN_UP -> ID_GENERATED -> AUTHENTICATED
 */

import { useState, useEffect, useCallback } from 'react';
import { authService, UserSession, SpecialIdAccount } from '../services/auth.service';

export type AuthModalState =
  | 'LOGGED_OUT'
  | 'SIGN_IN'
  | 'FORGOT_ID'
  | 'FORGOT_ID_SUCCESS'
  | 'SIGN_UP'
  | 'ID_GENERATED'
  | 'AUTHENTICATED';

export interface UseSpecialIdAuthReturn {
  authState: AuthModalState;
  isAuthModalOpen: boolean;
  session: UserSession | null;
  isAuthenticated: boolean;
  recoveredData: { medikioskId: string; name: string } | null;
  generatedAccount: SpecialIdAccount | null;
  isLoading: boolean;
  errorMessage: string | null;
  openSignIn: () => void;
  closeAuthModal: () => void;
  goToForgotId: () => void;
  goToSignUp: () => void;
  goToSignIn: () => void;
  signIn: (medikioskId: string) => Promise<boolean>;
  findId: (mobileNumber: string) => Promise<boolean>;
  signUp: (name: string, mobileNumber: string) => Promise<boolean>;
  continueFromGenerated: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useSpecialIdAuth = (): UseSpecialIdAuthReturn => {
  const [authState, setAuthState] = useState<AuthModalState>('LOGGED_OUT');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [recoveredData, setRecoveredData] = useState<{ medikioskId: string; name: string } | null>(null);
  const [generatedAccount, setGeneratedAccount] = useState<SpecialIdAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check persistent session on initial application load
  useEffect(() => {
    let mounted = true;
    authService.getCurrentSession().then((res) => {
      if (!mounted) return;
      if (res.success && res.data) {
        setSession(res.data);
        setAuthState('AUTHENTICATED');
        setIsAuthModalOpen(false);
      } else {
        setSession(null);
        setAuthState('LOGGED_OUT');
        setIsAuthModalOpen(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const openSignIn = useCallback(() => {
    setErrorMessage(null);
    setAuthState('SIGN_IN');
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setErrorMessage(null);
    if (!session) {
      setAuthState('LOGGED_OUT');
    } else {
      setAuthState('AUTHENTICATED');
    }
  }, [session]);

  const goToForgotId = useCallback(() => {
    setErrorMessage(null);
    setAuthState('FORGOT_ID');
  }, []);

  const goToSignUp = useCallback(() => {
    setErrorMessage(null);
    setAuthState('SIGN_UP');
  }, []);

  const goToSignIn = useCallback(() => {
    setErrorMessage(null);
    setAuthState('SIGN_IN');
  }, []);

  const signIn = useCallback(async (medikioskId: string): Promise<boolean> => {
    if (!medikioskId.trim()) {
      setErrorMessage('Please enter your MEDiKIOSK ID.');
      return false;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.loginWithSpecialId(medikioskId);
      if (res.success && res.data) {
        setSession(res.data);
        setAuthState('AUTHENTICATED');
        setIsAuthModalOpen(false);
        return true;
      } else {
        setErrorMessage(res.message || 'Invalid MEDiKIOSK ID. Please check your ID and try again.');
        return false;
      }
    } catch {
      setErrorMessage('Unable to connect to authentication service. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const findId = useCallback(async (mobileNumber: string): Promise<boolean> => {
    const digits = mobileNumber.replace(/\D/g, '');
    if (!digits || digits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return false;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.findIdByMobile(mobileNumber);
      if (res.success && res.data) {
        setRecoveredData(res.data);
        setAuthState('FORGOT_ID_SUCCESS');
        return true;
      } else {
        setErrorMessage(res.message || 'No MEDiKIOSK ID was found for this mobile number.');
        return false;
      }
    } catch {
      setErrorMessage('Lookup service temporarily unavailable. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (name: string, mobileNumber: string): Promise<boolean> => {
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return false;
    }
    const digits = mobileNumber.replace(/\D/g, '');
    if (!digits || digits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return false;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.createSpecialIdAccount(name, mobileNumber);
      if (res.success && res.data) {
        setGeneratedAccount(res.data.account);
        setSession(res.data.session);
        setAuthState('ID_GENERATED');
        return true;
      } else {
        setErrorMessage(res.message || 'Could not create MEDiKIOSK ID. Please try again.');
        return false;
      }
    } catch {
      setErrorMessage('Unable to create account. Please try again later.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const continueFromGenerated = useCallback(() => {
    if (session) {
      setAuthState('AUTHENTICATED');
      setIsAuthModalOpen(false);
    } else {
      setAuthState('SIGN_IN');
    }
  }, [session]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setSession(null);
      setGeneratedAccount(null);
      setRecoveredData(null);
      setAuthState('LOGGED_OUT');
      setIsAuthModalOpen(false);
      setIsLoading(false);
    }
  }, []);

  return {
    authState,
    isAuthModalOpen,
    session,
    isAuthenticated: Boolean(session),
    recoveredData,
    generatedAccount,
    isLoading,
    errorMessage,
    openSignIn,
    closeAuthModal,
    goToForgotId,
    goToSignUp,
    goToSignIn,
    signIn,
    findId,
    signUp,
    continueFromGenerated,
    logout,
    clearError
  };
};
