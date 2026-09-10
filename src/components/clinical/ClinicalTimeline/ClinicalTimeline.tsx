/**
 * MEDiKIOSK — PHASE 00
 * Accessible ClinicalTimeline Component
 */

import React from 'react';
import { 
  Activity, 
  Stethoscope, 
  FileText, 
  Pill, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { ClinicalEvent, ClinicalEventCategory } from '../../../types/clinical.types';
import { Badge, BadgeVariant } from '../../core/Badge/Badge';
import { VerificationStatus } from '../StatusBadges/StatusBadges';
import './ClinicalTimeline.css';

export interface ClinicalTimelineProps {
  events: ClinicalEvent[];
  className?: string;
}

const CATEGORY_ICONS: Record<ClinicalEventCategory, React.ReactNode> = {
  symptom: <Activity size={13} />,
  diagnosis: <Stethoscope size={13} />,
  lab_result: <FileText size={13} />,
  medication: <Pill size={13} />,
  procedure: <Activity size={13} />,
  vital_check: <Activity size={13} />,
  encounter: <CheckCircle2 size={13} />
};

export const ClinicalTimeline: React.FC<ClinicalTimelineProps> = ({ events, className = '' }) => {
  const getProvenanceBadgeVariant = (source: string): BadgeVariant => {
    switch (source) {
      case 'user': return 'provenance-user';
      case 'ai': return 'provenance-ai';
      case 'document': return 'provenance-doc';
      case 'clinician': return 'provenance-verified';
      default: return 'provenance-sys';
    }
  };

  return (
    <div className={`mk-timeline ${className}`} role="feed" aria-label="Clinical Timeline Events">
      {events.map((ev: ClinicalEvent) => (
        <article key={ev.id} className="mk-timeline-item">
          <div className="mk-timeline-marker" aria-hidden="true">
            {CATEGORY_ICONS[ev.category] || <Clock size={13} />}
          </div>

          <div className="mk-timeline-content">
            <div className="mk-timeline-header">
              <span className="mk-timeline-title">{ev.title}</span>
              <span className="mk-timeline-time">
                {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p className="mk-timeline-desc">{ev.description}</p>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
              <Badge variant={getProvenanceBadgeVariant(ev.source)}>
                Source: {ev.source}
              </Badge>
              <VerificationStatus level={ev.verificationLevel} />
              {ev.confidenceScore && (
                <span className="text-metadata text-mono text-muted">
                  {(ev.confidenceScore * 100).toFixed(0)}% AI Conf.
                </span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};
