/**
 * MEDiKIOSK — PHASE 00
 * Reusable ClinicalCard Component with Provenance & Verification
 */

import React from 'react';
import { 
  User, 
  Bot, 
  FileText, 
  UserCheck, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { ProvenanceSource, VerificationLevel } from '../../../types/common.types';
import { Badge } from '../../core/Badge/Badge';
import { VerificationStatus } from '../StatusBadges/StatusBadges';
import './ClinicalCard.css';

export interface ClinicalCardProps {
  title: string;
  category?: string;
  source: ProvenanceSource;
  verificationLevel?: VerificationLevel;
  confidenceScore?: number;
  sourceCitation?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  title,
  category,
  source,
  verificationLevel,
  confidenceScore,
  sourceCitation,
  children,
  actions,
  className = ''
}) => {
  const getProvenanceBadge = () => {
    switch (source) {
      case 'user':
        return (
          <Badge variant="provenance-user" icon={<User size={11} />}>
            Patient Provided
          </Badge>
        );
      case 'ai':
        return (
          <Badge variant="provenance-ai" icon={<Bot size={11} />}>
            AI Extracted {confidenceScore ? `(${(confidenceScore * 100).toFixed(0)}%)` : ''}
          </Badge>
        );
      case 'document':
        return (
          <Badge variant="provenance-doc" icon={<FileText size={11} />}>
            Document Derived
          </Badge>
        );
      case 'clinician':
        return (
          <Badge variant="provenance-verified" icon={<UserCheck size={11} />}>
            Clinician Confirmed
          </Badge>
        );
      default:
        return (
          <Badge variant="provenance-sys">
            System
          </Badge>
        );
    }
  };

  return (
    <div className={`mk-clinical-card mk-clinical-card--${source} ${className}`} role="region">
      <div className="mk-clinical-card__header">
        <div className="mk-clinical-card__title-row">
          <div className="mk-clinical-card__title">{title}</div>
          {category && <span className="mk-clinical-card__meta">{category}</span>}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {getProvenanceBadge()}
          {verificationLevel && <VerificationStatus level={verificationLevel} />}
        </div>
      </div>

      <div className="mk-clinical-card__content">{children}</div>

      {(sourceCitation || actions) && (
        <div className="mk-clinical-card__footer">
          {sourceCitation ? (
            <div className="mk-clinical-card__source-ref">
              <ExternalLink size={12} />
              <span>Source: {sourceCitation}</span>
            </div>
          ) : (
            <div />
          )}

          {actions && <div style={{ display: 'flex', gap: '6px' }}>{actions}</div>}
        </div>
      )}
    </div>
  );
};
