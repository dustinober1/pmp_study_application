# PMP Content Generator

This script uses Google AI Studio's Gemini Flash Lite model to generate flashcards and practice test questions from the PMP 2026 study guide markdown files.

## Prerequisites

1. **Google AI API Key**: Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Python Dependencies**: Install the required packages:
   ```bash
   pip install google-generativeai python-dotenv
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

## Usage

### List available chapters
```bash
cd backend
python -m scripts.content_generator --list-chapters
```

### Generate content for a specific chapter
```bash
python -m scripts.content_generator --chapter 01-introduction --flashcards 5 --questions 3
```

### Generate content for all chapters
```bash
python -m scripts.content_generator --all
```

### Customize output location
```bash
python -m scripts.content_generator --chapter 02-strategic --output-dir ./my_output
```

## Output

The script generates three output files:

1. **`flashcards_<timestamp>.json`**: All generated flashcards with domain/task metadata
2. **`questions_<timestamp>.json`**: All generated practice questions with domain/task metadata
3. **`seed_data_<timestamp>.py`**: Python file with content ready for database seeding

### Example Output Structure

```json
{
  "generated_at": "2024-12-28T18:30:00.000000",
  "total_count": 50,
  "by_domain": {
    "People": {
      "count": 20,
      "tasks": {
        "Lead the project team": 10,
        "Manage conflict": 10
      }
    }
  },
  "flashcards": [
    {
      "front": "What is servant leadership?",
      "back": "A leadership style where...",
      "difficulty": "medium",
      "domain": "People",
      "task": "Lead the project team",
      "source_file": "03-team-leadership"
    }
  ]
}
```

## Domain & Task Mapping

Content is automatically mapped to PMP 2026 ECO domains and tasks:

| Chapter | Domain | Primary Tasks |
|---------|--------|--------------|
| 01-introduction | Foundation | Understanding the Exam, Ways of Working |
| 02-strategic | Business Environment | Strategy, Value, Change |
| 03-team-leadership | People | Leadership, Team Performance |
| 04-stakeholder | People | Stakeholder Engagement |
| 05-initiation | Process | Approach, Planning |
| 06-project-planning | Process | Scope, Resources, Procurement |
| 07-risk-quality | Process | Risk Management |
| 08-execution | Process | Delivery, Data Analysis |
| 09-monitoring | Process | Control, Change Management |
| 10-ai-pm | Business Environment | AI & Sustainability |
| 11-exam-prep | Foundation | Exam Strategies |

## Rate Limiting

The script includes built-in delays to avoid hitting API rate limits:
- 1 second delay between flashcard and question generation
- 2 second delay between files

## Batch Processing Tips

For large content sets, process in batches:

```bash
# Day 1: Foundation chapters
python -m scripts.content_generator --chapter 01-introduction
python -m scripts.content_generator --chapter 11-exam-prep

# Day 2: Process domain
python -m scripts.content_generator --chapter 02-strategic
python -m scripts.content_generator --chapter 03-team-leadership
```

## Troubleshooting

### API Key Error
```
Error: GOOGLE_AI_API_KEY environment variable is required
```
→ Make sure your `.env` file has the `GOOGLE_AI_API_KEY` variable set

### Rate Limiting
```
Retry 1/3: ResourceExhausted
```
→ Wait a few minutes and try again with fewer files or smaller batch sizes

### JSON Parse Error
```
Warning: Could not parse flashcard JSON
```
→ The AI response wasn't valid JSON. The script will continue with other files.
