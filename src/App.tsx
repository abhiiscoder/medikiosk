/**
 * MEDiKIOSK — PHASE 01
 * Primary Application Entry: Main Application Shell
 */

import React, { useState } from 'react';
import { MainApplicationShell } from './components/shell';
import { 
  TokenShowcase, 
  CoreComponentsShowcase, 
  ClinicalPrimitivesShowcase, 
  ProvenanceShowcase, 
  LayoutShowcase, 
  ApiHarnessShowcase 
} from './catalog';
import { AppShell } from './components/layout';
import { Badge } from './components/core/Badge/Badge';
import { ArrowLeft, Palette, Layers, Stethoscope, ShieldAlert, Layout, Server } from 'lucide-react';

export const App: React.FC = () => {
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogTab, setCatalogTab] = useState('tokens');

  // If developer toggles the Phase 00 catalog inspector:
  if (showCatalog) {
    const catalogNavItems = [
      { id: 'tokens', label: 'Design Tokens', icon: <Palette size={18} /> },
      { id: 'core', label: 'Core UI Components', icon: <Layers size={18} />, badge: <Badge variant="brand" pill>25+</Badge> },
      { id: 'clinical', label: 'Clinical Primitives', icon: <Stethoscope size={18} />, badge: <Badge variant="success" pill>12</Badge> },
      { id: 'provenance', label: 'Information Hierarchy', icon: <ShieldAlert size={18} /> },
      { id: 'layout', label: 'Layout & Breakpoints', icon: <Layout size={18} /> },
      { id: 'api', label: 'API Boundaries & FHIR', icon: <Server size={18} />, badge: <Badge variant="default" pill>10 APIs</Badge> }
    ];

    const renderCatalog = () => {
      switch (catalogTab) {
        case 'tokens': return <TokenShowcase />;
        case 'core': return <CoreComponentsShowcase />;
        case 'clinical': return <ClinicalPrimitivesShowcase />;
        case 'provenance': return <ProvenanceShowcase />;
        case 'layout': return <LayoutShowcase />;
        case 'api': return <ApiHarnessShowcase />;
        default: return <TokenShowcase />;
      }
    };

    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setShowCatalog(false)}
          style={{
            position: 'fixed',
            top: '12px',
            right: '20px',
            zIndex: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#1865F2',
            color: '#FFFFFF',
            borderRadius: '6px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Main Shell (Phase 01)</span>
        </button>

        <AppShell
          sidebarItems={catalogNavItems}
          activeItemId={catalogTab}
          onSelectItem={(id) => setCatalogTab(id)}
          title="MEDiKIOSK — Design System Foundations (Phase 00)"
          stationName="Foundation Inspector"
        >
          {renderCatalog()}
        </AppShell>
      </div>
    );
  }

  // DEFAULT PRIMARY VIEW: Phase 01 Main Application Shell
  return (
    <MainApplicationShell
      onOpenDesignSystemCatalog={() => setShowCatalog(true)}
    />
  );
};
