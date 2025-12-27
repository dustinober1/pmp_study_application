# Flashcard Content Template

This template is for creating flashcard content for the PMP Study App.

## Instructions

1. Copy this template and fill in the required fields
2. Each flashcard belongs to a **Domain** and a **Task**
3. The `contentId` should be a unique identifier (e.g., `flashcard-domain-task-number`)
4. Use clear, concise language suitable for spaced repetition

## Domains and Tasks

### People (33%)
- `people-1`: Manage conflict
- `people-2`: Lead team
- `people-3`: Support team performance
- `people-4` through `people-9`: [Other tasks]

### Process (41%)
- `process-1`: Manage communications
- `process-2`: Manage risk
- `process-3` through `process-12`: [Other tasks]

### Business Environment (26%)
- `business_environment-1`: Evaluate compliance
- `business_environment-2`: Support organizational change
- `business_environment-3` through `business_environment-5`: [Other tasks]

---

## Flashcard Template

```json
{
  "id": "flashcard-<domain>-<task>-<number>",
  "domainId": "<people | process | business_environment>",
  "taskId": "<domain>-<task-number>",
  "question": "The front of the flashcard - the question or prompt",
  "answer": "The back of the flashcard - the detailed answer",
  "hint": "Optional hint to help recall (can be empty string)",
  "tags": ["<tag1>", "<tag2>", "..."],
  "difficulty": "<easy | medium | hard>",
  "pmbokReference": "PMBOK Guide 7th Edition, Section X.X",
  "isActive": true
}
```

---

## Example Flashcards

### Example 1: People Domain - Conflict Management

```json
{
  "id": "flashcard-people-1-001",
  "domainId": "people",
  "taskId": "people-1",
  "question": "What are the five techniques for managing conflict in a project team?",
  "answer": "1. Withdraw/Avoid - Retreating from conflict\n2. Smooth/Accommodate - Emphasizing agreement\n3. Compromise/Reconcile - Searching for middle ground\n4. Force/Direct - Pushing one viewpoint\n5. Collaborate/Problem Solve - Working together to find win-win",
  "hint": "Think of approaches from passive to assertive",
  "tags": ["conflict", "team management", "leadership", "communication"],
  "difficulty": "medium",
  "pmbokReference": "PMBOK Guide 7th Edition, Section 4.2",
  "isActive": true
}
```

### Example 2: Process Domain - Risk Management

```json
{
  "id": "flashcard-process-2-001",
  "domainId": "process",
  "taskId": "process-2",
  "question": "What is the difference between a risk and an issue in project management?",
  "answer": "Risk: A future event that may occur and could have a positive or negative impact on the project. Risks are uncertain.\n\nIssue: A current problem or concern that has already occurred and is affecting the project. Issues require immediate action.\n\nWhen a risk materializes, it becomes an issue.",
  "hint": "Think about timing - future vs. current",
  "tags": ["risk", "issue", "uncertainty", "planning"],
  "difficulty": "easy",
  "pmbokReference": "PMBOK Guide 7th Edition, Section 7.2",
  "isActive": true
}
```

### Example 3: Business Environment - Compliance

```json
{
  "id": "flashcard-business_environment-1-001",
  "domainId": "business_environment",
  "taskId": "business_environment-1",
  "question": "What are the key components of a project's legal and regulatory compliance requirements?",
  "answer": "1. Identify applicable laws and regulations\n2. Understand industry standards and codes\n3. Review organizational policies and procedures\n4. Consider international requirements for global projects\n5. Maintain documentation of compliance activities\n6. Conduct regular compliance audits\n7. Update compliance plan as regulations change",
  "hint": "Think: identify, understand, review, consider, maintain, audit, update",
  "tags": ["compliance", "legal", "regulations", "governance"],
  "difficulty": "hard",
  "pmbokReference": "PMBOK Guide 7th Edition, Section 2.2",
  "isActive": true
}
```

---

## Flashcard Design Best Practices

### Question Side (Front)
- **Be specific**: Avoid vague questions
- **Use active language**: "What", "How", "Why", "Explain"
- **Single concept**: Focus on one topic per card
- **Appropriate difficulty**: Match content to difficulty level

### Answer Side (Back)
- **Complete but concise**: Provide enough detail without overwhelming
- **Structured format**: Use numbered lists for multiple items
- **Include keywords**: Bold key terms (if formatting supported)
- **Reference source**: Cite PMBOK section when applicable

### Hints
- **Memory trigger**: Provide a subtle clue, not the answer
- **Optional**: Leave empty for cards that don't need hints
- **Progressive**: Can be more helpful for difficult concepts

### Tags
- **3-5 tags per card**: Enough for filtering, not overwhelming
- **Include concepts**: Main topics covered
- **Include domain**: For easy filtering
- **Use consistent naming**: Maintain tag vocabulary across cards

### Difficulty Levels
- **Easy**: Basic definitions, straightforward concepts
- **Medium**: Processes, comparisons, lists of items
- **Hard**: Complex relationships, nuanced concepts, application

---

## Complete Batch Example

Save as `flashcards_batch.json`:

```json
{
  "flashcards": [
    {
      "id": "flashcard-people-1-001",
      "domainId": "people",
      "taskId": "people-1",
      "question": "What are the five techniques for managing conflict?",
      "answer": "Withdraw, Smooth, Compromise, Force, Collaborate",
      "hint": "Think from passive to assertive",
      "tags": ["conflict", "team", "leadership"],
      "difficulty": "medium",
      "pmbokReference": "PMBOK 7th Ed, Section 4.2",
      "isActive": true
    },
    {
      "id": "flashcard-people-1-002",
      "domainId": "people",
      "taskId": "people-1",
      "question": "Which conflict resolution technique is most effective for complex issues?",
      "answer": "Collaborate/Problem Solve - It addresses the root cause and finds a win-win solution, though it takes time and effort.",
      "hint": "Think win-win",
      "tags": ["conflict", "collaboration", "problem-solving"],
      "difficulty": "medium",
      "pmbokReference": "PMBOK 7th Ed, Section 4.2",
      "isActive": true
    }
  ]
}
```

---

## Import Instructions

### Using Firebase Console
1. Go to Firestore Database → Collection: `flashcardContent`
2. Click "Add document"
3. Copy/paste each flashcard object

### Using Cloud Functions (when implemented)
```bash
cd functions
npm run import:flashcards -- path/to/flashcards_batch.json
```

### Validation Checklist
- [ ] All required fields present
- [ ] domainId matches one of: people, process, business_environment
- [ ] taskId format is correct: `{domainId}-{number}`
- [ ] id is unique across all flashcards
- [ ] difficulty is one of: easy, medium, hard
- [ ] Tags array is present (can be empty)
- [ ] PMBOK reference is included
