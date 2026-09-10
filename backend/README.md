# MEDiKIOSK Backend — Authoritative Node.js + TypeScript Service

## Overview

The MEDiKIOSK backend provides clinical intake APIs, workflow lifecycle management, MongoDB data persistence, and medical intelligence services for SIH'26.

---

### Tech Stack
- **Runtime:** Node.js (v20+)
- **Language:** TypeScript 5.7+ (NodeNext resolution)
- **Framework:** Express.js 4.21+
- **Database:** MongoDB 7+ via Mongoose 8.9+
- **Validation:** Zod 3.24+
- **Security:** Helmet, CORS
- **Testing:** Node.js built-in test runner + Supertest

---

### Architecture & Data Hierarchy (Phase 03)

```
Patient (pt-xxxxx)
   │
   ▼
Case (case-xxxx) [status: active|draft|completed|archived, workflowStage: clinical_history|medical_records|summary|completed]
   │
   ├─► Clinical Session (sess-xxxx) [status: active|completed|cancelled]
   │
   ├─► Clinical History [13 Core Anamnesis Sections in MongoDB]
   │
   └─► Conversation [Dialog sequence, Guided Questions, Patient Responses]
          │
          ▼ (Phase 04 & 05)
       Documents / OCR (Phase 04) ──► Clinical Summary (Phase 05)
```

#### Supported 13 Core Clinical Anamnesis Sections
1. **Chief Complaint:** Primary presenting concern.
2. **HPI (History of Present Illness):** Chronological narrative.
3. **Duration:** Structured amount, unit (`hours`, `days`, `weeks`, `months`, `years`), and text.
4. **Severity:** Overall discomfort rating (`mild`, `moderate`, `severe`, `critical`).
5. **Symptoms:** Detected and reported symptom records.
6. **Past Medical History:** Prior conditions and diagnoses.
7. **Past Surgical History:** Procedures and surgeries.
8. **Medications:** Current and past medications.
9. **Allergies:** Drug and environmental allergies with severity.
10. **Family History:** Hereditary and familial health conditions.
11. **Social History:** Diet, smoking, alcohol, occupation, lifestyle.
12. **Review of Systems (ROS):** Organ system findings (constitutional, cardiovascular, respiratory, etc.).
13. **AYUSH History:** Ayurvedic, Yoga, Unani, Siddha, or Homeopathic consultations and treatments.

---

### Authoritative Identifiers
| Entity | Generator Format | Example |
|---|---|---|
| **Case** | `case-${4-digit}` | `case-4720` |
| **Patient** | `pt-${5-digit}` | `pt-51571` |
| **Session** | `sess-${4-digit}` | `sess-3783` |
| **Conversation** | `conv-${timestamp}` | `conv-m7x8q1` |
| **MRN** | `MK-${YYYY}-${4-digit}` | `MK-2026-8921` |

#### Ownership Abstraction
All clinical records are owned by an authoritative clinician (`ownerId`).
The current development abstraction reads `x-user-id` from request headers (or defaults to dev clinician `user-clinician-001`), completely isolating cases between distinct users.

---

### Project Structure
```
backend/
├── src/
│   ├── config/          # Strongly-typed environment & MongoDB configuration
│   ├── controllers/     # Route handler controllers (Case, ClinicalHistory, Conversation, Health)
│   ├── middleware/      # Error handling, request validation, user context auth
│   ├── models/          # Mongoose models (Patient, Case, ClinicalSession, ClinicalHistory, Conversation)
│   ├── routes/          # REST route definitions (/cases, /clinical-history, /conversation, /health)
│   ├── services/        # Business logic & state mapping (CaseService, ClinicalHistoryService, ConversationService)
│   ├── utils/           # ID generator, clinical questions, structured logger, response formatters
│   ├── validators/      # Zod request validation schemas
│   ├── app.ts           # Express application configuration
│   └── server.ts        # Server entrypoint and graceful shutdown
├── tests/               # Automated integration tests (23 passing tests across 5 suites)
├── .env.example         # Environment template
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

---

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP Server Port | `5000` |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `MONGODB_URI` | MongoDB Connection URI | `mongodb://127.0.0.1:27017/medikiosk` |
| `CORS_ORIGIN` | Allowed Frontend Origin | `http://localhost:5173` |
| `LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` |

---

### Available Scripts
From the `backend/` directory:
- `npm run dev` — Start server in watch mode using `tsx`
- `npm run build` — Compile TypeScript to `dist/`
- `npm run start` — Run compiled production build from `dist/server.js`
- `npm run typecheck` — Perform strict TypeScript type checking without emitting files
- `npm test` — Run automated test suite (23 passing tests)

---

### REST API Endpoints

#### Health & Diagnostics
- `GET /` — Service discovery
- `GET /health` — Diagnostic health & database connection status
- `GET /api/v1` — API v1 foundation metadata
- `GET /api/v1/health` — Versioned health diagnostics

#### Patient, Case & Session Lifecycle (Phase 02)
- `POST /api/v1/cases` — Create new Case, Patient, and initial active ClinicalSession atomically
- `GET /api/v1/cases` — List paginated cases belonging to the authenticated clinician
- `GET /api/v1/cases/active` — Retrieve current active clinical case for clinician
- `GET /api/v1/cases/:caseId` — Retrieve full case with associated patient and active session details
- `PATCH /api/v1/cases/:caseId` — Update case workflow stage and/or lifecycle status
- `POST /api/v1/cases/:caseId/sessions` — Start a new clinical session for a case
- `GET /api/v1/cases/:caseId/sessions` — List all clinical intake sessions for a case

#### Clinical History Anamnesis (Phase 03)
- `GET /api/v1/cases/:caseId/clinical-history` — Retrieve or lazily initialize structured 13-section clinical history
- `PATCH /api/v1/cases/:caseId/clinical-history` — Update clinical history fields (Chief Complaint, HPI, Duration, Severity, Symptoms, Past Medical, Past Surgical, Medications, Allergies, Family History, Social History, Review of Systems, AYUSH History)

#### Clinical Conversation & Guided Dialog (Phase 03)
- `GET /api/v1/cases/:caseId/conversation` — Retrieve conversation message stream and active guided question
- `POST /api/v1/cases/:caseId/conversation/messages` — Post patient free-text chat message and receive assistant follow-up
- `POST /api/v1/cases/:caseId/conversation/answers` — Submit structured question answer; **atomically updates MongoDB clinical state** and queues next question
- `POST /api/v1/cases/:caseId/conversation/reset` — Reset conversation history back to initial intake prompt
