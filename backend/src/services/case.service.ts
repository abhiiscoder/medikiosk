/**
 * MEDiKIOSK Backend — Phase 02: Case & Clinical Session Service Layer
 * Business logic managing Patient, Case, and Clinical Session lifecycles and ownership.
 */

import { Patient, IPatient, Gender, BloodGroup } from '../models/patient.model.js';
import { Case, CaseStatus, WorkflowStage } from '../models/case.model.js';
import { ClinicalSession, IClinicalSession } from '../models/session.model.js';
import { generateCaseId, generatePatientId, generateSessionId, generateMrn } from '../utils/idGenerator.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface PatientInputData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  contactNumber?: string;
  abhaId?: string;
  mrn?: string;
}

export interface CreateCaseInput {
  patientId?: string;
  patientData?: PatientInputData;
  specialId?: string;
}

export interface CaseResponseData {
  caseId: string;
  patientId: string;
  sessionId: string;
  status: CaseStatus;
  workflowStage: WorkflowStage;
  patient?: {
    patientId: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    age?: number;
    mrn: string;
    bloodGroup?: BloodGroup;
  };
  activeSession?: {
    sessionId: string;
    status: string;
    startedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const VALID_CASE_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  draft: ['active', 'completed', 'archived'],
  active: ['completed', 'archived'],
  completed: ['archived'],
  archived: []
};

class CaseService {
  /**
   * Creates a new Patient (or references existing), Case, and initial Clinical Session
   */
  async createCase(userId: string, input: CreateCaseInput): Promise<CaseResponseData> {
    let patientDoc: IPatient | null = null;

    // 1. Identify or Create Patient
    if (input.patientId) {
      patientDoc = await Patient.findOne({ patientId: input.patientId, ownerId: userId });
      if (!patientDoc) {
        throw new AppError(`Patient '${input.patientId}' was not found.`, 404, 'PATIENT_NOT_FOUND');
      }
    } else {
      // Deterministically create a new patient for this intake
      let newPatientId = generatePatientId();
      let pCollision = await Patient.exists({ patientId: newPatientId });
      let pAttempts = 0;
      while (pCollision && pAttempts < 10) {
        newPatientId = generatePatientId();
        pCollision = await Patient.exists({ patientId: newPatientId });
        pAttempts++;
      }

      let newMrn = input.patientData?.mrn || generateMrn();
      if (!input.patientData?.mrn) {
        let mCollision = await Patient.exists({ mrn: newMrn });
        let mAttempts = 0;
        while (mCollision && mAttempts < 10) {
          newMrn = generateMrn();
          mCollision = await Patient.exists({ mrn: newMrn });
          mAttempts++;
        }
      }

      patientDoc = new Patient({
        patientId: newPatientId,
        ownerId: userId,
        firstName: input.patientData?.firstName?.trim() || 'Patient',
        lastName: input.patientData?.lastName?.trim() || newPatientId,
        dateOfBirth: input.patientData?.dateOfBirth,
        age: input.patientData?.age,
        gender: input.patientData?.gender || 'undisclosed',
        bloodGroup: input.patientData?.bloodGroup || 'unknown',
        contactNumber: input.patientData?.contactNumber,
        mrn: newMrn,
        abhaId: input.patientData?.abhaId
      });

      await patientDoc.save();
      logger.info('Created new authoritative patient', {
        patientId: patientDoc.patientId,
        ownerId: userId
      });
    }

    // 2. Generate unique Case ID
    let uniqueCaseId = generateCaseId();
    let collisionCheck = await Case.exists({ caseId: uniqueCaseId });
    let attempts = 0;
    while (collisionCheck && attempts < 5) {
      uniqueCaseId = generateCaseId();
      collisionCheck = await Case.exists({ caseId: uniqueCaseId });
      attempts++;
    }

    // 3. Create Case Record
    const caseDoc = new Case({
      caseId: uniqueCaseId,
      patientId: patientDoc.patientId,
      ownerId: userId,
      status: 'active',
      workflowStage: 'clinical_history'
    });

    await caseDoc.save();
    logger.info('Created new authoritative clinical case', {
      caseId: caseDoc.caseId,
      patientId: patientDoc.patientId,
      ownerId: userId
    });

    // 4. Create Initial Clinical Session
    let uniqueSessionId = generateSessionId();
    let sCollision = await ClinicalSession.exists({ sessionId: uniqueSessionId });
    let sAttempts = 0;
    while (sCollision && sAttempts < 15) {
      uniqueSessionId = generateSessionId();
      sCollision = await ClinicalSession.exists({ sessionId: uniqueSessionId });
      sAttempts++;
    }

    const sessionDoc = new ClinicalSession({
      sessionId: uniqueSessionId,
      caseId: caseDoc.caseId,
      patientId: patientDoc.patientId,
      status: 'active',
      startedAt: new Date()
    });

    await sessionDoc.save();
    logger.info('Initialized clinical intake session', {
      sessionId: sessionDoc.sessionId,
      caseId: caseDoc.caseId
    });

    return {
      caseId: caseDoc.caseId,
      patientId: patientDoc.patientId,
      sessionId: sessionDoc.sessionId,
      status: caseDoc.status,
      workflowStage: caseDoc.workflowStage,
      patient: {
        patientId: patientDoc.patientId,
        firstName: patientDoc.firstName,
        lastName: patientDoc.lastName,
        gender: patientDoc.gender,
        age: patientDoc.age,
        mrn: patientDoc.mrn,
        bloodGroup: patientDoc.bloodGroup
      },
      activeSession: {
        sessionId: sessionDoc.sessionId,
        status: sessionDoc.status,
        startedAt: sessionDoc.startedAt
      },
      createdAt: caseDoc.createdAt,
      updatedAt: caseDoc.updatedAt
    };
  }

