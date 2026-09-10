/**
 * MEDiKIOSK — Special ID Authentication Modal
 * Exact implementation of References 02, 03, 04, 05
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Smartphone, 
  Phone, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { ClinicalAiLogo } from '../../assets/ClinicalAiLogo';
import { AuthModalState } from '../../hooks/useSpecialIdAuth';
import { SpecialIdAccount } from '../../services/auth.service';
import './SpecialIdAuthModal.css';

export interface SpecialIdAuthModalProps {
  isOpen: boolean;
  authState: AuthModalState;
  isLoading: boolean;
  errorMessage: string | null;
  recoveredData: { medikioskId: string; name: string } | null;
  generatedAccount: SpecialIdAccount | null;
  onClose: () => void;
  onSignIn: (medikioskId: string) => void;
  onFindId: (mobileNumber: string) => void;
  onSignUp: (name: string, mobileNumber: string) => void;
  onContinue: () => void;
  onGoToForgotId: () => void;
  onGoToSignUp: () => void;
  onGoToSignIn: () => void;
  onClearError: () => void;
}

export const SpecialIdAuthModal: React.FC<SpecialIdAuthModalProps> = ({
  isOpen,
  authState,
  isLoading,
  errorMessage,
  recoveredData,
  generatedAccount,
  onClose,
  onSignIn,
  onFindId,
  onSignUp,
  onContinue,
  onGoToForgotId,
  onGoToSignUp,
  onGoToSignIn,
  onClearError
}) => {
  // Local form inputs
  const [specialIdInput, setSpecialIdInput] = useState('');
  const [mobileInput, setMobileInput] = useState('');
  const [signUpNameInput, setSignUpNameInput] = useState('');
  const [signUpMobileInput, setSignUpMobileInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Clear inputs and errors when switching views
  useEffect(() => {
    onClearError();
    setCopied(false);
  }, [authState, onClearError]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || authState === 'LOGGED_OUT' || authState === 'AUTHENTICATED') {
    return null;
  }

  const handleCopy = (text?: string) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn(specialIdInput);
  };

  const handleFindIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFindId(mobileInput);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignUp(signUpNameInput, signUpMobileInput);
  };

  return (
    <div 
      className="mk-auth-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="mk-auth-title"
      onClick={onClose}
    >
      <div 
        className="mk-auth-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="mk-auth-card__close"
          onClick={onClose}
          aria-label="Close authentication modal"
        >
          <X size={18} />
        </button>

        {/* Card Brand Header (Constant across all states) */}
        <div className="mk-auth-card__brand">
          <div className="mk-auth-card__logo-icon">
            <ClinicalAiLogo size={38} />
          </div>
          <div className="mk-auth-card__wordmark">
            MEDi<span className="brand-accent">KIOSK</span>
          </div>
          <span className="mk-auth-card__subtitle">AI-Powered Clinical Workspace</span>
        </div>

        {/* =========================================================
            STATE 02: SIGN IN (Reference 02)
           ========================================================= */}
        {authState === 'SIGN_IN' && (
          <form onSubmit={handleSignInSubmit}>
            <h2 id="mk-auth-title" className="mk-auth-card__title">
              Welcome back
            </h2>
            <p className="mk-auth-card__desc">
              Enter your MEDiKIOSK ID to continue.
            </p>

            {errorMessage && (
              <div className="mk-auth-error-msg" role="alert">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mk-auth-input-group">
              <div className="mk-auth-input-wrapper">
                <User size={18} className="mk-auth-input-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="mk-auth-input"
                  placeholder="Enter your MEDiKIOSK ID"
                  value={specialIdInput}
                  onChange={(e) => setSpecialIdInput(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="off"
                  spellCheck="false"
                  aria-label="MEDiKIOSK ID"
                />
              </div>
            </div>

            <div className="mk-auth-link-row">
              <button
                type="button"
                className="mk-auth-link"
                onClick={onGoToForgotId}
              >
                Forgot your ID?
              </button>
            </div>

            <button
              type="submit"
              className="mk-auth-btn mk-auth-btn--primary"
              disabled={isLoading || !specialIdInput.trim()}
            >
              <span>{isLoading ? 'Signing in...' : 'Sign in with existing ID'}</span>
              {!isLoading && <ArrowRight size={16} />}
            </button>

            <div className="mk-auth-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="mk-auth-btn mk-auth-btn--secondary"
              onClick={onGoToSignUp}
              disabled={isLoading}
            >
              Create a new MEDiKIOSK ID
            </button>
          </form>
        )}

        {/* =========================================================
            STATE 03: FORGOT MEDiKIOSK ID (Reference 03)
           ========================================================= */}
        {authState === 'FORGOT_ID' && (
          <form onSubmit={handleFindIdSubmit}>
            <h2 id="mk-auth-title" className="mk-auth-card__title">
              Find your MEDiKIOSK ID
            </h2>
            <p className="mk-auth-card__desc">
              Enter the mobile number associated with your MEDiKIOSK account.
            </p>

            {errorMessage && (
              <div className="mk-auth-error-msg" role="alert">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mk-auth-input-group">
              <label className="mk-auth-label">Mobile number</label>
              <div className="mk-auth-input-wrapper">
                <Smartphone size={18} className="mk-auth-input-icon" aria-hidden="true" />
                <input
                  type="tel"
                  className="mk-auth-input"
                  placeholder="Enter your mobile number"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="tel"
                  aria-label="Mobile number"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mk-auth-btn mk-auth-btn--primary"
              disabled={isLoading || !mobileInput.trim()}
              style={{ marginTop: '16px' }}
            >
              <span>{isLoading ? 'Finding your ID...' : 'Find my ID'}</span>
              {!isLoading && <ArrowRight size={16} />}
            </button>

            <div className="mk-auth-back-row">
              <button
                type="button"
                className="mk-auth-back-link"
                onClick={onGoToSignIn}
              >
                <ArrowLeft size={16} />
                <span>Back to sign in</span>
              </button>
            </div>
          </form>
        )}

        {/* =========================================================
            STATE 03-B: FORGOT ID RECOVERED SUCCESS
           ========================================================= */}
        {authState === 'FORGOT_ID_SUCCESS' && (
          <div>
            <h2 id="mk-auth-title" className="mk-auth-card__title">
              ID Found
            </h2>
            <p className="mk-auth-card__desc">
              Account found for {recoveredData?.name}:
            </p>

            <label className="mk-auth-label">Your MEDiKIOSK ID</label>
            <div className="mk-auth-id-container">
              <span className="mk-auth-id-value">{recoveredData?.medikioskId}</span>
              <button
                type="button"
                className={`mk-auth-copy-btn ${copied ? 'mk-auth-copy-btn--copied' : ''}`}
                onClick={() => handleCopy(recoveredData?.medikioskId)}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              className="mk-auth-btn mk-auth-btn--primary"
              style={{ marginTop: '14px' }}
              onClick={() => {
                if (recoveredData?.medikioskId) {
                  setSpecialIdInput(recoveredData.medikioskId);
                  onGoToSignIn();
                }
              }}
            >
              <span>Use this ID to sign in</span>
              <ArrowRight size={16} />
            </button>

            <div className="mk-auth-back-row">
              <button
                type="button"
                className="mk-auth-back-link"
                onClick={onGoToSignIn}
              >
                <ArrowLeft size={16} />
                <span>Back to sign in</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================
            STATE 04: SIGN UP / CREATE ID (Reference 04)
           ========================================================= */}
        {authState === 'SIGN_UP' && (
          <form onSubmit={handleSignUpSubmit}>
            <h2 id="mk-auth-title" className="mk-auth-card__title">
              Create your MEDiKIOSK ID
            </h2>
            <p className="mk-auth-card__desc">
              Enter your details to create your MEDiKIOSK account.
            </p>

            {errorMessage && (
              <div className="mk-auth-error-msg" role="alert">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mk-auth-input-group">
              <label className="mk-auth-label">Name</label>
              <div className="mk-auth-input-wrapper">
                <User size={18} className="mk-auth-input-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="mk-auth-input"
                  placeholder="Enter your name"
                  value={signUpNameInput}
                  onChange={(e) => setSignUpNameInput(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="name"
                  aria-label="Name"
                />
              </div>
            </div>

            <div className="mk-auth-input-group">
              <label className="mk-auth-label">Mobile number</label>
              <div className="mk-auth-input-wrapper">
                <Phone size={18} className="mk-auth-input-icon" aria-hidden="true" />
                <input
                  type="tel"
                  className="mk-auth-input"
                  placeholder="Enter your mobile number"
                  value={signUpMobileInput}
                  onChange={(e) => setSignUpMobileInput(e.target.value)}
                  disabled={isLoading}
                  autoComplete="tel"
                  aria-label="Mobile number"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mk-auth-btn mk-auth-btn--primary"
              disabled={isLoading || !signUpNameInput.trim() || !signUpMobileInput.trim()}
              style={{ marginTop: '16px' }}
            >
              <span>{isLoading ? 'Creating MEDiKIOSK ID...' : 'Create MEDiKIOSK ID'}</span>
              {!isLoading && <ArrowRight size={16} />}
            </button>

            <div className="mk-auth-back-row">
              <button
                type="button"
                className="mk-auth-back-link"
                onClick={onGoToSignIn}
              >
                <ArrowLeft size={16} />
                <span>Back to sign in</span>
              </button>
            </div>
          </form>
        )}

        {/* =========================================================
            STATE 05: GENERATED ID CONFIRMATION (Reference 05)
           ========================================================= */}
        {authState === 'ID_GENERATED' && (
          <div>
            <h2 id="mk-auth-title" className="mk-auth-card__title">
              Your MEDiKIOSK ID is ready
            </h2>
            <p className="mk-auth-card__desc">
              Your account has been created successfully.
            </p>

            <label className="mk-auth-label">Your MEDiKIOSK ID</label>
            <div className="mk-auth-id-container">
              <span className="mk-auth-id-value">
                {generatedAccount?.medikioskId || 'MK-GENERATING'}
              </span>
              <button
                type="button"
                className={`mk-auth-copy-btn ${copied ? 'mk-auth-copy-btn--copied' : ''}`}
                onClick={() => handleCopy(generatedAccount?.medikioskId)}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="mk-auth-supporting-text">
              Keep this ID safe. You will use it to access MEDiKIOSK.
            </p>

            <button
              type="button"
              className="mk-auth-btn mk-auth-btn--primary"
              onClick={onContinue}
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
