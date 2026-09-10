/**
 * MEDiKIOSK — PHASE 00
 * Reusable AIInsightCard Component (Intelligent, Calm Clinical Reasoning)
 */

import React from 'react';
import { 
  Bot, 
  Sparkles, 
  FileText, 
  Check, 
  X, 
  CheckCircle2 
} from 'lucide-react';
import { AIInsight } from '../../../types/clinical.types';
import { Badge } from '../../core/Badge/Badge';
import { Button } from '../../core/Button/Button';
import './AIInsightCard.css';

export interface AIInsightCardProps {
  insight: AIInsight;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  className?: string;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  insight,
  onAccept,
  onReject,
  className = ''
}) => {
  return (
    <div
      className={`mk-ai-card mk-ai-card--${insight.status} ${className}`}
      role="region"
      aria-label={`AI Clinical Suggestion: ${insight.title}`}
    >
      <div className="mk-ai-card__header">
        <div className="mk-ai-card__title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="#6D28D9" />
            <span className="mk-ai-card__title">{insight.title}</span>
          </div>
          <span className="text-metadata text-mono text-muted">
            Confidence: {(insight.confidenceScore * 100).toFixed(0)}%
          </span>
        </div>

        <Badge variant="provenance-ai" icon={<Bot size={11} />}>
          AI Extracted Finding
        </Badge>
      </div>

      <div className="mk-ai-card__finding">{insight.finding}</div>

      <div className="mk-ai-card__reasoning">
        <strong>Clinical Reasoning: </strong>
        {insight.reasoning}
      </div>

      {insight.citedSources.length > 0 && (
        <div className="mk-ai-card__sources">
          <span className="text-caption text-muted">Attributed Evidence</span>
          {insight.citedSources.map((source: AIInsight['citedSources'][number], i: number) => (
            <div key={i} className="mk-ai-source-item">
              <FileText size={12} />
              <span>
                {source.documentName} {source.pageNumber ? `(p. ${source.pageNumber})` : ''}: "
                {source.quoteSnippet}"
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mk-ai-card__footer">
        <span className="text-metadata text-muted">
          Status: <strong className="text-color-primary">{insight.status.toUpperCase()}</strong>
        </span>

        <div style={{ display: 'flex', gap: '6px' }}>
          {insight.status === 'suggested' ? (
            <>
              {onReject && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<X size={13} />}
                  onClick={() => onReject(insight.id)}
                >
                  Dismiss
                </Button>
              )}
              {onAccept && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Check size={13} />}
                  onClick={() => onAccept(insight.id)}
                >
                  Accept into Record
                </Button>
              )}
            </>
          ) : insight.status === 'accepted' ? (
            <Badge variant="success" icon={<CheckCircle2 size={12} />}>
              Integrated into Clinical Record
            </Badge>
          ) : (
            <Badge variant="default">Dismissed by Clinician</Badge>
          )}
        </div>
      </div>
    </div>
  );
};
