# PMP 2026 Flashcard Seed Data

## Overview
This directory contains the initial seed data for PMP 2026 exam flashcards, organized according to the official PMP exam content outline.

## File Structure

### flashcards.json
Main flashcard data file containing:
- **Total Flashcards**: 113 cards
- **Domains**: 3
- **Tasks**: 30
- **Format**: JSON

## Content Distribution

### Domain 1: People (33%)
- **Flashcards**: 31 cards
- **Tasks Covered**: 9
- **Focus**: Team management, leadership, conflict resolution, emotional intelligence, stakeholder collaboration

**Tasks**:
1. Manage conflict (3 cards)
2. Lead a team (4 cards)
3. Support team performance (4 cards)
4. Empower team members and stakeholders (3 cards)
5. Build a team (4 cards)
6. Address and remove impediments, obstacles, and blockers (3 cards)
7. Negotiate project agreements (3 cards)
8. Collaborate with stakeholders (4 cards)
9. Promote team performance through emotional intelligence (3 cards)

### Domain 2: Process (41%)
- **Flashcards**: 53 cards
- **Tasks Covered**: 13
- **Focus**: Project execution, planning, monitoring, risk management, quality, scope, schedule, cost

**Tasks**:
1. Execute project with urgency to deliver business value (3 cards)
2. Manage communications (5 cards)
3. Assess and manage risks (6 cards)
4. Engage stakeholders (3 cards)
5. Plan and manage budget and resources (6 cards)
6. Plan and manage schedule (6 cards)
7. Plan and manage quality (5 cards)
8. Plan and manage scope (4 cards)
9. Integrate project planning activities (3 cards)
10. Manage project changes (3 cards)
11. Plan and manage procurement (3 cards)
12. Manage project artifacts (2 cards)
13. Determine appropriate project methodology (4 cards)

### Domain 3: Business Environment (26%)
- **Flashcards**: 29 cards
- **Tasks Covered**: 8
- **Focus**: Organizational strategy, benefits realization, change management, compliance, continuous improvement

**Tasks**:
1. Plan and manage project compliance (3 cards)
2. Evaluate and deliver project benefits and value (5 cards)
3. Evaluate and address internal and external business environment changes (4 cards)
4. Support organizational change (4 cards)
5. Employ continuous process improvement (4 cards)
6. Build shared understanding (3 cards)
7. Manage project knowledge (3 cards)
8. Monitor and report project performance (3 cards)

## JSON Structure

```json
{
  "version": "1.0",
  "exam": "PMP 2026",
  "totalCards": 113,
  "domains": [
    {
      "id": "domain-1",
      "name": "People",
      "weight": 33,
      "description": "...",
      "tasks": [
        {
          "id": "task-1-1",
          "name": "...",
          "description": "...",
          "flashcards": [
            {
              "id": "card-1-1-1",
              "question": "...",
              "answer": "...",
              "difficulty": "easy|medium|hard",
              "tags": ["tag1", "tag2"]
            }
          ]
        }
      ]
    }
  ]
}
```

## Flashcard Fields

- **id**: Unique identifier (format: `card-{domain}-{task}-{card}`)
- **question**: The question text
- **answer**: The answer/explanation
- **difficulty**: `easy`, `medium`, or `hard`
- **tags**: Array of relevant topic tags for filtering/searching

## Key Concepts Covered

### People Domain
- Tuckman's Team Development Model
- Conflict Resolution Techniques
- Leadership Styles (Servant Leadership)
- Motivation Theories (Maslow, Herzberg, Theory X/Y)
- Emotional Intelligence
- Stakeholder Analysis Models (Power/Interest Grid, Salience Model)
- RACI Matrix
- Team Building Strategies

### Process Domain
- Earned Value Management (EVM) formulas
- Critical Path Method (CPM)
- Risk Management (threats & opportunities)
- Quality Management (QA vs QC, Cost of Quality)
- Communication Models and Channels
- Contract Types (Fixed Price, Cost Reimbursable, T&M)
- Work Breakdown Structure (WBS)
- Change Control
- PERT Estimating
- Schedule Compression (Fast Tracking vs Crashing)

### Business Environment Domain
- Benefits Realization
- ROI, NPV, Payback Period
- Change Management Models (Kotter, ADKAR)
- PESTLE Analysis
- VUCA
- Continuous Improvement (PDCA, Kaizen)
- Enterprise Environmental Factors (EEF)
- Organizational Process Assets (OPA)
- Knowledge Management
- KPIs and Variance Analysis

## Usage

This seed data can be imported into:
1. **Firestore** - for the mobile/web app backend
2. **Development/Testing** - for local development and testing
3. **Training Data** - for testing the FSRS algorithm with realistic data

## Next Steps

1. Import into Firestore using Firebase Admin SDK
2. Create additional flashcards to reach target of 200-300 cards
3. Add multimedia support (images, diagrams)
4. Implement user-generated flashcards
5. Add practice exam questions
