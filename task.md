# PMP 2026 Study Application - Implementation Plan

## Overview
A web-based study application for PMP exam preparation featuring flashcards, practice tests, and progress tracking organized by PMP 2026 ECO Domains and Tasks.

## Technology Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (React), TypeScript, Tailwind CSS |
| Backend | Python FastAPI |
| Database | PostgreSQL |
| Hosting | Render (frontend + backend + database) |
| Auth | Anonymous sessions + optional email signup |

---

## PMP 2026 ECO Structure (Authoritative, July 2026 ECO)

The PMP 2026 Exam Content Outline has **3 Domains** with official weights and task counts:

| Domain | Name | Weight |
|--------|------|--------|
| 1 | People | 33% |
| 2 | Process | 41% |
| 3 | Business Environment | 26% |

Task counts: People (8), Process (10), Business Environment (8). Approximately 40% of items are predictive and 60% are adaptive/agile/hybrid.

**People domain tasks (8):**
1. Develop a common vision
2. Manage conflicts
3. Lead the project team
4. Engage stakeholders
5. Align stakeholder expectations
6. Manage stakeholder expectations
7. Help ensure knowledge transfer
8. Plan and manage communication

**Process domain tasks (10):**
1. Develop an integrated project management plan and plan delivery
2. Develop and manage project scope
3. Help ensure value-based delivery
4. Plan and manage resources
5. Plan and manage procurement
6. Plan and manage finance
7. Plan and optimize quality of products/deliverables
8. Plan and manage schedule
9. Evaluate project status
10. Manage project closure

**Business Environment domain tasks (8):**
1. Define and establish project governance
2. Plan and manage project compliance
3. Manage and control changes
4. Remove impediments and manage issues
5. Plan and manage risk
6. Continuous improvement
7. Support organizational change
8. Evaluate external business environment changes

---

## Project Structure

```
pmp_study_app/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # App router pages
│   │   │   ├── page.tsx         # Landing/Dashboard
│   │   │   ├── flashcards/      # Flashcard study pages
│   │   │   ├── practice/        # Practice test pages
│   │   │   ├── progress/        # Progress tracking
│   │   │   ├── profile/         # User profile/settings
│   │   │   └── auth/            # Login/signup pages
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Base UI (buttons, cards, modals)
│   │   │   ├── flashcard/       # Flashcard-specific components
│   │   │   ├── practice/        # Practice test components
│   │   │   └── layout/          # Header, sidebar, navigation
│   │   ├── lib/                 # Utilities, API client, hooks
│   │   ├── store/               # State management (Zustand)
│   │   └── types/               # TypeScript types
│   ├── public/                  # Static assets
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings & environment
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── domain.py
│   │   │   ├── task.py
│   │   │   ├── flashcard.py
│   │   │   ├── question.py
│   │   │   └── progress.py
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── domains.py
│   │   │   ├── flashcards.py
│   │   │   ├── questions.py
│   │   │   └── progress.py
│   │   ├── services/            # Business logic
│   │   └── seed/                # Sample data seeding
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
│
└── README.md
```

---

## Database Schema

### Core Tables

