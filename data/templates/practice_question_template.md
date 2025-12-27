# Practice Question Template

This template is for creating multiple choice practice test questions for the PMP Study App.

## Instructions

1. Copy this template and fill in the required fields
2. Each question belongs to a **Domain** and a **Task**
3. The `id` should be a unique identifier (e.g., `pq-domain-task-number`)
4. Write clear, realistic questions that test PMP knowledge
5. Provide detailed explanations for learning (remediation)

---

## Question Format

```json
{
  "id": "pq-<domain>-<task>-<number>",
  "domainId": "<people | process | business_environment>",
  "taskId": "<domain>-<task-number>",
  "question": "The complete question text",
  "choices": [
    {
      "letter": "A",
      "text": "First answer choice",
      "isCorrect": false
    },
    {
      "letter": "B",
      "text": "Second answer choice",
      "isCorrect": true
    },
    {
      "letter": "C",
      "text": "Third answer choice",
      "isCorrect": false
    },
    {
      "letter": "D",
      "text": "Fourth answer choice",
      "isCorrect": false
    }
  ],
  "explanation": "Detailed explanation of why the correct answer is right and why others are wrong",
  "references": ["PMBOK Guide 7th Edition, Section X.X", "Additional source if applicable"],
  "difficulty": "<easy | medium | hard>",
  "tags": ["<tag1>", "<tag2>", "..."],
  "isActive": true
}
```

---

## Example Questions

### Example 1: People Domain - Conflict Management (Medium)

```json
{
  "id": "pq-people-1-001",
  "domainId": "people",
  "taskId": "people-1",
  "question": "A project manager is leading a team of 12 members. Two senior team members have strongly opposing views on the technical approach for a critical deliverable. The disagreement is causing tension in team meetings and delaying progress. The project manager has tried to mediate but neither party is willing to compromise. Which conflict resolution technique should the project manager use FIRST?",
  "choices": [
    {
      "letter": "A",
      "text": "Withdraw from the conflict and allow the team members to resolve it themselves",
      "isCorrect": false
    },
    {
      "letter": "B",
      "text": "Use forcing/directing to make the decision and move forward",
      "isCorrect": false
    },
    {
      "letter": "C",
      "text": "Facilitate a collaborative problem-solving session with both parties",
      "isCorrect": true
    },
    {
      "letter": "D",
      "text": "Smooth the situation by focusing on areas of agreement",
      "isCorrect": false
    }
  ],
  "explanation": "CORRECT ANSWER: C - Collaborate/Problem Solve\n\nWhy Collaborate is best: This is a complex, critical issue involving senior team members. Collaboration addresses the root cause, finds a win-win solution, and maintains relationships. It takes time but produces the best outcome for important decisions.\n\nWhy not A (Withdraw): Withdrawing ignores the problem and allows tension to continue, which will impact team performance and project delivery.\n\nWhy not B (Force): Forcing may resolve the immediate issue but creates resentment, especially with senior team members. It should be reserved for emergencies.\n\nWhy not D (Smooth): Smoothing emphasizes agreement but doesn't resolve the underlying technical disagreement. It's a temporary fix that won't prevent future conflicts.\n\nKey Takeaway: Use collaboration for important, complex issues involving key stakeholders. Reserve forcing for emergencies and smoothing for minor conflicts.",
  "references": [
    "PMBOK Guide 7th Edition, Section 4.2 - Manage Conflict",
    "PMI Talent Triangle, Way of Working - Leadership"
  ],
  "difficulty": "medium",
  "tags": ["conflict-resolution", "leadership", "team-management", "collaboration", "decision-making"],
  "isActive": true
}
```

### Example 2: Process Domain - Risk Management (Easy)

