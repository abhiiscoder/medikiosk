/**
 * MEDiKIOSK — PHASE 00
 * Accessible PatientHeader Component
 */

import React from 'react';
import { AlertTriangle, Heart, Activity } from 'lucide-react';
import { Patient, Allergy } from '../../../types/patient.types';
import { Avatar } from '../../core/Avatar/Avatar';
import { Badge } from '../../core/Badge/Badge';
import { ClinicalStatus } from '../StatusBadges/StatusBadges';
import './PatientHeader.css';

export interface PatientHeaderProps {
  patient: Patient;
  className?: string;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, className = '' }) => {
  const hasSevereAllergy = patient.allergies.some(
    (a: Allergy) => a.severity === 'severe' || a.severity === 'life-threatening'
  );

  return (
    <header className={`mk-patient-header ${className}`} role="banner" aria-label="Active patient context banner">
      <div className="mk-patient-header__identity">
        <Avatar name={`${patient.firstName} ${patient.lastName}`} size="lg" status="online" />
        <div className="mk-patient-header__info">
          <div className="mk-patient-header__name-row">
            <h1 className="mk-patient-header__name">
              {patient.firstName} {patient.lastName}
            </h1>
            <Badge variant="default" pill>
              {patient.age} yrs • {patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O'}
            </Badge>
            <Badge variant="brand" pill>
              Blood Group {patient.bloodGroup}
            </Badge>
          </div>

          <div className="mk-patient-header__identifiers">
            <span>MRN: <strong className="text-mono">{patient.mrn}</strong></span>
            {patient.abhaId && (
              <>
                <span>•</span>
                <span>ABHA ID: <strong className="text-mono">{patient.abhaId}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Vitals Quick Glance */}
      {patient.vitals && (
        <div className="mk-patient-header__vitals-group" aria-label="Latest recorded vital signs">
          <div className="mk-vital-chip">
            <span className="mk-vital-chip__label">Blood Pressure</span>
            <span className="mk-vital-chip__value">
              {patient.vitals.bloodPressureSystolic}/{patient.vitals.bloodPressureDiastolic} mmHg
            </span>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border-strong)' }} />

          <div className="mk-vital-chip">
            <span className="mk-vital-chip__label">Heart Rate</span>
            <span className="mk-vital-chip__value">
              {patient.vitals.heartRate} bpm
            </span>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border-strong)' }} />

          <div className="mk-vital-chip">
            <span className="mk-vital-chip__label">SpO2</span>
            <span className="mk-vital-chip__value">
              {patient.vitals.oxygenSaturation}%
            </span>
          </div>
        </div>
      )}

      {/* Alerts & Triage status */}
      <div className="mk-patient-header__status-group">
        {hasSevereAllergy && (
          <Badge variant="error" icon={<AlertTriangle size={12} />}>
            Allergy Alert: {patient.allergies.find((a: Allergy) => a.severity === 'severe')?.allergen}
          </Badge>
        )}

        <ClinicalStatus priority={patient.triagePriority} />
      </div>
    </header>
  );
};