```sql
-- Domains (People, Process, Business Environment)
domains
├── id (UUID, PK)
├── number (INT) -- 1, 2, 3
├── name (VARCHAR)
├── description (TEXT)
├── weight_percentage (INT) -- 42, 50, 8
└── created_at (TIMESTAMP)

-- Tasks within each Domain
tasks
├── id (UUID, PK)
├── domain_id (FK → domains)
├── number (INT) -- Task number within domain
├── title (VARCHAR)
├── description (TEXT)
└── created_at (TIMESTAMP)

-- Flashcards linked to Tasks
flashcards
├── id (UUID, PK)
├── task_id (FK → tasks)
├── front_text (TEXT)
├── back_text (TEXT)
├── difficulty (ENUM: easy, medium, hard)
└── created_at (TIMESTAMP)

-- Practice Questions linked to Tasks
questions
├── id (UUID, PK)
├── task_id (FK → tasks)
├── question_text (TEXT)
├── options (JSONB) -- Array of {id, text}
├── correct_option_id (VARCHAR)
├── explanation (TEXT)
├── difficulty (ENUM: easy, medium, hard)
└── created_at (TIMESTAMP)

-- Users (anonymous or registered)
users
├── id (UUID, PK)
├── anonymous_id (VARCHAR, UNIQUE) -- Browser session ID
├── email (VARCHAR, NULLABLE, UNIQUE)
├── password_hash (VARCHAR, NULLABLE)
├── display_name (VARCHAR)
├── created_at (TIMESTAMP)
└── last_active (TIMESTAMP)

-- Flashcard Progress (spaced repetition)
flashcard_progress
├── id (UUID, PK)
├── user_id (FK → users)
├── flashcard_id (FK → flashcards)
├── times_seen (INT)
├── times_correct (INT)
├── ease_factor (FLOAT) -- SM-2 algorithm
├── interval_days (INT)
├── next_review_at (TIMESTAMP)
└── last_reviewed_at (TIMESTAMP)

-- Question Progress
question_progress
├── id (UUID, PK)
├── user_id (FK → users)
├── question_id (FK → questions)
├── attempts (INT)
├── correct_attempts (INT)
└── last_attempted_at (TIMESTAMP)

-- Study Sessions
study_sessions
├── id (UUID, PK)
├── user_id (FK → users)
├── session_type (ENUM: flashcard, practice_test)
├── domain_id (FK → domains, NULLABLE)
├── task_id (FK → tasks, NULLABLE)
├── started_at (TIMESTAMP)
├── ended_at (TIMESTAMP)
├── items_studied (INT)
├── items_correct (INT)
└── duration_seconds (INT)
```

---

## Implementation Phases

### Phase 1: Project Setup & Foundation
**Files to create:**
- `frontend/package.json`, `next.config.js`, `tailwind.config.ts`
- `backend/app/main.py`, `database.py`, `config.py`
- `backend/requirements.txt`, `Dockerfile`
- Database migrations with Alembic

**Tasks:**
1. Initialize Next.js 14 project with TypeScript + Tailwind
2. Initialize FastAPI project with SQLAlchemy + Alembic
3. Set up PostgreSQL connection
4. Create base models and migrations
5. Configure CORS for local development
6. Set up environment variable handling

### Phase 2: Data Models & Seeding
**Files to create:**
- `backend/app/models/*.py` (all models)
- `backend/app/schemas/*.py` (Pydantic schemas)
- `backend/app/seed/pmp_2026_data.py`

**Tasks:**
1. Implement all SQLAlchemy models
2. Create Pydantic request/response schemas
3. Seed PMP 2026 Domains and Tasks (3 domains, ~35 tasks)
4. Create sample flashcards (5-10 per task)
5. Create sample practice questions (3-5 per task)

### Phase 3: Core API Routes
**Files to create:**
- `backend/app/routers/domains.py`
- `backend/app/routers/flashcards.py`
- `backend/app/routers/questions.py`
- `backend/app/routers/progress.py`
- `backend/app/routers/auth.py`

**API Endpoints:**
```
GET  /api/domains                     # List all domains
GET  /api/domains/:id/tasks           # List tasks for domain
GET  /api/flashcards?domain=&task=    # Get flashcards (filterable)
POST /api/flashcards/:id/review       # Submit flashcard review
GET  /api/questions?domain=&task=     # Get practice questions
POST /api/questions/:id/answer        # Submit answer
GET  /api/progress/summary            # User's overall progress
GET  /api/progress/domain/:id         # Progress by domain
POST /api/auth/anonymous              # Create anonymous user
POST /api/auth/register               # Upgrade to registered
POST /api/auth/login                  # Login
```

