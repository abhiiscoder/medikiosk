import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Headphones,
  Info,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
  Mail
} from 'lucide-react';
import './HelpSupportPopover.css';

export interface HelpSupportPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
}

export const HelpSupportPopover: React.FC<HelpSupportPopoverProps> = ({
  isOpen,
  onClose,
  collapsed = false
}) => {
  const [view, setView] = useState<'main' | 'contact' | 'about'>('main');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const SUPPORT_EMAIL = 'shindeaditya2955@gmail.com';

  useEffect(() => {
    if (!isOpen) {
      setView('main');
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      ref={popoverRef}
      className={`mk-help-popover ${collapsed ? 'mk-help-popover--collapsed' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Help and Support"
    >
      {/* Left pointer notch pointing to sidebar item */}
      <div className="mk-help-notch" aria-hidden="true" />

      {view === 'main' ? (
        <div className="mk-help-main-view">
          <div className="mk-help-header">
            <h3 className="mk-help-title">Help & Support</h3>
            <button
              type="button"
              className="mk-help-close-btn"
              onClick={onClose}
              aria-label="Close help"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mk-help-options">
            {/* 1. Contact Support */}
            <button
              type="button"
              className="mk-help-option-card"
              onClick={() => setView('contact')}
            >
              <div className="mk-help-option-icon">
                <Headphones size={18} />
              </div>
              <div className="mk-help-option-info">
                <h4 className="mk-help-option-title">Contact Support</h4>
                <p className="mk-help-option-desc">
                  Get in touch with the MEDiKIOSK team for assistance.
                </p>
              </div>
              <ChevronRight size={15} className="mk-help-chevron" aria-hidden="true" />
            </button>

            {/* 2. About MEDiKIOSK */}
            <button
              type="button"
              className="mk-help-option-card"
              onClick={() => setView('about')}
            >
              <div className="mk-help-option-icon">
                <Info size={18} />
              </div>
              <div className="mk-help-option-info">
                <h4 className="mk-help-option-title">About MEDiKIOSK</h4>
                <p className="mk-help-option-desc">
                  Learn briefly about the clinical workspace.
                </p>
              </div>
              <ChevronRight size={15} className="mk-help-chevron" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : view === 'contact' ? (
        /* Subview 1: Contact Support */
        <div className="mk-help-detail-view">
          <div className="mk-help-detail-header">
            <button
              type="button"
              className="mk-help-back-btn"
              onClick={() => setView('main')}
              aria-label="Back to help menu"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <h3 className="mk-help-title">Contact Support</h3>
            <button
              type="button"
              className="mk-help-close-btn"
              onClick={onClose}
              aria-label="Close help"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mk-help-contact-body">
            <p className="mk-help-contact-heading">Need help with MEDiKIOSK?</p>
            <p className="mk-help-contact-sub">
              Get in touch with our team for assistance.
            </p>

            <div className="mk-help-email-card">
              <div className="mk-help-email-left">
                <Mail size={16} className="mk-help-mail-icon" />
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mk-help-email-link"
                  title="Open mail client"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>

              <button
                type="button"
                className={`mk-help-copy-btn ${copiedEmail ? 'mk-help-copy-btn--copied' : ''}`}
                onClick={handleCopyEmail}
                aria-label={copiedEmail ? 'Copied email' : 'Copy support email'}
              >
                {copiedEmail ? (
                  <>
                    <Check size={14} /> <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} /> <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Subview 2: About MEDiKIOSK */
        <div className="mk-help-detail-view">
          <div className="mk-help-detail-header">
            <button
              type="button"
              className="mk-help-back-btn"
              onClick={() => setView('main')}
              aria-label="Back to help menu"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <h3 className="mk-help-title">About MEDiKIOSK</h3>
            <button
              type="button"
              className="mk-help-close-btn"
              onClick={onClose}
              aria-label="Close help"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mk-help-about-body">
            <div className="mk-help-about-branding">
              <div className="mk-help-about-logo">
                <div className="mk-about-dot mk-about-dot--blue" />
                <div className="mk-about-dot mk-about-dot--cyan" />
                <div className="mk-about-dot mk-about-dot--soft" />
              </div>
              <div>
                <h4 className="mk-help-brand-name">MEDiKIOSK</h4>
                <p className="mk-help-brand-tagline">AI-Powered Clinical Workspace</p>
              </div>
            </div>

            <p className="mk-help-about-desc">
              MEDiKIOSK is an AI-powered clinical workspace designed to organize
              patient information, clinical history, medical documents and clinical
              summaries in one workspace.
            </p>

            <div className="mk-help-about-footer">
              <span className="mk-help-prototype-badge">SIH'26 Prototype</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
