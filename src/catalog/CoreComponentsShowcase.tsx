/**
 * MEDiKIOSK — PHASE 00
 * Core Reusable UI Components Showcase
 */

import React, { useState } from 'react';
import { 
  Send, 
  Trash2, 
  Check, 
  Search, 
  AlertCircle, 
  FileText, 
  Settings, 
  User, 
  UploadCloud 
} from 'lucide-react';
import { Section, Stack, Inline, Grid } from '../components/layout/Primitives';
import { Card } from '../components/core/Card/Card';
import { Button } from '../components/core/Button/Button';
import { IconButton } from '../components/core/IconButton/IconButton';
import { Input } from '../components/core/Input/Input';
import { Textarea } from '../components/core/Textarea/Textarea';
import { Select } from '../components/core/Select/Select';
import { Checkbox } from '../components/core/Checkbox/Checkbox';
import { Radio } from '../components/core/Radio/Radio';
import { Switch } from '../components/core/Switch/Switch';
import { Modal } from '../components/core/Modal/Modal';
import { Drawer } from '../components/core/Drawer/Drawer';
import { Tooltip } from '../components/core/Tooltip/Tooltip';
import { Badge } from '../components/core/Badge/Badge';
import { Alert } from '../components/core/Alert/Alert';
import { Avatar } from '../components/core/Avatar/Avatar';
import { Progress } from '../components/core/Progress/Progress';
import { Skeleton } from '../components/core/Skeleton/Skeleton';
import { Tabs } from '../components/core/Tabs/Tabs';
import { Dropdown } from '../components/core/Dropdown/Dropdown';
import { FileUploader } from '../components/core/FileUploader/FileUploader';
import { Divider } from '../components/core/Divider/Divider';
import { EmptyState } from '../components/core/EmptyState/EmptyState';
import { LoadingState } from '../components/core/LoadingState/LoadingState';
import { ErrorState } from '../components/core/ErrorState/ErrorState';
import { StatusIndicator } from '../components/core/StatusIndicator/StatusIndicator';
import { useToast } from '../hooks/useToast';

