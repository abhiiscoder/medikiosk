/**
 * MEDiKIOSK — PHASE 08
 * Edit Summary Modal Component
 *
 * Allows the patient or reviewer to edit actual summary fields without fabricating medical facts.
 * Edits are explicitly marked with provenance: "manual_edit" and sourceLabel: "Patient Edit".
 */

import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, AlertCircle } from 'lucide-react';
import { StructuredClinicalSummary, SummaryField } from '../../../../../types/clinical.types';
import './EditSummaryModal.css';

export interface EditSummaryModalProps {
  isOpen: boolean;
  summary: StructuredClinicalSummary | null;
  onClose: () => void;
  onSave: (updates: Partial<StructuredClinicalSummary>) => Promise<void>;
}

export const EditSummaryModal: React.FC<EditSummaryModalProps> = ({
  isOpen,
  summary,
  onClose,
  onSave
}) => {
  const [chiefConcern, setChiefConcern] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [timeline, setTimeline] = useState('');
  const [relevantHistory, setRelevantHistory] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [socialHistory, setSocialHistory] = useState('');
  const [ayushInformation, setAyushInformation] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (summary) {
      setChiefConcern(summary.chiefConcern.isProvided ? summary.chiefConcern.value : '');
      setSymptoms(
        summary.symptoms.isProvided
          ? summary.symptoms.value.join(', ')
          : ''
      );
      setTimeline(summary.timeline.isProvided ? summary.timeline.value : '');
      setRelevantHistory(summary.relevantHistory.isProvided ? summary.relevantHistory.value : '');
      setMedications(summary.medications.isProvided ? summary.medications.value.join(', ') : '');
      setAllergies(summary.allergies.isProvided ? summary.allergies.value.join(', ') : '');
      setFamilyHistory(summary.familyHistory?.isProvided ? summary.familyHistory.value : '');
      setSocialHistory(summary.socialHistory?.isProvided ? summary.socialHistory.value : '');
      setAyushInformation(summary.ayushInformation?.isProvided ? summary.ayushInformation.value : '');
      setAdditionalNotes(summary.additionalNotes.isProvided ? summary.additionalNotes.value : '');
      setError(null);
    }
  }, [summary, isOpen]);

  if (!isOpen || !summary) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const updatedChiefConcern: SummaryField<string> = {
        value: chiefConcern.trim() || 'Not provided',
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: Boolean(chiefConcern.trim())
      };

      const symptomsList = symptoms
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updatedSymptoms: SummaryField<string[]> = {
        value: symptomsList.length > 0 ? symptomsList : ['Not provided'],
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: symptomsList.length > 0
      };

      const updatedTimeline: SummaryField<string> = {
        value: timeline.trim() || 'Not provided',
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: Boolean(timeline.trim())
      };

      const updatedHistory: SummaryField<string> = {
        value: relevantHistory.trim() || 'Not provided',
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: Boolean(relevantHistory.trim())
      };

      const medsList = medications
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updatedMedications: SummaryField<string[]> = {
        value: medsList.length > 0 ? medsList : ['Not provided'],
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: medsList.length > 0
      };

      const allergiesList = allergies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updatedAllergies: SummaryField<string[]> = {
        value: allergiesList.length > 0 ? allergiesList : ['Not provided'],
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: allergiesList.length > 0
      };

      const updatedFamilyHistory: SummaryField<string> = {
        value: familyHistory.trim() || 'Not provided',
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: Boolean(familyHistory.trim())
      };

      const updatedSocialHistory: SummaryField<string> = {
        value: socialHistory.trim() || 'Not provided',
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: Boolean(socialHistory.trim())
      };

      const updatedAyushInformation: SummaryField<string> = {
        value: ayushInformation.trim() || 'Not provided',
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: Boolean(ayushInformation.trim())
      };

      const updatedNotes: SummaryField<string> = {
        value: additionalNotes.trim() || 'No additional notes provided',
        source: 'manual_edit',
        sourceLabel: 'Patient Edit',
        isProvided: Boolean(additionalNotes.trim())
      };

      await onSave({
        chiefConcern: updatedChiefConcern,
        symptoms: updatedSymptoms,
        timeline: updatedTimeline,
        relevantHistory: updatedHistory,
        medications: updatedMedications,
        allergies: updatedAllergies,
        familyHistory: updatedFamilyHistory,
        socialHistory: updatedSocialHistory,
        ayushInformation: updatedAyushInformation,
        additionalNotes: updatedNotes
      });

      onClose();
    } catch {
      setError('Unable to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="mk-edit-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-summary-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mk-edit-modal-container">
        {/* Modal Header */}
        <div className="mk-edit-modal-header">
          <div className="mk-edit-modal-title-group">
            <div className="mk-edit-modal-icon">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 id="edit-summary-title" className="mk-edit-modal-title">
                Edit Clinical Summary
              </h3>
              <p className="mk-edit-modal-desc">
                Review and update your case intake details before physician review.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="mk-edit-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Notice */}
        <div className="mk-edit-modal-notice">
          <AlertCircle size={14} className="mk-edit-modal-notice-icon" />
          <span>
            Edited fields will be attributed with a <strong>Patient Edit</strong> source tag. Medical documents cannot be modified here.
          </span>
        </div>

        {error && (
          <div className="mk-edit-modal-error" role="alert">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mk-edit-modal-form">
          <div className="mk-edit-form-group">
            <label htmlFor="edit-chief-concern" className="mk-edit-label">
              Chief Concern
            </label>
            <input
              id="edit-chief-concern"
              type="text"
              className="mk-edit-input"
              value={chiefConcern}
              placeholder="e.g. Fever, cough, and fatigue"
              onChange={(e) => setChiefConcern(e.target.value)}
            />
          </div>

          <div className="mk-edit-form-grid">
            <div className="mk-edit-form-group">
              <label htmlFor="edit-symptoms" className="mk-edit-label">
                Symptoms & Observations (comma-separated)
              </label>
              <input
                id="edit-symptoms"
                type="text"
                className="mk-edit-input"
                value={symptoms}
                placeholder="e.g. Fever, Dry cough, Body aches"
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>

            <div className="mk-edit-form-group">
              <label htmlFor="edit-timeline" className="mk-edit-label">
                Timeline / Duration
              </label>
              <input
                id="edit-timeline"
                type="text"
                className="mk-edit-input"
                value={timeline}
                placeholder="e.g. 3 to 4 days"
                onChange={(e) => setTimeline(e.target.value)}
              />
            </div>
          </div>

          <div className="mk-edit-form-group">
            <label htmlFor="edit-history" className="mk-edit-label">
              Relevant Medical History
            </label>
            <input
              id="edit-history"
              type="text"
              className="mk-edit-input"
              value={relevantHistory}
              placeholder="e.g. Prior conditions or baseline health context"
              onChange={(e) => setRelevantHistory(e.target.value)}
            />
          </div>

          <div className="mk-edit-form-grid">
            <div className="mk-edit-form-group">
              <label htmlFor="edit-medications" className="mk-edit-label">
                Current Medications (comma-separated)
              </label>
              <input
                id="edit-medications"
                type="text"
                className="mk-edit-input"
                value={medications}
                placeholder="e.g. Paracetamol 500mg, or leave blank if none"
                onChange={(e) => setMedications(e.target.value)}
              />
            </div>

            <div className="mk-edit-form-group">
              <label htmlFor="edit-allergies" className="mk-edit-label">
                Known Allergies (comma-separated)
              </label>
              <input
                id="edit-allergies"
                type="text"
                className="mk-edit-input"
                value={allergies}
                placeholder="e.g. Penicillin, or leave blank if none"
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>
          </div>

          <div className="mk-edit-form-grid">
            <div className="mk-edit-form-group">
              <label htmlFor="edit-family-history" className="mk-edit-label">
                Family History
              </label>
              <input
                id="edit-family-history"
                type="text"
                className="mk-edit-input"
                value={familyHistory}
                placeholder="e.g. Parental conditions or hereditary context"
                onChange={(e) => setFamilyHistory(e.target.value)}
              />
            </div>

            <div className="mk-edit-form-group">
              <label htmlFor="edit-social-history" className="mk-edit-label">
                Social History
              </label>
              <input
                id="edit-social-history"
                type="text"
                className="mk-edit-input"
                value={socialHistory}
                placeholder="e.g. Tobacco, alcohol, occupation, lifestyle"
                onChange={(e) => setSocialHistory(e.target.value)}
              />
            </div>
          </div>

          <div className="mk-edit-form-group">
            <label htmlFor="edit-ayush" className="mk-edit-label">
              AYUSH Information
            </label>
            <input
              id="edit-ayush"
              type="text"
              className="mk-edit-input"
              value={ayushInformation}
              placeholder="e.g. Ayurveda, Yoga, Unani, Siddha, Homeopathy, herbal teas"
              onChange={(e) => setAyushInformation(e.target.value)}
            />
          </div>

          <div className="mk-edit-form-group">
            <label htmlFor="edit-notes" className="mk-edit-label">
              Additional Notes
            </label>
            <textarea
              id="edit-notes"
              rows={2}
              className="mk-edit-textarea"
              value={additionalNotes}
              placeholder="Any other notes for the physician..."
              onChange={(e) => setAdditionalNotes(e.target.value)}
            />
          </div>

          {/* Modal Footer */}
          <div className="mk-edit-modal-footer">
            <button
              type="button"
              className="mk-edit-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mk-edit-btn-primary"
              disabled={isSubmitting}
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
