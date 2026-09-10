/**
 * MEDiKIOSK — PHASE 00
 * MEDiKIOSK Clinical & Conversational Primitives Showcase
 */

import React, { useState } from 'react';
import { Section, Stack, Grid, SplitView } from '../components/layout/Primitives';
import { Card } from '../components/core/Card/Card';
import { Button } from '../components/core/Button/Button';
import { PatientHeader } from '../components/clinical/PatientHeader/PatientHeader';
import { ConversationMessage } from '../components/clinical/ConversationMessage/ConversationMessage';
import { ConversationComposer } from '../components/clinical/ConversationComposer/ConversationComposer';
import { VoiceComposer } from '../components/clinical/VoiceComposer/VoiceComposer';
import { ClinicalCard } from '../components/clinical/ClinicalCard/ClinicalCard';
import { DocumentCard } from '../components/clinical/DocumentCard/DocumentCard';
import { SummaryCard } from '../components/clinical/SummaryCard/SummaryCard';
import { ClinicalTimeline } from '../components/clinical/ClinicalTimeline/ClinicalTimeline';
import { AIInsightCard } from '../components/clinical/AIInsightCard/AIInsightCard';
import { 
  MOCK_PATIENT, 
  MOCK_CONVERSATION, 
  MOCK_DOCUMENTS, 
  MOCK_CLINICAL_EVENTS, 
  MOCK_AI_INSIGHTS, 
  MOCK_CLINICAL_SUMMARY 
} from '../mocks';
import { useToast } from '../hooks/useToast';

export const ClinicalPrimitivesShowcase: React.FC = () => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState(MOCK_CONVERSATION);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [insights, setInsights] = useState(MOCK_AI_INSIGHTS);
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);

  const handleSendMessage = (text: string) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: text,
      timestamp: new Date().toISOString(),
      provenance: 'user' as const
    };

    setMessages((prev) => [...prev, newMsg]);
    showToast('info', 'Message Sent', 'Clinical message passed to intake pipeline.');

    // Simulated AI response with "extracting" state
    setTimeout(() => {
      const aiMsg = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant' as const,
        content: 'I have logged this symptom. Are you currently taking any prescription medications for your blood pressure?',
        timestamp: new Date().toISOString(),
        provenance: 'ai' as const,
        stage: 'completed' as const
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1200);
  };

  const handleAcceptInsight = (id: string) => {
    setInsights((prev) =>
      prev.map((ins) => (ins.id === id ? { ...ins, status: 'accepted' as const } : ins))
    );
    showToast('success', 'Insight Accepted', 'Finding added to verified clinical problem list.');
  };

  const handleRejectInsight = (id: string) => {
    setInsights((prev) =>
      prev.map((ins) => (ins.id === id ? { ...ins, status: 'rejected' as const } : ins))
    );
    showToast('warning', 'Insight Dismissed', 'Clinician excluded suggestion from report.');
  };

  return (
    <Stack gap={6}>
      {/* 1. Patient Header */}
      <Section
        title="1. Patient Context Header (Demographics & Vitals)"
        subtitle="Universal patient context banner displaying demographics, MRN/ABHA identifiers, real-time vitals glance, and critical allergy alerts."
      >
        <PatientHeader patient={MOCK_PATIENT} />
      </Section>

      {/* 2. Conversational Workspace Primitives */}
      <Section
        title="2. Conversational Workspace Primitives"
        subtitle="Designed for clinical intake: patient messages with voice playback waveform, AI reasoning stages, and unified text/voice composer."
      >
        <Card title="Clinical Intake Dialogue" padding="md">
          <Stack gap={3}>
            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                padding: 'var(--space-2)',
                backgroundColor: 'var(--color-bg-app)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              {messages.map((m) => (
                <ConversationMessage
                  key={m.id}
                  message={m}
                  onRetry={() => showToast('info', 'Retrying', 'Message re-transmitted.')}
                />
              ))}
            </div>

            {isVoiceOpen ? (
              <VoiceComposer
                isRecording
                onCancel={() => setIsVoiceOpen(false)}
                onCommitTranscript={(transcript) => {
                  handleSendMessage(transcript);
                  setIsVoiceOpen(false);
                }}
              />
            ) : (
              <ConversationComposer
                onSendMessage={handleSendMessage}
                onToggleVoiceMode={() => setIsVoiceOpen(true)}
                onAttachFile={() => showToast('info', 'File Attachment', 'Attachment dialog triggered')}
              />
            )}
          </Stack>
        </Card>
      </Section>

      {/* 3. Clinical & AI Insight Cards */}
      <Section
        title="3. Clinical Cards & AI Insight Reasoning"
        subtitle="Structured clinical entities showing provenance sources, confidence indicators, and doctor sign-off triggers."
      >
        <Grid cols={2} gap={4}>
          <Stack gap={3}>
            <h4 className="text-heading-subsection">Clinical Entity Cards (Provenance Attributed)</h4>
            <ClinicalCard
              title="Amlodipine Besylate 5mg"
              category="Antihypertensive • Oral Daily"
              source="document"
              verificationLevel="verified"
              sourceCitation="Cardiology Prescription Slip pg 1"
            >
              Active daily maintenance medication for primary hypertension. Patient confirmed regular compliance.
            </ClinicalCard>

            <ClinicalCard
              title="Substernal Chest Heaviness"
              category="Chief Complaint • Onset 3 days ago"
              source="user"
              verificationLevel="unverified"
              actions={
                <Button size="sm" variant="outline" onClick={() => alert('Confirming symptom...')}>
                  Confirm Symptom
                </Button>
              }
            >
              Exertional discomfort lasting 5-10 minutes, relieved by resting. Negative for radiation to left shoulder or jaw.
            </ClinicalCard>
          </Stack>

          <Stack gap={3}>
            <h4 className="text-heading-subsection">Calm AI Clinical Intelligence Insights</h4>
            {insights.map((ins) => (
              <AIInsightCard
                key={ins.id}
                insight={ins}
                onAccept={handleAcceptInsight}
                onReject={handleRejectInsight}
              />
            ))}
          </Stack>
        </Grid>
      </Section>

      {/* 4. Medical Document Cards */}
      <Section
        title="4. Medical Document Cards & Processing Pipeline"
        subtitle="Reusable document items supporting OCR status, verification levels, metadata, and preview triggers."
      >
        <Stack gap={2}>
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onPreview={(d) => showToast('info', 'Document Preview', `Viewing ${d.name}`)}
              onRemove={(id) => {
                setDocuments((prev) => prev.filter((d) => d.id !== id));
                showToast('warning', 'Document Removed', 'File deleted from intake staging.');
              }}
            />
          ))}
        </Stack>
      </Section>

      {/* 5. Clinical Timeline & Summary */}
      <Section
        title="5. Chronological Clinical Timeline & Structured Case Summary"
        subtitle="Chronological trail of intake events and doctor-verified clinical summary format."
      >
        <Grid cols={2} gap={4}>
          <Card title="Chronological Intake Timeline" padding="md">
            <ClinicalTimeline events={MOCK_CLINICAL_EVENTS} />
          </Card>

          <SummaryCard
            summary={MOCK_CLINICAL_SUMMARY}
            onVerify={() =>
              showToast('success', 'Verification Signature Created', 'FHIR transaction recorded with clinician credentials.')
            }
            onEdit={() => showToast('info', 'Edit Mode', 'Summary section editor opened.')}
          />
        </Grid>
      </Section>
    </Stack>
  );
};
