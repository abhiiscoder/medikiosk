/**
 * MEDiKIOSK — PHASE 01
 * Main Application Shell Master Component
 */

import React, { useState, useEffect } from 'react';
import { ShellSidebar } from './ShellSidebar';
import { WorkspaceHeader } from './WorkspaceHeader';
import { AmbientWorkspaceGlow } from './AmbientWorkspaceGlow';
import { AmbientWaveField } from './AmbientWaveField';
import { NewCaseEntry } from '../home/NewCaseEntry';
import { NewCaseWorkflow } from '../clinical/NewCaseWorkflow';
import { ClinicalWorkspaceLayoutState } from '../clinical/NewCaseWorkflow/types';
import { ConversationComposer } from '../clinical/ConversationComposer/ConversationComposer';
import { DocumentProcessingCard } from '../clinical/DocumentCard/DocumentProcessingCard';
import { DocumentPreviewModal } from '../clinical/DocumentCard/DocumentPreviewModal';
import { SpecialIdAuthModal } from '../auth/SpecialIdAuthModal';
import { SettingsModal } from '../settings/SettingsModal';
import { HelpSupportPopover } from '../help/HelpSupportPopover';
import { useDocumentPipeline, PipelineItem } from '../../hooks/useDocumentPipeline';
import { useSpecialIdAuth } from '../../hooks/useSpecialIdAuth';
import { useTheme } from '../../hooks/useTheme';
import { notificationService } from '../../services/notification.service';
import { NavItemId } from './PrimaryNavigation';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../core/Toast/ToastContainer';
import { caseService } from '../../services/case.service';
import { conversationService } from '../../services/conversation.service';
import '../../styles/shell.css';

import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { voiceService } from '../../services/voice.service';

export interface MainApplicationShellProps {
  onOpenDesignSystemCatalog?: () => void;
  onCaseCreated?: (caseId: string) => void;
}