### Phase 4: Frontend Core UI
**Files to create:**
- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx` (Dashboard)
- `frontend/src/components/layout/*`
- `frontend/src/components/ui/*`
- `frontend/src/lib/api.ts` (API client)
- `frontend/src/store/*.ts` (Zustand stores)

**Tasks:**
1. Create responsive layout with sidebar navigation
2. Build Dashboard showing domain overview & progress
3. Implement API client with fetch/SWR
4. Set up global state management
5. Create anonymous user on first visit

### Phase 5: Flashcard System
**Files to create:**
- `frontend/src/app/flashcards/page.tsx`
- `frontend/src/app/flashcards/[domainId]/page.tsx`
- `frontend/src/app/flashcards/study/page.tsx`
- `frontend/src/components/flashcard/*`

**Features:**
1. Domain/Task selection screen
2. Flip card component with animation
3. "Know it" / "Don't know it" buttons
4. SM-2 spaced repetition algorithm
5. Session summary after completing set
6. Progress indicators per domain/task

### Phase 6: Practice Test System
**Files to create:**
- `frontend/src/app/practice/page.tsx`
- `frontend/src/app/practice/[domainId]/page.tsx`
- `frontend/src/app/practice/test/page.tsx`
- `frontend/src/components/practice/*`

**Features:**
1. Domain/Task selection for practice
2. Multiple choice question display
3. Answer selection & immediate feedback
4. Explanation display after answering
5. Score summary at end of test
6. Option for "exam simulation" mode (timed, no feedback until end)

### Phase 7: Progress Tracking
**Files to create:**
- `frontend/src/app/progress/page.tsx`
- `frontend/src/components/progress/*`

**Features:**
1. Overall mastery percentage by domain
2. Task-level breakdown
3. Study streak tracking
4. Time spent studying
5. Charts/graphs (recharts or chart.js)
6. Weak areas identification

### Phase 8: User Authentication
**Files to create:**
- `frontend/src/app/auth/login/page.tsx`
- `frontend/src/app/auth/register/page.tsx`
- `frontend/src/app/profile/page.tsx`

**Features:**
1. Anonymous session persistence (localStorage)
2. Optional email registration (upgrades anonymous user)
3. JWT token authentication
4. Profile settings page
5. Data sync when upgrading from anonymous

### Phase 9: Render Deployment
**Files to create/modify:**
- `render.yaml` (Blueprint for all services)
- `frontend/Dockerfile`
- `backend/Dockerfile`

**Tasks:**
1. Create Render PostgreSQL database
2. Deploy FastAPI backend as Web Service
3. Deploy Next.js as Static Site or Web Service
4. Configure environment variables
5. Set up custom domain (if desired)

---

## Key Technical Decisions

### Spaced Repetition (SM-2 Algorithm)
For flashcards, implement the SuperMemo SM-2 algorithm:
- Ease Factor (EF) starts at 2.5
- After each review, adjust EF based on response quality
- Calculate next review interval: `interval = previous_interval * EF`

### Anonymous User Flow
1. On first visit, generate UUID and store in localStorage
2. Call `POST /api/auth/anonymous` to create server-side user
3. All progress saved against this anonymous user
4. When user registers, link email to existing anonymous user ID
5. Progress preserved seamlessly

### API Client Pattern
Use SWR for data fetching with optimistic updates:
```typescript
const { data, mutate } = useSWR('/api/flashcards', fetcher)
// After review, optimistically update local state
```

---

## Sample Content Structure

### Domain 1: People (14 Tasks)
| Task | Title |
|------|-------|
| 1.1 | Manage conflict |
| 1.2 | Lead a team |
| 1.3 | Support team performance |
| 1.4 | Empower team members and stakeholders |
| ... | ... |

### Sample Flashcard
```json
{
  "task_id": "1.1",
  "front": "What are the 5 conflict resolution techniques in project management?",
  "back": "1. Collaborate/Problem Solve\n2. Compromise/Reconcile\n3. Withdraw/Avoid\n4. Smooth/Accommodate\n5. Force/Direct",
  "difficulty": "medium"
}
```

### Sample Question
```json
{
  "task_id": "1.1",
  "question": "A project manager notices tension between two team members affecting their work. What should be the FIRST course of action?",
  "options": [
    {"id": "A", "text": "Escalate to the sponsor"},
    {"id": "B", "text": "Meet privately with each team member"},
    {"id": "C", "text": "Reassign one team member"},
    {"id": "D", "text": "Ignore it and focus on deliverables"}
  ],
  "correct": "B",
  "explanation": "The project manager should first understand the root cause by speaking with each party individually before deciding on a resolution approach."
}
```

---

## Success Criteria
- [ ] User can browse all 3 PMP domains and their tasks
- [ ] User can study flashcards filtered by domain/task
- [ ] Flashcards use spaced repetition for optimal review scheduling
- [ ] User can take practice tests filtered by domain/task
- [ ] Practice tests show immediate feedback with explanations
- [ ] Progress is tracked and visualized (mastery %, streaks)
- [ ] Anonymous users can study without signing up
- [ ] Users can optionally register to sync across devices
- [ ] App is deployed and accessible on Render