```json
{
  "id": "pq-process-2-001",
  "domainId": "process",
  "taskId": "process-2",
  "question": "During a project status meeting, a team member raises a concern about a potential supplier delay that could impact the critical path. The project manager documents this in the risk register. What type of risk response strategy is being applied?",
  "choices": [
    {
      "letter": "A",
      "text": "Avoid",
      "isCorrect": false
    },
    {
      "letter": "B",
      "text": "Transfer",
      "isCorrect": false
    },
    {
      "letter": "C",
      "text": "Mitigate",
      "isCorrect": false
    },
    {
      "letter": "D",
      "text": "Accept",
      "isCorrect": true
    }
  ],
  "explanation": "CORRECT ANSWER: D - Accept\n\nWhy Accept is correct: Documenting a risk in the risk register without taking immediate action is passive acceptance. The project team is aware of the risk and will monitor it, but no proactive response is being planned.\n\nRisk Response Strategies:\n\n• Avoid: Eliminating the threat entirely (e.g., changing scope to avoid the risk)\n• Transfer: Shifting the impact to a third party (e.g., insurance, contracts)\n• Mitigate: Reducing probability or impact (e.g., adding buffer, more testing)\n• Accept: Acknowledging the risk and dealing with it if it occurs\n\nAcceptance can be:\n- Passive: Documenting and monitoring (as in this scenario)\n- Active: Creating contingency plans and reserves\n\nKey Takeaway: Simply documenting a risk without planning a response is passive acceptance. Active acceptance involves preparing contingency reserves or plans.",
  "references": [
    "PMBOK Guide 7th Edition, Section 7.2 - Respond to Risks",
    "PMBOK Guide 6th Edition, Section 11.5 - Plan Risk Responses"
  ],
  "difficulty": "easy",
  "tags": ["risk-management", "risk-response", "acceptance", "planning", "monitoring"],
  "isActive": true
}
```

### Example 3: Business Environment - Compliance (Hard)

```json
{
  "id": "pq-business_environment-1-001",
  "domainId": "business_environment",
  "taskId": "business_environment-1",
  "question": "A US-based project manager is leading a software development project with team members in Germany, India, and Brazil. The project processes personal data from EU citizens. Which regulatory framework should the project team comply with for data protection?",
  "choices": [
    {
      "letter": "A",
      "text": "US Federal Trade Commission (FTC) guidelines only",
      "isCorrect": false
    },
    {
      "letter": "B",
      "text": "General Data Protection Regulation (GDPR)",
      "isCorrect": true
    },
    {
      "letter": "C",
      "text": "Each country's local data protection laws independently",
      "isCorrect": false
    },
    {
      "letter": "D",
      "text": "ISO 27001 information security standard",
      "isCorrect": false
    }
  ],
  "explanation": "CORRECT ANSWER: B - GDPR\n\nWhy GDPR is correct: The General Data Protection Regulation (GDPR) applies to ANY organization worldwide that processes personal data of EU residents, regardless of where the organization is located. This is called 'extraterritorial jurisdiction.'\n\nKey GDPR Requirements:\n- Lawful basis for processing data\n- Data subject rights (access, rectification, erasure)\n- Data protection by design and default\n- Data Protection Officer (DPO) for certain organizations\n- Breach notification within 72 hours\n- Privacy by design\n\nWhy not A (FTC): The FTC enforces US privacy laws, but GDPR takes precedence for EU citizen data.\n\nWhy not C (Local laws): While local laws exist, GDPR creates a unified standard for EU data that overrides or complements local regulations.\n\nWhy not D (ISO 27001): This is a voluntary international standard for information security management, not a legal requirement. It can help with compliance but is not the regulatory framework itself.\n\nKey Takeaway: Global projects must identify applicable regulatory frameworks for each jurisdiction they operate in. GDPR has global reach for EU data regardless of where processing occurs.",
  "references": [
    "General Data Protection Regulation (GDPR) 2016/679",
    "PMBOK Guide 7th Edition, Section 2.2 - Compliance",
    "PMI Code of Ethics - Responsibility"
  ],
  "difficulty": "hard",
  "tags": ["compliance", "gdpr", "regulations", "data-protection", "global-project", "legal"],
  "isActive": true
}
```

---

## Question Writing Best Practices

### Question Construction

1. **Scenario-Based Questions**
   - Use realistic project situations
   - Include relevant context and details
   - Make the scenario unambiguous
   - Avoid unnecessary distractors

2. **Question Format**
   - Start with a stem (scenario or context)
   - End with a clear question
   - Ask "What is BEST?", "What is FIRST?", or "Which...?"
   - Avoid negative phrasing ("EXCEPT", "NOT")

3. **Answer Choices**
   - Exactly 4 choices (A, B, C, D)
   - Only one correct answer
   - Distractors should be plausible but clearly wrong
   - Keep choices parallel in structure
   - Similar length for all choices