  /**
   * Retrieves a specific case by caseId ensuring user ownership
   */
  async getCaseById(userId: string, caseId: string): Promise<CaseResponseData> {
    const caseDoc = await Case.findOne({ caseId });
    if (!caseDoc || caseDoc.ownerId !== userId) {
      // Return 404 without leaking whether record belongs to another user
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    const patientDoc = await Patient.findOne({ patientId: caseDoc.patientId });
    const activeSession = await ClinicalSession.findOne({ caseId: caseDoc.caseId, status: 'active' }).sort({
      startedAt: -1
    });

    return {
      caseId: caseDoc.caseId,
      patientId: caseDoc.patientId,
      sessionId: activeSession?.sessionId || '',
      status: caseDoc.status,
      workflowStage: caseDoc.workflowStage,
      ...(patientDoc
        ? {
            patient: {
              patientId: patientDoc.patientId,
              firstName: patientDoc.firstName,
              lastName: patientDoc.lastName,
              gender: patientDoc.gender,
              age: patientDoc.age,
              mrn: patientDoc.mrn,
              bloodGroup: patientDoc.bloodGroup
            }
          }
        : {}),
      ...(activeSession
        ? {
            activeSession: {
              sessionId: activeSession.sessionId,
              status: activeSession.status,
              startedAt: activeSession.startedAt
            }
          }
        : {}),
      createdAt: caseDoc.createdAt,
      updatedAt: caseDoc.updatedAt
    };
  }

  /**
   * Retrieves the current user's active clinical case (if one exists)
   */
  async getActiveCase(userId: string): Promise<CaseResponseData | null> {
    const caseDoc = await Case.findOne({ ownerId: userId, status: 'active' }).sort({ createdAt: -1 });
    if (!caseDoc) {
      return null;
    }
    return this.getCaseById(userId, caseDoc.caseId);
  }

  /**
   * Lists all cases belonging to the authenticated user with filtering & pagination
   */
  async listCases(
    userId: string,
    options: { status?: string; workflowStage?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { ownerId: userId };
    if (options.status) filter.status = options.status;
    if (options.workflowStage) filter.workflowStage = options.workflowStage;

    const [total, cases] = await Promise.all([
      Case.countDocuments(filter),
      Case.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    // Fetch associated patients in bulk
    const patientIds = cases.map((c) => c.patientId);
    const patients = await Patient.find({ patientId: { $in: patientIds } });
    const patientMap = new Map(patients.map((p) => [p.patientId, p]));

    const items = cases.map((c) => {
      const p = patientMap.get(c.patientId);
      return {
        caseId: c.caseId,
        patientId: c.patientId,
        status: c.status,
        workflowStage: c.workflowStage,
        patient: p
          ? {
              patientId: p.patientId,
              firstName: p.firstName,
              lastName: p.lastName,
              gender: p.gender,
              age: p.age,
              mrn: p.mrn
            }
          : undefined,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    });

    return {
      cases: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Updates controlled workflow fields (status, workflowStage) for an owned case
   */
  async updateCase(
    userId: string,
    caseId: string,
    updates: { status?: CaseStatus; workflowStage?: WorkflowStage }
  ): Promise<CaseResponseData> {
    const caseDoc = await Case.findOne({ caseId });
    if (!caseDoc || caseDoc.ownerId !== userId) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    if (updates.status !== undefined && updates.status !== caseDoc.status) {
      const allowedTransitions = VALID_CASE_STATUS_TRANSITIONS[caseDoc.status] || [];
      if (!allowedTransitions.includes(updates.status)) {
        throw new AppError(
          `Cannot transition case status from '${caseDoc.status}' to '${updates.status}'.`,
          400,
          'INVALID_STATE_TRANSITION'
        );
      }
      caseDoc.status = updates.status;
    }

    if (caseDoc.status === 'archived' && updates.workflowStage !== undefined && updates.workflowStage !== caseDoc.workflowStage) {
      throw new AppError(
        'Archived cases are read-only and cannot have workflow stage mutated.',
        400,
        'CASE_ARCHIVED'
      );
    }

    if (updates.workflowStage !== undefined) {
      caseDoc.workflowStage = updates.workflowStage;
    }

    await caseDoc.save();
    logger.info('Updated case lifecycle status', {
      caseId,
      status: caseDoc.status,
      workflowStage: caseDoc.workflowStage
    });

    return this.getCaseById(userId, caseId);
  }

  /**
   * Creates a new clinical session for a case
   */
  async createSession(userId: string, caseId: string): Promise<IClinicalSession> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // Complete previous active sessions if any
    await ClinicalSession.updateMany(
      { caseId, status: 'active' },
      { $set: { status: 'completed', endedAt: new Date() } }
    );

    let uniqueSessionId = generateSessionId();
    let sCollision = await ClinicalSession.exists({ sessionId: uniqueSessionId });
    let sAttempts = 0;
    while (sCollision && sAttempts < 15) {
      uniqueSessionId = generateSessionId();
      sCollision = await ClinicalSession.exists({ sessionId: uniqueSessionId });
      sAttempts++;
    }

    const session = new ClinicalSession({
      sessionId: uniqueSessionId,
      caseId: caseDoc.caseId,
      patientId: caseDoc.patientId,
      status: 'active',
      startedAt: new Date()
    });

    await session.save();
    logger.info('Started new clinical session for case', {
      sessionId: session.sessionId,
      caseId
    });

    return session;
  }

  /**
   * Lists all clinical sessions for a case
   */
  async listSessions(userId: string, caseId: string): Promise<IClinicalSession[]> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    return ClinicalSession.find({ caseId }).sort({ startedAt: -1 });
  }
}

export const caseService = new CaseService();
