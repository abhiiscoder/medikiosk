/**
 * MEDiKIOSK — PHASE 00
 * Fictional Clinical Mock Data: Conversational History
 */

import { ConversationMessage } from '../types/conversation.types';

export const MOCK_CONVERSATION: ConversationMessage[] = [
  {
    id: 'msg-01',
    role: 'system',
    content: 'Clinical Intake Session Initialized. Kiosk Unit #04. Kiosk Mode: Standard Adult Intake.',
    timestamp: '2026-09-07T08:30:00Z',
    provenance: 'system'
  },
  {
    id: 'msg-02',
    role: 'assistant',
    content: 'Hello, Mr. Rajesh Sharma. I am the MEDiKIOSK clinical assistant. I will assist in gathering details about what brings you to the clinic today for your physician. What main symptom or discomfort are you experiencing?',
    timestamp: '2026-09-07T08:30:15Z',
    provenance: 'ai',
    stage: 'completed'
  },
  {
    id: 'msg-03',
    role: 'user',
    content: 'I have been having this tight, heavy feeling in the center of my chest. It started about three days ago, especially when I walk up the stairs or walk fast.',
    timestamp: '2026-09-07T08:31:00Z',
    provenance: 'user',
    audio: {
      durationSeconds: 8.4,
      sampleRate: 44100,
      waveformSample: [0.2, 0.4, 0.7, 0.9, 0.8, 0.6, 0.3, 0.5, 0.7, 0.4, 0.2]
    },
    extractedFindings: [
      { id: 'f-01', entityName: 'Symptom', entityValue: 'Retrosternal chest tightness', category: 'symptom' },
      { id: 'f-02', entityName: 'Duration', entityValue: '3 days', category: 'duration' },
      { id: 'f-03', entityName: 'Aggravator', entityValue: 'Moderate physical exertion (stairs/walking)', category: 'symptom' }
    ]
  },
  {
    id: 'msg-04',
    role: 'assistant',
    content: 'Thank you for sharing that clearly. When you sit down and rest, does the chest pressure gradually fade away? Also, have you noticed any pain spreading to your left shoulder, neck, or jaw?',
    timestamp: '2026-09-07T08:31:30Z',
    provenance: 'ai',
    stage: 'completed'
  },
  {
    id: 'msg-05',
    role: 'user',
    content: 'Yes, if I sit down for 5 to 10 minutes it slowly goes away. No spreading to my arm or jaw so far.',
    timestamp: '2026-09-07T08:32:10Z',
    provenance: 'user',
    extractedFindings: [
      { id: 'f-04', entityName: 'Relieving Factor', entityValue: 'Rest (5-10 min)', category: 'symptom' },
      { id: 'f-05', entityName: 'Radiation', entityValue: 'None (negative for arm/jaw radiation)', category: 'symptom' }
    ]
  },
  {
    id: 'msg-06',
    role: 'assistant',
    content: 'Analyzing your responses against your current medication record...',
    timestamp: '2026-09-07T08:32:15Z',
    provenance: 'ai',
    stage: 'extracting'
  }
];
