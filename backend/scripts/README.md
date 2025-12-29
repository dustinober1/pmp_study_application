# PMP 2026 Content Generator

Generate high-quality flashcards and hard, scenario-based practice test questions from the PMP 2026 study guide using Google's Gemini AI with DSPy for structured outputs and hallucination control.

## Features

- ✅ **Hard, scenario-based questions** that mimic the actual PMP exam
- ✅ **Explanations for ALL 4 options** (why correct or incorrect)
- ✅ **Official PMP 2026 ECO mapping** - content organized by domains and tasks
- ✅ **Deduplication** - prevents regenerating the same content
- ✅ **Master files** - accumulates unique content across runs
- ✅ **Randomizable options** - no hardcoded A/B/C/D letters

## Prerequisites

1. **Google AI API Key**: Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Python 3.10+** with virtual environment
3. **Dependencies**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install dspy-ai google-genai python-dotenv
   ```

## Configuration

1. Copy `.env.example` to `.env` in the backend directory:
   ```bash
   cp .env.example .env
   ```

2. Add your Google AI API key to `.env`:
   ```
   GOOGLE_AI_API_KEY=your-actual-api-key
   ```

## Quick Start

```bash
cd backend
source venv/bin/activate

# List all ECO tasks with their source files
python -m scripts.content_generator_dspy --list-tasks

# Generate for a specific task (10 flashcards, 10 questions)
python -m scripts.content_generator_dspy --task "Lead the project team"

# Generate for all tasks in a domain
python -m scripts.content_generator_dspy --domain People

# Generate for all 26 ECO tasks
python -m scripts.content_generator_dspy --all
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--task "name"` | Generate for a specific ECO task | - |
| `--domain People\|Process\|Business Environment` | Generate for all tasks in a domain | - |
| `--all` | Generate for all 26 ECO tasks | - |
| `--flashcards N` | Number of flashcards per task | 10 |
| `--questions N` | Number of questions per task | 10 |
| `--output-dir PATH` | Output directory | `backend/generated_content` |
| `--no-append` | Don't append to master files | False |
| `--list-tasks` | List all ECO tasks with source files | - |

## Examples

### Generate 15 flashcards and 10 questions for one task
```bash
python -m scripts.content_generator_dspy \
  --task "Manage conflicts" \
  --flashcards 15 \
  --questions 10
```

### Generate for all People domain tasks (8 tasks)
```bash
python -m scripts.content_generator_dspy \
  --domain People \
  --flashcards 10 \
  --questions 10
```

### Generate everything (26 tasks × 10 each = 260 flashcards, 260 questions)
```bash
python -m scripts.content_generator_dspy --all
```

### Custom output directory
```bash
python -m scripts.content_generator_dspy \
  --task "Plan and manage risk" \
  --output-dir ./my_content
