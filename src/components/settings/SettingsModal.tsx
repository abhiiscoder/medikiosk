import React, { useState } from 'react';
import {
  X,
  User,
  Palette,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { UserSession } from '../../services/auth.service';
import { WorkspaceTheme } from '../../hooks/useTheme';
import './SettingsModal.css';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  currentTheme: WorkspaceTheme;
  onSelectTheme: (theme: WorkspaceTheme) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  currentTheme,
  onSelectTheme
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance'>('profile');
  const [isNameMasked, setIsNameMasked] = useState(false);
  const [isMobileMasked, setIsMobileMasked] = useState(true);
  const [hasCopiedId, setHasCopiedId] = useState(false);

  if (!isOpen) return null;

  // Actual profile data or fallback matching reference B
  const displayName = session?.userName || 'Abhishek Shinde';
  const displayId = session?.medikioskId || 'MED-26A7F3';
  const rawMobile = session?.mobileNumber || '+91 9876541234';

  const maskedName = displayName
    .split(' ')
    .map((w) => (w.length > 1 ? `${w[0]}${'•'.repeat(Math.max(w.length - 1, 4))}` : w))
    .join(' ');

  const maskedMobile = rawMobile.replace(/(\+?\d{2}\s?)(\d{6})(\d{4})/, '$1••••••$3');

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(displayId);
      setHasCopiedId(true);
      setTimeout(() => setHasCopiedId(false), 2200);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="mk-settings-backdrop" role="dialog" aria-modal="true" aria-labelledby="mk-settings-title">
      <div className="mk-settings-modal">
        {/* Left Navigation Column */}
        <aside className="mk-settings-sidebar">
          <button
            type="button"
            className="mk-settings-close-btn"
            onClick={onClose}
            aria-label="Close settings"
            title="Close"
          >
            <X size={18} />
          </button>

          <nav className="mk-settings-nav" aria-label="Settings navigation">
            <button
              type="button"
              className={`mk-settings-nav-item ${activeTab === 'profile' ? 'mk-settings-nav-item--active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} className="mk-settings-nav-icon" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              className={`mk-settings-nav-item ${activeTab === 'appearance' ? 'mk-settings-nav-item--active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Palette size={18} className="mk-settings-nav-icon" />
              <span>Appearance</span>
            </button>
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="mk-settings-content">
          {activeTab === 'profile' ? (
            <div className="mk-settings-section">
              <header className="mk-settings-header">
                <h2 id="mk-settings-title" className="mk-settings-heading">Settings</h2>
                <p className="mk-settings-subheading">
                  Manage your MEDiKIOSK account and workspace preferences.
                </p>
              </header>

              <hr className="mk-settings-divider" />

              <div className="mk-profile-subhead">
                <div className="mk-profile-avatar-badge" aria-hidden="true">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="mk-profile-title">Profile</h3>
                  <p className="mk-profile-desc">Manage your MEDiKIOSK account information.</p>
                </div>
              </div>

              {/* Read-only Profile Card (Reference B) */}
              <div className="mk-profile-card">
                <div className="mk-profile-row">
                  <span className="mk-profile-label">Name</span>
                  <span className="mk-profile-value">
                    {isNameMasked ? maskedName : displayName}
                  </span>
                  <button
                    type="button"
                    className="mk-profile-action-btn"
                    onClick={() => setIsNameMasked((prev) => !prev)}
                    title={isNameMasked ? 'Reveal name' : 'Mask name'}
                    aria-label={isNameMasked ? 'Reveal name' : 'Mask name'}
                  >
                    {isNameMasked ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="mk-profile-row">
                  <span className="mk-profile-label">MEDiKIOSK ID</span>
                  <span className="mk-profile-value mk-profile-value--id">{displayId}</span>
                  <button
                    type="button"
                    className={`mk-profile-action-btn ${hasCopiedId ? 'mk-profile-action-btn--copied' : ''}`}
                    onClick={handleCopyId}
                    title={hasCopiedId ? 'Copied' : 'Copy ID'}
                    aria-label={hasCopiedId ? 'Copied ID' : 'Copy ID'}
                  >
                    {hasCopiedId ? (
                      <span className="mk-copied-feedback">
                        <Check size={14} /> Copied
                      </span>
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>

                <div className="mk-profile-row">
                  <span className="mk-profile-label">Mobile number</span>
                  <span className="mk-profile-value">
                    {isMobileMasked ? maskedMobile : rawMobile}
                  </span>
                  <button
                    type="button"
                    className="mk-profile-action-btn"
                    onClick={() => setIsMobileMasked((prev) => !prev)}
                    title={isMobileMasked ? 'Reveal mobile number' : 'Mask mobile number'}
                    aria-label={isMobileMasked ? 'Reveal mobile number' : 'Mask mobile number'}
                  >
                    {isMobileMasked ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mk-settings-section">
              <header className="mk-settings-header">
                <h2 id="mk-settings-title" className="mk-settings-heading">Appearance</h2>
                <p className="mk-settings-subheading">
                  Customize the visual appearance of your MEDiKIOSK workspace.
                </p>
              </header>

              {/* Theme Selection Grid (Reference C) */}
              <div className="mk-theme-grid">
                {/* Light Theme Card */}
                <div
                  className={`mk-theme-card ${currentTheme === 'light' ? 'mk-theme-card--selected' : ''}`}
                  onClick={() => onSelectTheme('light')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectTheme('light')}
                  aria-pressed={currentTheme === 'light'}
                >
                  <div className="mk-theme-preview mk-theme-preview--light">
                    {/* Realistic MEDiKIOSK Light Interface Preview */}
                    <div className="mk-preview-shell mk-preview-shell--light">
                      <div className="mk-preview-sidebar mk-preview-sidebar--light">
                        <div className="mk-preview-logo-dot mk-preview-logo-dot--blue" />
                        <div className="mk-preview-line mk-preview-line--short" />
                        <div className="mk-preview-pill" />
                        <div className="mk-preview-line" />
                        <div className="mk-preview-line" />
                      </div>
                      <div className="mk-preview-body">
                        <div className="mk-preview-header">
                          <div className="mk-preview-line mk-preview-line--short" />
                        </div>
                        <div className="mk-preview-center">
                          <div className="mk-preview-logo-text">MEDiKIOSK</div>
                          <div className="mk-preview-heading">How can we help you today?</div>
                          <div className="mk-preview-subtext">Start a new patient case to begin collecting clinical information.</div>
                        </div>
                        <div className="mk-preview-composer mk-preview-composer--light">
                          <span>Ask MEDiKIOSK</span>
                        </div>
                      </div>
                    </div>

                    {currentTheme === 'light' && (
                      <div className="mk-theme-selected-badge" aria-label="Selected">
                        <Check size={14} />
                      </div>
                    )}
                  </div>

                  <div className="mk-theme-card-footer">
                    <div className="mk-theme-title-row">
                      <Sun size={18} className="mk-theme-icon mk-theme-icon--sun" />
                      <span className="mk-theme-name">Light Theme</span>
                      <div className={`mk-theme-radio ${currentTheme === 'light' ? 'mk-theme-radio--active' : ''}`}>
                        {currentTheme === 'light' && <div className="mk-theme-radio-dot" />}
                      </div>
                    </div>
                    <p className="mk-theme-desc">
                      Bright clinical interface with soft blue accents.
                    </p>
                  </div>
                </div>

                {/* Dark Theme Card */}
                <div
                  className={`mk-theme-card ${currentTheme === 'dark' ? 'mk-theme-card--selected' : ''}`}
                  onClick={() => onSelectTheme('dark')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectTheme('dark')}
                  aria-pressed={currentTheme === 'dark'}
                >
                  <div className="mk-theme-preview mk-theme-preview--dark">
                    {/* Realistic MEDiKIOSK Dark Interface Preview */}
                    <div className="mk-preview-shell mk-preview-shell--dark">
                      <div className="mk-preview-sidebar mk-preview-sidebar--dark">
                        <div className="mk-preview-logo-dot mk-preview-logo-dot--blue" />
                        <div className="mk-preview-line mk-preview-line--short" />
                        <div className="mk-preview-pill mk-preview-pill--dark" />
                        <div className="mk-preview-line" />
                        <div className="mk-preview-line" />
                      </div>
                      <div className="mk-preview-body">
                        <div className="mk-preview-header">
                          <div className="mk-preview-line mk-preview-line--short" />
                        </div>
                        <div className="mk-preview-center">
                          <div className="mk-preview-logo-text mk-preview-logo-text--dark">MEDiKIOSK</div>
                          <div className="mk-preview-heading mk-preview-heading--dark">How can we help you today?</div>
                          <div className="mk-preview-subtext mk-preview-subtext--dark">Start a new patient case to begin collecting clinical information.</div>
                        </div>
                        <div className="mk-preview-composer mk-preview-composer--dark">
                          <span>Ask MEDiKIOSK</span>
                        </div>
                      </div>
                    </div>

                    {currentTheme === 'dark' && (
                      <div className="mk-theme-selected-badge" aria-label="Selected">
                        <Check size={14} />
                      </div>
                    )}
                  </div>

                  <div className="mk-theme-card-footer">
                    <div className="mk-theme-title-row">
                      <Moon size={18} className="mk-theme-icon mk-theme-icon--moon" />
                      <span className="mk-theme-name">Dark Theme</span>
                      <div className={`mk-theme-radio ${currentTheme === 'dark' ? 'mk-theme-radio--active' : ''}`}>
                        {currentTheme === 'dark' && <div className="mk-theme-radio-dot" />}
                      </div>
                    </div>
                    <p className="mk-theme-desc">
                      Deep clinical interface with blue accents and low-light focus.
                    </p>
                  </div>
                </div>
              </div>

              {/* Theme Preference Note Footer */}
              <div className="mk-theme-footer-note">
                <div className="mk-theme-footer-icon" aria-hidden="true">
                  <Monitor size={18} />
                </div>
                <div>
                  <h4 className="mk-theme-footer-title">Theme preference</h4>
                  <p className="mk-theme-footer-desc">
                    The selected theme will be applied across your MEDiKIOSK workspace and will be remembered for future sessions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
