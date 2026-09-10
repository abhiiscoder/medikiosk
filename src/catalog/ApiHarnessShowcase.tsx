/**
 * MEDiKIOSK — PHASE 00
 * API Service Boundaries & Integration Test Harness
 */

import React, { useState } from 'react';
import { 
  Server, 
  Play, 
  CheckCircle2, 
  FileCode, 
  ShieldCheck, 
  Send 
} from 'lucide-react';
import { Section, Stack, Grid, Inline } from '../components/layout/Primitives';
import { Card } from '../components/core/Card/Card';
import { Button } from '../components/core/Button/Button';
import { Badge } from '../components/core/Badge/Badge';
import { 
  authService, 
  caseService, 
  conversationService, 
  voiceService, 
  clinicalHistoryService, 
  documentService, 
  ocrService, 
  summaryService, 
  verificationService, 
  interoperabilityService 
} from '../services';
import { useToast } from '../hooks/useToast';

export const ApiHarnessShowcase: React.FC = () => {
  const { showToast } = useToast();
  const [outputJson, setOutputJson] = useState<string>('// Select a service boundary above to execute and inspect its contract.');
  const [isLoading, setIsLoading] = useState(false);
  const [lastServiceCalled, setLastServiceCalled] = useState<string>('None');

  const executeService = async (serviceName: string, callFn: () => Promise<any>) => {
    setIsLoading(true);
    setLastServiceCalled(serviceName);
    try {
      const res = await callFn();
      setOutputJson(JSON.stringify(res, null, 2));
      showToast('success', `${serviceName} Responded`, `Returned ${res.data ? 'valid payload' : 'confirmation'}`);
    } catch (err: any) {
      setOutputJson(JSON.stringify({ error: err?.message || 'Error executing service' }, null, 2));
      showToast('error', `${serviceName} Failed`, err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack gap={6}>
      <Section
        title="API / Backend Service Boundaries & Contracts"
        subtitle="10 decoupled frontend service abstractions ready for REST / WebSocket / gRPC backend integration in later phases."
      >
        <Card padding="md">
          <Stack gap={4}>
            <div>
              <span className="text-label">Interactive Service Execution Triggers</span>
              <Inline gap={2} wrap>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() => executeService('AuthService.getCurrentSession()', () => authService.getCurrentSession())}
                >
                  Auth: Get Session
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() => executeService('CaseService.getActiveCase()', () => caseService.getActiveCase())}
                >
                  Case: Get Active
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() => executeService('ConversationService.getMessages()', () => conversationService.getMessages('case-9941'))}
                >
                  Conversation: Fetch
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() => executeService('VoiceService.startRecording()', () => voiceService.startRecording())}
                >
                  Voice: Start Rec
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() => executeService('ClinicalHistory.getMedications()', () => clinicalHistoryService.getMedications('case-9941'))}
                >
                  Clinical: Medications
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() => executeService('DocumentService.getDocuments()', () => documentService.getDocuments('case-9941'))}
                >
                  Docs: List
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() => executeService('OcrService.triggerOcrProcessing()', () => ocrService.triggerOcrProcessing('doc-01'))}
                >
                  OCR: Parse Doc
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() => executeService('SummaryService.getSummary()', () => summaryService.getSummary('case-9941'))}
                >
                  Summary: Get
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play size={12} />}
                  onClick={() =>
                    executeService('VerificationService.verifyEntity()', () =>
                      verificationService.verifyEntity('ins-02', 'clinical_history', 'verified', 'Physician confirmed.')
                    )
                  }
                >
                  Verification: Sign
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<FileCode size={12} />}
                  onClick={() => executeService('InteroperabilityService.generateFhirBundle()', () => interoperabilityService.generateFhirBundle('case-9941'))}
                >
                  FHIR R4: Build Bundle
                </Button>
              </Inline>
            </div>

            <div
              style={{
                backgroundColor: '#0F172A',
                color: '#38BDF8',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                overflowX: 'auto',
                minHeight: '260px',
                maxHeight: '400px',
                fontFamily: 'var(--font-family-mono)',
                fontSize: '12px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #1E293B',
                  paddingBottom: '6px',
                  marginBottom: '8px',
                  color: '#94A3B8'
                }}
              >
                <span>Active Call: {lastServiceCalled}</span>
                <span>{isLoading ? 'Awaiting simulated response...' : 'Response Ready'}</span>
              </div>
              <pre>{outputJson}</pre>
            </div>
          </Stack>
        </Card>
      </Section>
    </Stack>
  );
};