export const MainApplicationShell: React.FC<MainApplicationShellProps> = ({
  onOpenDesignSystemCatalog: _onOpenDesignSystemCatalog,
  onCaseCreated
}) => {
  const { showToast } = useToast();
  const auth = useSpecialIdAuth();
  const { theme, setTheme } = useTheme();

  const [activeNav, setActiveNav] = useState<NavItemId>('home');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeWorkflowStage, setActiveWorkflowStage] = useState<string>('clinical-history');
  const [isCaseIntakeStarted, setIsCaseIntakeStarted] = useState(false);
  const [workspaceLayout, setWorkspaceLayout] = useState<ClinicalWorkspaceLayoutState>({
    mode: 'focused',
    splitRatio: 50
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isComposerLoading, setIsComposerLoading] = useState(false);
  const [isSummaryProcessing, setIsSummaryProcessing] = useState(false);
  const [previewItem, setPreviewItem] = useState<PipelineItem | null>(null);

  // Modals & Panels state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(() => notificationService.getUnreadCount());

  // Listen to notification service events
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      setUnreadNotifsCount(notificationService.getUnreadCount());
    });
    return () => unsubscribe();
  }, []);

  // Continuous Document Collection & Processing Pipeline
  const documentPipeline = useDocumentPipeline({
    onDocumentProcessed: (item) => {
      showToast(
        'success',
        'Document Processed',
        `${item.name} processed successfully.`
      );
      notificationService.addNotification(
        'document_processing',
        'Document Processed',
        `${item.name} processed successfully.`,
        'documents'
      );
    },
    onError: (item, err) => {
      showToast('error', 'Document Processing Error', `${item.name}: ${err}`);
    }
  });

  const voiceAssistant = useVoiceAssistant({
    onTranscriptCommitted: async (transcript) => {
      showToast('info', 'Voice Input Committed', `Intake: "${transcript}"`);
      return await handleComposerSendMessage(transcript, 'voice');
    },
    onSessionEnded: () => {
      showToast('info', 'Voice Interaction Ended', 'Restored normal clinical text composer.');
    }
  });

  const handleSidebarNewCase = async () => {
    if (!auth.isAuthenticated) {
      showToast('info', 'Sign In Required', 'Please sign in with your MEDiKIOSK ID to start a new case.');
      auth.openSignIn();
      return;
    }

    try {
      showToast('info', 'Initializing Case', 'Creating new clinical intake session...');
      const res = await caseService.startNewCase({});
      if (res && res.success) {
        setActiveCaseId(res.data.caseId);
        setActiveNav('new-case');
        showToast(
          'success',
          'Case Created',
          `New patient case ${res.data.caseId} initialized.`
        );
        notificationService.addNotification(
          'case_updates',
          'Case Created',
          `New patient case ${res.data.caseId} initialized.`,
          'cases'
        );
        onCaseCreated?.(res.data.caseId);
      }
    } catch {
      showToast('error', 'Error', 'Unable to start a new case. Please try again.');
    }
  };

  const handleComposerSendMessage = async (text: string, source: 'text' | 'voice' = 'text'): Promise<string | void> => {
    if (activeNav === 'new-case') {
      if (!isCaseIntakeStarted) {
        showToast('info', 'Pre-Intake Phase', 'Please select "Start Clinical History" above to begin your intake.');
        return;
      }
      if (!activeCaseId) {
        showToast('error', 'No Active Case', 'Please start a new case session before submitting intake responses.');
        return;
      }
      try {
        setIsComposerLoading(true);
        const res = await conversationService.sendMessage(activeCaseId, text, source);
        if (res && res.success && res.data && res.data.content) {
          return res.data.content;
        }
      } catch {
        // Fallback gracefully to normal text input without error alerts
      } finally {
        setIsComposerLoading(false);
      }
      return;
    }

    try {
      setIsComposerLoading(true);
      showToast('info', 'Clinical Intake Initiated', `Starting session with query: "${text}"`);
      const res = await caseService.startNewCase({});
      if (res && res.success) {
        setActiveCaseId(res.data.caseId);
        setActiveNav('new-case');
        showToast(
          'success',
          'Case Initialized',
          `Patient case ${res.data.caseId} initialized.`
        );
        onCaseCreated?.(res.data.caseId);
        const sendRes = await conversationService.sendMessage(res.data.caseId, text, source);
        if (sendRes && sendRes.success && sendRes.data && sendRes.data.content) {
          return sendRes.data.content;
        }
      }
    } catch {
      showToast('error', 'Error', 'Unable to start a new case. Please try again.');
    } finally {
      setIsComposerLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (voiceAssistant.voiceState === 'IDLE') {
      showToast('info', 'Voice Assistant Activated', 'Listening for clinical speech input...');
      voiceAssistant.startSession();
    } else {
      voiceAssistant.endSession();
    }
  };

  const handleComposerPlus = () => {
    showToast('info', 'Attach Medical Record', 'Upload prescriptions, laboratory reports, or diagnostic documents.');
  };

  const handleNavSelect = (id: NavItemId) => {
    setActiveNav(id);
  };

  return (
    <div className="medikiosk-shell">
      {/* 0. Real Live Animated Blue Wavelength / Energy-Line Background Field */}
      <AmbientWaveField />

      {/* 1. Left Sidebar (310px desktop, collapsible) */}
      <ShellSidebar
        activeNav={activeNav}
        onSelectNav={handleNavSelect}
        collapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        mobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onNewCase={handleSidebarNewCase}
        onHelp={() => setIsHelpOpen((prev) => !prev)}
        onSettings={() => setIsSettingsOpen(true)}
        isHelpOpen={isHelpOpen}
        isSettingsOpen={isSettingsOpen}
        onUser={() => {
          if (!auth.isAuthenticated) {
            auth.openSignIn();
          } else {
            setIsSettingsOpen(true);
          }
        }}
        onSignIn={auth.openSignIn}
        session={auth.session}
      />

      {/* 2. Main Workspace (Occupies remaining width) */}
      <main className="shell-workspace">
        {/* Workspace Top Header */}
        <WorkspaceHeader
          onToggleMobileSidebar={() => {
            if (window.innerWidth <= 1024) {
              setIsMobileOpen((prev) => !prev);
            } else {
              setIsCollapsed((prev) => !prev);
            }
          }}
          onNotificationClick={() => setIsNotificationsOpen((prev) => !prev)}
          isNotificationsOpen={isNotificationsOpen}
          onCloseNotifications={() => setIsNotificationsOpen(false)}
          unreadCount={unreadNotifsCount}
          onNavigateAction={(route) => {
            if (route === 'home') handleNavSelect('home');
          }}
          onUserMenuClick={() => {
            if (!auth.isAuthenticated) {
              auth.openSignIn();
            } else {
              setIsSettingsOpen(true);
            }
          }}
          onSignInClick={auth.openSignIn}
          onLogout={async () => {
            await auth.logout();
            showToast('info', 'Signed Out', 'You have been signed out of MEDiKIOSK.');
            notificationService.addNotification('account_security', 'Signed Out', 'Active session ended.');
          }}
          session={auth.session}
        />

        {/* Workspace Body with Ambient Lighting, Centered Empty State, and Canonical Composer */}
        <div className="workspace-body">
          {/* Subtle blue/indigo ambient glow & halo arc */}
          <AmbientWorkspaceGlow />

          {/* Central Clinical Entry State or New Case Workflow Shell */}
          {activeNav === 'new-case' ? (
            <NewCaseWorkflow
              caseId={activeCaseId}
              onReturnHome={() => {
                setActiveNav('home');
                setIsCaseIntakeStarted(false);
                setIsSummaryProcessing(false);
              }}
              onStageChange={(stage) => setActiveWorkflowStage(stage)}
              onIntakeStateChange={(started) => setIsCaseIntakeStarted(started)}
              onSummaryProcessingChange={(processing) => setIsSummaryProcessing(processing)}
              onWorkspaceLayoutChange={(layout) => setWorkspaceLayout(layout)}
              documentPipeline={documentPipeline}
              onPreviewDocument={(target) => setPreviewItem(target)}
            />
          ) : (
            <NewCaseEntry
              onCaseStarted={(caseId) => {
                setActiveCaseId(caseId);
                setActiveNav('new-case');
                onCaseCreated?.(caseId);
              }}
              showCenterButton={true}
            />
          )}

          {/* Continuous Document Collection & Processing Pipeline Cards (Shown when not already embedded in Medical Records, Summary, or Split workspace) */}
          {documentPipeline.activeItems.length > 0 && !(activeNav === 'new-case' && (activeWorkflowStage === 'medical-records' || activeWorkflowStage === 'summary' || (activeWorkflowStage === 'clinical-history' && workspaceLayout.mode === 'split'))) && (
            <div className="workspace-pipeline-layer" role="region" aria-label="Medical document pipeline">
              {documentPipeline.activeItems.map((item) => (
                <DocumentProcessingCard
                  key={item.id}
                  item={item}
                  onPreview={(target) => setPreviewItem(target)}
                  onRetry={documentPipeline.retry}
                  onDismiss={documentPipeline.dismissItem}
                />
              ))}
            </div>
          )}

          {/* Canonical AI Conversation Composer & Dynamic Voice Assistant */}
          <div
            className={`workspace-composer-wrapper ${
              activeNav === 'new-case' && activeWorkflowStage === 'clinical-history' && workspaceLayout.mode === 'split'
                ? 'workspace-composer-wrapper--split'
                : ''
            }`}
            style={
              activeNav === 'new-case' && activeWorkflowStage === 'clinical-history' && workspaceLayout.mode === 'split'
                ? {
                    width: `calc(${workspaceLayout.splitRatio}% - 16px)`,
                    left: 0,
                    right: 'auto',
                    marginLeft: '24px',
                    padding: 0,
                    alignItems: 'stretch'
                  }
                : undefined
            }
          >
            <ConversationComposer
              placeholder={
                isSummaryProcessing
                  ? 'Processing clinical summary...'
                  : activeNav === 'new-case'
                    ? isCaseIntakeStarted
                      ? 'Type your answer or health concern...'
                      : 'Select "Start Clinical History" above to begin'
                    : 'Ask MEDiKIOSK'
              }
              disabled={isSummaryProcessing}
              isLoading={isComposerLoading || isSummaryProcessing}
              onSendMessage={handleComposerSendMessage}
              onToggleVoiceMode={handleVoiceToggle}
              onPlusClick={handleComposerPlus}
              onFilesSelected={documentPipeline.processFiles}
              isVoiceActive={voiceAssistant.voiceState !== 'IDLE'}
              voiceState={voiceAssistant.voiceState}
              isMuted={voiceAssistant.isMuted}
              errorMessage={voiceAssistant.errorMessage}
              onVoiceStop={voiceAssistant.stopInteraction}
              onVoiceToggleMute={voiceAssistant.toggleMute}
              onVoiceEnd={voiceAssistant.endSession}
              onVoiceRetry={voiceAssistant.retry}
            />
            {isSummaryProcessing && (
              <div className="workspace-composer-disabled-hint" aria-live="polite">
                Input disabled while summary is being generated.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Real Document Preview & Extracted Findings Modal (Phase 07 & 08) */}
      <DocumentPreviewModal
        isOpen={Boolean(previewItem)}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />

      {/* Special ID Authentication Modal Layer (References 02 - 05) */}
      <SpecialIdAuthModal
        isOpen={auth.isAuthModalOpen}
        authState={auth.authState}
        isLoading={auth.isLoading}
        errorMessage={auth.errorMessage}
        recoveredData={auth.recoveredData}
        generatedAccount={auth.generatedAccount}
        onClose={auth.closeAuthModal}
        onSignIn={async (id) => {
          const ok = await auth.signIn(id);
          if (ok) {
            showToast('success', 'Authenticated', 'Welcome back to MEDiKIOSK.');
            notificationService.addNotification('account_security', 'Successful Sign-in', 'Signed in to clinical workspace.');
          }
        }}
        onFindId={async (mobile) => {
          await auth.findId(mobile);
        }}
        onSignUp={async (name, mobile) => {
          const ok = await auth.signUp(name, mobile);
          if (ok) {
            showToast('success', 'Account Created', 'Your MEDiKIOSK ID is ready.');
            notificationService.addNotification('account_security', 'Account Created', 'MEDiKIOSK ID registered successfully.');
          }
        }}
        onContinue={() => {
          auth.continueFromGenerated();
          showToast('success', 'Session Active', 'Signed in successfully.');
        }}
        onGoToForgotId={auth.goToForgotId}
        onGoToSignUp={auth.goToSignUp}
        onGoToSignIn={auth.goToSignIn}
        onClearError={auth.clearError}
      />

      {/* Help & Support Popover (Reference D) */}
      <HelpSupportPopover
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        collapsed={isCollapsed}
      />

      {/* Settings Modal — Profile & Appearance (References B & C) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        session={auth.session}
        currentTheme={theme}
        onSelectTheme={setTheme}
      />

      {/* Accessible Global Toast Layer */}
      <ToastContainer />
    </div>
  );
};