export const CoreComponentsShowcase: React.FC = () => {
  const { showToast } = useToast();

  // Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form states
  const [inputText, setInputText] = useState('Rajesh Sharma');
  const [inputError, setInputError] = useState('');
  const [selectedGender, setSelectedGender] = useState('male');
  const [isAllergyConsent, setIsAllergyConsent] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isTelemetryEnabled, setIsTelemetryEnabled] = useState(true);

  return (
    <Stack gap={6}>
      {/* 1. Buttons & IconButtons */}
      <Section
        title="1. Buttons & Interaction States"
        subtitle="Full button variants and interaction states (default, hover, active, focus-visible, disabled, loading, success)."
      >
        <Card padding="md">
          <Stack gap={4}>
            <div>
              <span className="text-label">Button Variants</span>
              <Inline gap={3} wrap>
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive" leftIcon={<Trash2 size={14} />}>
                  Destructive
                </Button>
                <Button variant="success" leftIcon={<Check size={14} />}>
                  Success Verified
                </Button>
              </Inline>
            </div>

            <div>
              <span className="text-label">Sizes & States</span>
              <Inline gap={3} wrap>
                <Button size="sm" variant="primary">Small (28px)</Button>
                <Button size="md" variant="primary">Medium (36px)</Button>
                <Button size="lg" variant="primary">Large (44px)</Button>
                <Button variant="primary" disabled>Disabled State</Button>
                <Button variant="primary" isLoading loadingText="Processing Clinical Record...">
                  Hidden
                </Button>
              </Inline>
            </div>

            <div>
              <span className="text-label">Icon Buttons (with Accessible Labels)</span>
              <Inline gap={3}>
                <IconButton icon={<Search size={16} />} aria-label="Search patient registry" variant="secondary" />
                <IconButton icon={<FileText size={16} />} aria-label="View clinical documents" variant="outline" />
                <IconButton icon={<Settings size={16} />} aria-label="Kiosk station settings" variant="ghost" />
                <IconButton icon={<Trash2 size={16} />} aria-label="Delete intake entry" variant="destructive" />
              </Inline>
            </div>
          </Stack>
        </Card>
      </Section>

      {/* 2. Form Controls & Validation */}
      <Section
        title="2. Form Controls & Production Validation"
        subtitle="Standardized accessible form controls with label bindings, required indicators, inline error handling, and keyboard traversal."
      >
        <Card padding="md">
          <Grid cols={2} gap={4}>
            <Input
              label="Patient Full Name"
              requiredIndicator
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (e.target.value.length < 3) {
                  setInputError('Name must contain at least 3 characters.');
                } else {
                  setInputError('');
                }
              }}
              errorMessage={inputError}
              helperText="Enter official name as listed in government health ID"
              leftAdornment={<User size={16} />}
            />

            <Select
              label="Primary Communication Language"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              options={[
                { value: 'en', label: 'English (Indian Standard)' },
                { value: 'hi', label: 'Hindi (हिंदी)' },
                { value: 'ta', label: 'Tamil (தமிழ்)' },
                { value: 'te', label: 'Telugu (తెలుగు)' }
              ]}
              helperText="Select language for conversational kiosk audio prompting"
            />

            <Textarea
              label="Chief Complaint Free-form Note"
              placeholder="Record patient self-reported symptoms in plain text..."
              rows={3}
              helperText="Auto-expands on input"
            />

            <Stack gap={3}>
              <span className="text-label">Selection Controls (Accessible)</span>
              <Checkbox
                label="Confirm allergy screening completed"
                subtext="Mandatory verification before medication triage"
                checked={isAllergyConsent}
                onChange={(e) => setIsAllergyConsent(e.target.checked)}
              />

              <Inline gap={4}>
                <Radio
                  name="gender_group"
                  label="Male"
                  checked={selectedGender === 'male'}
                  onChange={() => setSelectedGender('male')}
                />
                <Radio
                  name="gender_group"
                  label="Female"
                  checked={selectedGender === 'female'}
                  onChange={() => setSelectedGender('female')}
                />
                <Radio
                  name="gender_group"
                  label="Other"
                  checked={selectedGender === 'other'}
                  onChange={() => setSelectedGender('other')}
                />
              </Inline>

              <Switch
                label="Kiosk Telemetry & Session Monitoring"
                subtext="Stream anonymized latency metrics to central clinical server"
                checked={isTelemetryEnabled}
                onChange={(e) => setIsTelemetryEnabled(e.target.checked)}
              />
            </Stack>
          </Grid>
        </Card>
      </Section>

      {/* 3. Feedback, Overlays & Notifications */}
      <Section
        title="3. Overlays, Dialogs & Accessible Notifications"
        subtitle="Calm notifications, accessible keyboard trapping (Escape to dismiss), and system alerts."
      >
        <Card padding="md">
          <Stack gap={4}>
            <Inline gap={3} wrap>
              <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
                Open Clinical Intake Modal
              </Button>
              <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>
                Open Inspection Drawer
              </Button>
              <Tooltip content="Quick action: Triggers simulated success toast">
                <Button
                  variant="outline"
                  onClick={() =>
                    showToast('success', 'Case Verified', 'Patient case signed off by attending physician.')
                  }
                >
                  Show Success Toast
                </Button>
              </Tooltip>
              <Button
                variant="outline"
                onClick={() =>
                  showToast('warning', 'Review Required', 'OCR extracted medication dosage requires confirmation.')
                }
              >
                Show Warning Toast
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  showToast('error', 'Gateway Timeout', 'FHIR interoperability endpoint did not respond.')
                }
              >
                Show Error Toast
              </Button>
            </Inline>

            <Divider />

            <Stack gap={2}>
              <Alert type="info" title="Clinical Guidance Note">
                MEDiKIOSK is operating in Prototype Demonstration mode for SIH'26. Fictional patient data loaded.
              </Alert>

              <Alert
                type="warning"
                title="Severe Drug Interaction Flag"
                onClose={() => alert('Alert dismissed')}
              >
                Patient has confirmed history of NSAID-induced respiratory distress.
              </Alert>

              <Alert type="success" title="ABDM FHIR Bundle Validated">
                Cryptographic checksum verified against National Health Authority sandbox registry.
              </Alert>
            </Stack>
          </Stack>
        </Card>
      </Section>

      {/* 4. Display, Progress & File Uploading */}
      <Section
        title="4. Data Display, Progress, Skeletons & File Uploader"
        subtitle="Medical document uploading, progress indicators, skeleton loading states, and tabbed grouping."
      >
        <Grid cols={2} gap={4}>
          <Card title="Medical Document Upload Zone" padding="md">
            <FileUploader
              onFileSelect={(file) =>
                showToast('info', 'File Received', `Loaded ${file.name} (${(file.size / 1024).toFixed(0)} KB)`)
              }
            />
          </Card>

          <Card title="Progress & Shimmer Skeletons" padding="md">
            <Stack gap={3}>
              <div>
                <span className="text-label">Determinate Progress (65% Complete)</span>
                <Progress value={65} status="brand" />
              </div>

              <div>
                <span className="text-label">Indeterminate Clinical Processing Progress</span>
                <Progress indeterminate status="success" />
              </div>

              <div>
                <span className="text-label">Skeleton Shimmer Placeholder</span>
                <Stack gap={2}>
                  <Skeleton height="20px" width="70%" />
                  <Skeleton height="14px" width="95%" />
                  <Skeleton height="14px" width="85%" />
                </Stack>
              </div>
            </Stack>
          </Card>
        </Grid>
      </Section>

      {/* 5. Standard State Handling */}
      <Section
        title="5. Standardized Asynchronous State Handling"
        subtitle="Consistent visual language for Empty, Loading, Error, and System Status indicators across all screens."
      >
        <Grid cols={3} gap={4}>
          <Card padding="sm">
            <EmptyState
              title="No Documents Uploaded"
              description="Upload patient medical history, prescriptions, or laboratory diagnostic scans."
            />
          </Card>

          <Card padding="sm">
            <LoadingState
              title="Extracting Clinical Entities..."
              description="Structuring chief complaint and symptoms into FHIR observation records."
            />
          </Card>

          <Card padding="sm">
            <ErrorState
              title="OCR Scan Failure"
              message="Low scan contrast prevented automatic text recognition."
              onRetry={() => alert('Retrying OCR analysis...')}
            />
          </Card>
        </Grid>
      </Section>

      {/* Modal Dialog Instance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Patient Intake Confirmation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                showToast('success', 'Intake Started', 'Patient session initialized.');
              }}
            >
              Confirm & Begin Case
            </Button>
          </>
        }
      >
        <p className="text-body">
          Confirm that the active patient is <strong>{inputText}</strong> (MRN: MK-2026-0982).
          Starting a new intake will reset any unsaved preliminary scratchnotes.
        </p>
      </Modal>

      {/* Drawer Instance */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Clinical Telemetry & Context Inspector"
        footer={
          <Button variant="secondary" onClick={() => setIsDrawerOpen(false)}>
            Close Inspector
          </Button>
        }
      >
        <Stack gap={3}>
          <div className="text-body-small">
            <strong>Kiosk Station ID:</strong> KIOSK-DELHI-04
          </div>
          <div className="text-body-small">
            <strong>Latency to AI Model:</strong> 184ms
          </div>
          <div className="text-body-small">
            <strong>Current Session Token:</strong> <code className="text-mono">mock-jwt-active</code>
          </div>
          <Divider />
          <span className="text-heading-subsection">Active System Indicators</span>
          <StatusIndicator status="active" label="Speech Recognition Engine Active" pulse />
          <StatusIndicator status="success" label="Local Database Sync: Healthy" />
          <StatusIndicator status="idle" label="Cloud Backup Queue: 0 Pending" />
        </Stack>
      </Drawer>
    </Stack>
  );
};
