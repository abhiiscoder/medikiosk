/**
 * MEDiKIOSK — PHASE 00
 * Design Tokens Living Showcase
 */

import React from 'react';
import { Section, Grid, Stack, Inline } from '../components/layout/Primitives';
import { Card } from '../components/core/Card/Card';

export const TokenShowcase: React.FC = () => {
  const brandColors = [
    { name: 'Brand Primary', var: '--color-brand-primary', hex: '#0E47C2', text: '#FFF' },
    { name: 'Brand Hover', var: '--color-brand-hover', hex: '#0B3A9E', text: '#FFF' },
    { name: 'Brand Active', var: '--color-brand-active', hex: '#092C78', text: '#FFF' },
    { name: 'Brand Subtle', var: '--color-brand-subtle', hex: '#EFF6FF', text: '#0E47C2' },
    { name: 'Brand Border', var: '--color-brand-border', hex: '#BFDBFE', text: '#1E40AF' }
  ];

  const surfaceColors = [
    { name: 'App Background', var: '--color-bg-app', hex: '#F8FAFC', text: '#0F172A' },
    { name: 'Surface Default', var: '--color-bg-surface', hex: '#FFFFFF', text: '#0F172A' },
    { name: 'Surface Muted', var: '--color-bg-surface-muted', hex: '#F1F5F9', text: '#0F172A' },
    { name: 'Border Default', var: '--color-border-default', hex: '#E2E8F0', text: '#0F172A' },
    { name: 'Border Strong', var: '--color-border-strong', hex: '#CBD5E1', text: '#0F172A' }
  ];

  const statusColors = [
    { name: 'Success (Verified)', var: '--color-status-success', hex: '#059669', text: '#FFF' },
    { name: 'Warning (Review)', var: '--color-status-warning', hex: '#D97706', text: '#FFF' },
    { name: 'Error (Alert)', var: '--color-status-error', hex: '#DC2626', text: '#FFF' },
    { name: 'Info (Status)', var: '--color-status-info', hex: '#0284C7', text: '#FFF' }
  ];

  const provenanceColors = [
    { name: 'User-Provided', tag: 'Patient Input', bg: 'var(--provenance-user-bg)', border: 'var(--provenance-user-border)', color: 'var(--provenance-user-text)' },
    { name: 'AI-Extracted', tag: 'Clinical AI Model', bg: 'var(--provenance-ai-bg)', border: 'var(--provenance-ai-border)', color: 'var(--provenance-ai-text)' },
    { name: 'Document-Derived', tag: 'OCR / Lab Scan', bg: 'var(--provenance-doc-bg)', border: 'var(--provenance-doc-border)', color: 'var(--provenance-doc-text)' },
    { name: 'Clinician-Reviewed', tag: 'MD Confirmed', bg: 'var(--provenance-verified-bg)', border: 'var(--provenance-verified-border)', color: 'var(--provenance-verified-text)' },
    { name: 'System-Status', tag: 'Infrastructure', bg: 'var(--provenance-sys-bg)', border: 'var(--provenance-sys-border)', color: 'var(--provenance-sys-text)' }
  ];

  const spacingUnits = [
    { token: '--space-1', value: '4px' },
    { token: '--space-2', value: '8px' },
    { token: '--space-3', value: '12px' },
    { token: '--space-4', value: '16px' },
    { token: '--space-5', value: '20px' },
    { token: '--space-6', value: '24px' },
    { token: '--space-8', value: '32px' },
    { token: '--space-12', value: '48px' }
  ];

  const radiusUnits = [
    { token: '--radius-sm', value: '4px', label: 'Controls & Tags' },
    { token: '--radius-md', value: '6px', label: 'Buttons & Inputs' },
    { token: '--radius-lg', value: '10px', label: 'Cards & Panels' },
    { token: '--radius-xl', value: '14px', label: 'Modals & Drawers' },
    { token: '--radius-full', value: '9999px', label: 'Pills & Avatars' }
  ];

  return (
    <Stack gap={6}>
      {/* 1. Brand & Surfaces */}
      <Section
        title="1. Semantic Color Tokens"
        subtitle="Restrained clinical palette designed for calm clinical workspaces, high contrast (WCAG AA compliant), and visual restraint."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h4 className="text-heading-subsection">Brand Palette (Clinical Blue)</h4>
          <Grid cols={3} gap={3}>
            {brandColors.map((c) => (
              <div
                key={c.name}
                style={{
                  backgroundColor: `var(${c.var})`,
                  color: c.text,
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-default)'
                }}
              >
                <div className="font-semibold" style={{ fontSize: '13px' }}>{c.name}</div>
                <div className="text-mono" style={{ fontSize: '11px', opacity: 0.9 }}>{c.var}</div>
                <div className="text-mono" style={{ fontSize: '11px', opacity: 0.8 }}>{c.hex}</div>
              </div>
            ))}
          </Grid>

          <h4 className="text-heading-subsection" style={{ marginTop: 'var(--space-2)' }}>
            Surfaces & Borders
          </h4>
          <Grid cols={3} gap={3}>
            {surfaceColors.map((c) => (
              <div
                key={c.name}
                style={{
                  backgroundColor: `var(${c.var})`,
                  color: c.text,
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-default)'
                }}
              >
                <div className="font-semibold" style={{ fontSize: '13px' }}>{c.name}</div>
                <div className="text-mono" style={{ fontSize: '11px', opacity: 0.9 }}>{c.var}</div>
                <div className="text-mono" style={{ fontSize: '11px', opacity: 0.8 }}>{c.hex}</div>
              </div>
            ))}
          </Grid>

          <h4 className="text-heading-subsection" style={{ marginTop: 'var(--space-2)' }}>
            Semantic Status Roles
          </h4>
          <Grid cols={4} gap={3}>
            {statusColors.map((c) => (
              <div
                key={c.name}
                style={{
                  backgroundColor: `var(${c.var})`,
                  color: c.text,
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div className="font-semibold" style={{ fontSize: '13px' }}>{c.name}</div>
                <div className="text-mono" style={{ fontSize: '11px', opacity: 0.9 }}>{c.var}</div>
              </div>
            ))}
          </Grid>
        </div>
      </Section>

      {/* 2. Clinical Information Hierarchy Tokens */}
      <Section
        title="2. Clinical Information Provenance Tokens"
        subtitle="Critical clinical design rule: User-provided, AI-extracted, Document-derived, and Clinician-reviewed data must never look identical."
      >
        <Grid cols={3} gap={3}>
          {provenanceColors.map((p) => (
            <div
              key={p.name}
              style={{
                backgroundColor: p.bg,
                border: `1.5px solid ${p.border}`,
                color: p.color,
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div className="font-semibold" style={{ fontSize: '14px' }}>{p.name}</div>
              <div style={{ fontSize: '12px', marginTop: '2px', fontWeight: 500 }}>
                Role: {p.tag}
              </div>
              <div className="text-metadata text-mono" style={{ marginTop: '8px', opacity: 0.85 }}>
                Background: {p.bg}
              </div>
            </div>
          ))}
        </Grid>
      </Section>

      {/* 3. Typography Scale */}
      <Section
        title="3. Typography Scale (Inter)"
        subtitle="Prioritizes readability, clinical information density, and hierarchy over flashy marketing typography."
      >
        <Card padding="md">
          <Stack gap={3}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-display">Display Title (30px / 1.875rem)</span>
              <span className="text-metadata text-mono">--font-size-display</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-title-app">Application Workspace Title (22px / 1.375rem)</span>
              <span className="text-metadata text-mono">--font-size-title-app</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-title-page">Page / Primary Section Title (19px / 1.1875rem)</span>
              <span className="text-metadata text-mono">--font-size-title-page</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-heading-section">Section Heading (17px / 1.0625rem)</span>
              <span className="text-metadata text-mono">--font-size-heading-section</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-heading-subsection">Subsection Heading (15px / 0.9375rem)</span>
              <span className="text-metadata text-mono">--font-size-heading-subsection</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-body">Body Primary Clinical Density (14px / 0.875rem) - Standard clinical prose</span>
              <span className="text-metadata text-mono">--font-size-body</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-body-small">Body Small / Table Rows (13px / 0.8125rem)</span>
              <span className="text-metadata text-mono">--font-size-body-small</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-metadata">Metadata & Source Attribution (12px / 0.75rem)</span>
              <span className="text-metadata text-mono">--font-size-metadata</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="text-caption">Caption & Pill Tag (11px / 0.6875rem)</span>
              <span className="text-metadata text-mono">--font-size-caption</span>
            </div>
          </Stack>
        </Card>
      </Section>

      {/* 4. Spacing & Radius System */}
      <Section
        title="4. Spacing & Border Radius System"
        subtitle="Strict 4px incremental spacing scale and restrained geometry to prevent irregular margins and bubbly pill-heavy containers."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          <Card title="4px Spacing Increments" padding="md">
            <Stack gap={2}>
              {spacingUnits.map((s) => (
                <div key={s.token} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="text-mono" style={{ width: '85px', fontSize: '12px' }}>{s.token}</span>
                  <div
                    style={{
                      height: '14px',
                      width: s.value,
                      backgroundColor: 'var(--color-brand-primary)',
                      borderRadius: '2px'
                    }}
                  />
                  <span className="text-metadata text-muted">{s.value}</span>
                </div>
              ))}
            </Stack>
          </Card>

          <Card title="Border Radius Hierarchy" padding="md">
            <Stack gap={3}>
              {radiusUnits.map((r) => (
                <div key={r.token} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: 'var(--color-brand-subtle)',
                      border: '2px solid var(--color-brand-primary)',
                      borderRadius: `var(${r.token})`
                    }}
                  />
                  <div>
                    <div className="font-medium text-body-small">{r.token} ({r.value})</div>
                    <div className="text-metadata text-muted">{r.label}</div>
                  </div>
                </div>
              ))}
            </Stack>
          </Card>
        </div>
      </Section>
    </Stack>
  );
};
