/**
 * MEDiKIOSK — PHASE 00
 * Layout Primitives & Responsive Behavior Showcase
 */

import React from 'react';
import { Section, Stack, Inline, Grid, SplitView } from '../components/layout/Primitives';
import { Card } from '../components/core/Card/Card';
import { Badge } from '../components/core/Badge/Badge';

export const LayoutShowcase: React.FC = () => {
  return (
    <Stack gap={6}>
      <Section
        title="1. SplitView Layout Primitive"
        subtitle="Foundational two-pane clinical workspace: patient conversational intake on the left, structured clinical entities & document extraction on the right."
      >
        <SplitView
          leftTitle="Left Pane: Conversational Stream"
          left={
            <div style={{ padding: 'var(--space-2)' }}>
              <p className="text-body">
                This pane houses the conversational intake feed, speech-to-text transcriptions, and
                patient interaction controls. It is scrollable independently of the right panel.
              </p>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Badge variant="brand">Independent Scroll Container</Badge>
              </div>
            </div>
          }
          rightTitle="Right Pane: Clinical Extraction & Live Summary"
          right={
            <div style={{ padding: 'var(--space-2)' }}>
              <p className="text-body">
                This pane displays structured findings, AI entity reasoning, extracted laboratory
                markers, and the evolving clinical summary in real-time as the intake proceeds.
              </p>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Badge variant="provenance-ai">Live Entity Synchronizer</Badge>
              </div>
            </div>
          }
        />
      </Section>

      <Section
        title="2. Responsive Grid & Stack Hierarchy"
        subtitle="Desktop is the primary target for SIH'26 kiosk demonstration, but layouts fluidly stack on tablet and mobile viewports."
      >
        <Grid cols={3} gap={4}>
          <Card title="Card 1 (1 of 3 Columns)" padding="md">
            <p className="text-body-small">
              Automatically collapses to single column on mobile (&lt;640px) and 2 columns on tablet (640px-1024px).
            </p>
          </Card>

          <Card title="Card 2 (2 of 3 Columns)" padding="md">
            <p className="text-body-small">
              Consistent 16px gutter spacing utilizing <code className="text-mono">--space-4</code>.
            </p>
          </Card>

          <Card title="Card 3 (3 of 3 Columns)" padding="md">
            <p className="text-body-small">
              Restrained border and subtle shadow for calm, uncluttered medical information density.
            </p>
          </Card>
        </Grid>
      </Section>
    </Stack>
  );
};