4. **Difficulty Guidelines**

   **Easy Questions:**
   - Test basic knowledge and definitions
   - Direct application of concepts
   - Minimal scenario complexity
   - One-step reasoning

   **Medium Questions:**
   - Require analysis of situations
   - Compare multiple concepts
   - Some scenario complexity
   - Two-step reasoning

   **Hard Questions:**
   - Complex scenarios with multiple factors
   - Apply judgment in ambiguous situations
   - Require deep understanding
   - Multiple steps of reasoning

### Explanation Writing

1. **Structure**
   - State the correct answer clearly
   - Explain WHY it's correct
   - Explain WHY each distractor is wrong
   - Provide a key takeaway or learning point

2. **Content**
   - Reference the relevant PMBOK section
   - Connect to broader concepts
   - Include memory aids or frameworks
   - Keep explanations concise but thorough

3. **Learning Value**
   - This is the REMEDIATION portion
   - Teach the concept, not just the answer
   - Help students understand for next time
   - Provide practical application tips

### Tagging

Use consistent tags for filtering:
- **Concept tags**: conflict-resolution, risk-management, scope
- **Process tags**: planning, executing, monitoring, controlling
- **Knowledge area**: communications, stakeholder, procurement
- **Domain**: people, process, business-environment
- **Difficulty**: easy, medium, hard

---

## Complete Batch Template

Save as `practice_questions_batch.json`:

```json
{
  "practiceQuestions": [
    {
      "id": "pq-people-1-001",
      "domainId": "people",
      "taskId": "people-1",
      "question": "Your question text here...",
      "choices": [
        {"letter": "A", "text": "Choice A", "isCorrect": false},
        {"letter": "B", "text": "Choice B", "isCorrect": true},
        {"letter": "C", "text": "Choice C", "isCorrect": false},
        {"letter": "D", "text": "Choice D", "isCorrect": false}
      ],
      "explanation": "Detailed explanation...",
      "references": ["PMBOK 7th Ed, Section X.X"],
      "difficulty": "medium",
      "tags": ["tag1", "tag2"],
      "isActive": true
    },
    {
      "id": "pq-people-1-002",
      "domainId": "people",
      "taskId": "people-1",
      "question": "Another question...",
      "choices": [
        {"letter": "A", "text": "Choice A", "isCorrect": false},
        {"letter": "B", "text": "Choice B", "isCorrect": false},
        {"letter": "C", "text": "Choice C", "isCorrect": true},
        {"letter": "D", "text": "Choice D", "isCorrect": false}
      ],
      "explanation": "Another explanation...",
      "references": ["PMBOK 7th Ed, Section Y.Y"],
      "difficulty": "easy",
      "tags": ["tag3", "tag4"],
      "isActive": true
    }
  ]
}
```

---

## Common Pitfalls to Avoid

### ❌ Don't Do This:
```json
{
  "question": "Which of the following is NOT a conflict resolution technique?",
  "choices": [
    {"letter": "A", "text": "Collaborate", "isCorrect": false},
    {"letter": "B", "text": "Compromise", "isCorrect": false},
    {"letter": "C", "text": "Negotiate", "isCorrect": true},  // NOT is confusing!
    {"letter": "D", "text": "Force", "isCorrect": false}
  ]
}
```

### ✅ Do This Instead:
```json
{
  "question": "Which of the following is a conflict resolution technique?",
  "choices": [
    {"letter": "A", "text": "Collaborate", "isCorrect": true},
    {"letter": "B", "text": "Negotiate", "isCorrect": false},  // Not in PMBOK
    {"letter": "C", "text": "Arbitrate", "isCorrect": false},  // Not in PMBOK
    {"letter": "D", "text": "Mediate", "isCorrect": false}    // Not in PMBOK
  ]
}
```

---

## Import Instructions

### Using Firebase Console
1. Go to Firestore Database → Collection: `practiceQuestions`
2. Click "Add document"
3. Copy/paste each question object

### Using Web Import Utility
```bash
cd web
npm run import:questions -- path/to/practice_questions_batch.json
```

### Validation Checklist
- [ ] Exactly 4 choices per question
- [ ] Only one choice marked as correct
- [ ] All required fields present
- [ ] domainId is valid (people, process, business_environment)
- [ ] taskId format is correct
- [ ] explanation is detailed and educational
- [ ] references include PMBOK section
- [ ] difficulty level is appropriate for content
- [ ] tags are relevant and consistent
