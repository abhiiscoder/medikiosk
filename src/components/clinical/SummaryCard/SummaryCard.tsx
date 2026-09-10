/**
 * MEDiKIOSK — PHASE 00
 * Reusable Structured Clinical SummaryCard Component
 */

import React from 'react';
import { FileText, CheckCircle2, ShieldCheck, Stethoscope } from 'lucide-react';
import { ClinicalSummary } from '../../../types/clinical.types';
import { VerificationStatus } from '../StatusBadges/StatusBadges';
import { Button } from '../../core/Button/Button';
import './SummaryCard.css';

export interface SummaryCardProps {
  summary: ClinicalSummary;
  onVerify?: () => void;
  onEdit?: () => void;
  className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  onVerify,
  onEdit,
  className = ''
}) => {
  return (
    <div className={`mk-summary-card ${className}`} role="region" aria-label="Clinical Case Summary">
      <div className="mk-summary-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Stethoscope size={20} color="var(--color-brand-primary)" />
          <h2 className="mk-summary-card__title">Clinical Case Intake Summary</h2>
        </div>
        <VerificationStatus level={summary.overallVerification} />
      </div>

      {/* Chief Complaint */}
      <div className="mk-summary-section">
        <span className="mk-summary-section__title">Chief Complaint</span>
        <p className="mk-summary-section__body font-medium">{summary.chiefComplaint}</p>
      </div>

      {/* History of Present Illness */}
      <div className="mk-summary-section">
        <span className="mk-summary-section__title">History of Present Illness</span>
        <p className="mk-summary-section__body">{summary.historyOfPresentIllness}</p>
      </div>

      {/* Pertinent Positives & Negatives */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="mk-summary-section">
          <span className="mk-summary-section__title" style={{ color: 'var(--color-brand-primary)' }}>
            Pertinent Positives
          </span>
          <ul className="mk-summary-list">
            {summary.pertinentPositives.map((item: string, idx: number) => (
              <li key={idx} className="mk-summary-list__item">
                <span className="mk-summary-list__bullet" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mk-summary-section">
          <span className="mk-summary-section__title" style={{ color: 'var(--color-text-muted)' }}>
            Pertinent Negatives
          </span>
          <ul className="mk-summary-list">
            {summary.pertinentNegatives.map((item: string, idx: number) => (
              <li key={idx} className="mk-summary-list__item">
                <span className="mk-summary-list__bullet" style={{ backgroundColor: 'var(--color-text-muted)' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Next Steps */}
      <div className="mk-summary-section">
        <span className="mk-summary-section__title">Recommended Next Steps & Orders</span>
        <ul className="mk-summary-list">
          {summary.recommendedNextSteps.map((step: string, idx: number) => (
            <li key={idx} className="mk-summary-list__item font-medium">
              <span className="mk-summary-list__bullet" style={{ backgroundColor: 'var(--color-status-success)' }} />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Verification footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 'var(--space-3)',
          borderTop: 'var(--border-width-hairline) solid var(--color-border-subtle)'
        }}
      >
        <span className="text-metadata text-muted">
          Last Structured Update: {new Date(summary.lastUpdated).toLocaleTimeString()}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Modify Findings
            </Button>
          )}
          {onVerify && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ShieldCheck size={14} />}
              onClick={onVerify}
            >
              Sign & Verify Record
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