```

## Output Files

### File Structure
```
generated_content/
├── flashcards_master.json    # All unique flashcards (growing)
├── questions_master.json     # All unique questions (growing)
├── run_20241228_185800.json  # First run's additions
├── run_20241228_190500.json  # Second run's additions
└── ...
```

### Master Files (Cumulative)

Each run **appends unique content** to the master files:

**`flashcards_master.json`**:
```json
{
  "updated_at": "2024-12-28T19:00:00",
  "count": 150,
  "flashcards": [
    {
      "front": "What is the purpose of a team charter?",
      "back": "A team charter documents team guidelines...",
      "difficulty": "medium",
      "domain": "People",
      "domain_id": 1,
      "task": "Develop a common vision",
      "task_id": 1
    }
  ]
}
```

**`questions_master.json`**:
```json
{
  "updated_at": "2024-12-28T19:00:00",
  "count": 150,
  "questions": [
    {
      "question_text": "A project manager is leading a complex infrastructure project. Two senior team members have conflicting views on the technical approach. The disagreement is affecting team morale and slowing progress. What should the PM do FIRST?",
      "options": [
        {
          "text": "Escalate the issue to the sponsor for resolution",
          "explanation": "Incorrect. Premature escalation bypasses the PM's responsibility to facilitate resolution. The PM should first attempt to resolve conflicts at the team level.",
          "is_correct": false
        },
        {
          "text": "Facilitate a collaborative problem-solving session with both parties",
          "explanation": "Correct. Facilitating collaboration addresses the root cause by bringing parties together to find common ground. This is a servant leadership approach.",
          "is_correct": true
        },
        {
          "text": "Make a decision on the technical approach to end the conflict",
          "explanation": "Incorrect. While this would end the immediate disagreement, it doesn't leverage team expertise and may reduce buy-in from the overruled party.",
          "is_correct": false
        },
        {
          "text": "Assign the team members to different workstreams to prevent interaction",
          "explanation": "Incorrect. Avoiding the conflict doesn't resolve it. The underlying issue will likely resurface and may worsen over time.",
          "is_correct": false
        }
      ],
      "difficulty": "hard",
      "domain": "People",
      "domain_id": 1,
      "task": "Manage conflicts",
      "task_id": 2
    }
  ]
}
```

### Run Files (Per-Session)

Each run creates a timestamped file showing what was added:

**`run_20241228_185800.json`**:
```json
{
  "generated_at": "2024-12-28T18:58:00",
  "new_flashcards": 10,
  "new_questions": 10,
  "duplicates_removed": {
    "flashcards": 0,
    "questions": 0
  },
  "flashcards": [...],
  "questions": [...]
}
```

## Deduplication

The script automatically prevents duplicate content:

1. **Hash-based detection**: Uses MD5 hash of normalized text
2. **Cross-run deduplication**: Compares new content against master files
3. **Within-batch deduplication**: Prevents duplicates in a single run

**Example output when duplicates are found**:
```
✓ Generated 10 flashcards
✓ Generated 10 questions
⚠️ Removed duplicates: 3 flashcards, 2 questions
Updated master flashcards: 157 total (7 new)
Updated master questions: 158 total (8 new)
```

## PMP 2026 ECO Mapping

Content is mapped to the official PMI Examination Content Outline:

### Domain I: People (33%) - 8 Tasks

| Task | Source Files |
|------|--------------|
| 1. Develop a common vision | project-charter.md, team-charter.md, strategy-alignment.md |
| 2. Manage conflicts | conflict-management.md, conflict-negotiation.md |
| 3. Lead the project team | building-teams.md, motivation-performance.md, executing-work.md |
| 4. Engage stakeholders | stakeholder-analysis.md, stakeholder-engagement.md |
| 5. Align stakeholder expectations | stakeholder-classification.md, communication-planning.md |
| 6. Manage stakeholder expectations | stakeholder-engagement.md, monitoring-closing.md |
| 7. Help ensure knowledge transfer | project-closure.md, monitoring-closing.md |
| 8. Plan and manage communication | communication-planning.md, communications-planning.md |

### Domain II: Process (41%) - 10 Tasks

| Task | Source Files |
|------|--------------|
| 1. Develop integrated PM plan | ways-of-working.md, scope-planning.md |
| 2. Develop and manage scope | scope-planning.md, executing-work.md |
| 3. Help ensure value-based delivery | benefits-realization.md, value-delivery.md |
| 4. Plan and manage resources | resource-planning.md, building-teams.md |
| 5. Plan and manage procurement | resource-planning.md, engagement-procurement.md |
| 6. Plan and manage finance | cost-planning.md, risk-management.md |
| 7. Plan and optimize quality | quality-planning.md, quality-management.md |
| 8. Plan and manage schedule | schedule-planning.md, monitoring-closing.md |
| 9. Evaluate project status | core-data.md, cost-planning.md, toolkit.md |
| 10. Manage project closure | project-closure.md |

### Domain III: Business Environment (26%) - 8 Tasks

| Task | Source Files |
|------|--------------|
| 1. Define project governance | compliance-governance.md, pmo-role.md |
| 2. Plan and manage compliance | compliance-governance.md, sustainability.md |
| 3. Manage and control changes | monitoring-closing.md, executing-work.md |
| 4. Remove impediments/manage issues | executing-work.md, toolkit.md |
| 5. Plan and manage risk | risk-planning.md, risk-management.md |
| 6. Continuous improvement | quality-management.md, project-closure.md |
| 7. Support organizational change | organizational-change.md, stakeholder-engagement.md |
| 8. Evaluate external environment | external-environment.md, risk-management.md |

## Question Quality

Questions are designed to mimic the actual PMP exam:

- **Scenario-based**: 3-5 sentence realistic project situations
- **Hard difficulty**: Tests application, not memorization
- **PMP keywords**: Uses "BEST", "FIRST", "MOST important", "PRIMARY"
- **Plausible distractors**: All 4 options are reasonable actions
- **Full explanations**: Every option explains why it's correct or incorrect

## Troubleshooting

### API Key Error
```
Error: GOOGLE_AI_API_KEY environment variable is required
```
→ Ensure `.env` file exists with `GOOGLE_AI_API_KEY=your-key`

### Rate Limiting
```
✗ Error generating questions: 429 Resource Exhausted
```
→ Wait 1-2 minutes between runs, or reduce batch size

### Validation Errors
```
✗ Error: Must have exactly 4 options
```
→ The LLM response didn't match expected format. Retry the task.

### File Not Found
```
⚠️ File not found: /path/to/file.md
```
→ The ECO mapping references a file that doesn't exist. Check guide directory.

## Best Practices

1. **Start small**: Test with one task before running `--all`
2. **Batch by domain**: Process one domain at a time for better review
3. **Check quality**: Review generated content before using
4. **Use deduplication**: Run multiple times to build content variety
5. **Custom output**: Use `--output-dir` for different content sets
