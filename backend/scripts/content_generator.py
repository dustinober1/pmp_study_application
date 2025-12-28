"""
PMP 2026 Content Generator

Uses Google AI Studio's Gemini Flash Lite to generate flashcards and practice questions
from markdown source files. Content is organized by domain and task for sorting.

Prerequisites:
    pip install google-genai python-dotenv

Environment Variables:
    GOOGLE_AI_API_KEY: Your Google AI Studio API key

Usage:
    python -m scripts.content_generator --help
    python -m scripts.content_generator --chapter 01-introduction --batch-size 5
    python -m scripts.content_generator --all --output-dir ./generated_content
"""

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GUIDE_PATH = Path("/Users/dustinober/PMP-2026/guide")
DEFAULT_OUTPUT_DIR = Path("/Users/dustinober/Projects/pmp_study_app/backend/generated_content")
MODEL_NAME = "gemini-2.0-flash-lite"
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

# Domain and Task mapping based on PMP 2026 ECO
DOMAIN_TASK_MAPPING = {
    "01-introduction": {
        "domain": "Foundation",
        "domain_id": None,  # For foundational content
        "tasks": [
            {"name": "Understanding the Exam", "order": 1},
            {"name": "Ways of Working", "order": 2},
            {"name": "Core Concepts", "order": 3},
            {"name": "Ethics", "order": 4},
        ]
    },
    "02-strategic": {
        "domain": "Business Environment",
        "domain_id": 3,
        "tasks": [
            {"name": "Evaluate external business environment", "order": 1},
            {"name": "Support organizational strategy", "order": 5},
            {"name": "Help ensure value-based delivery", "order": 3},
            {"name": "Navigate organizational change", "order": 6},
        ]
    },
    "03-team-leadership": {
        "domain": "People",
        "domain_id": 1,
        "tasks": [
            {"name": "Lead the project team", "order": 1},
            {"name": "Support team performance", "order": 7},
            {"name": "Manage conflict", "order": 8},
            {"name": "Build trust and influence stakeholders", "order": 6},
        ]
    },
    "04-stakeholder": {
        "domain": "People",
        "domain_id": 1,
        "tasks": [
            {"name": "Identify and analyze stakeholders", "order": 3},
            {"name": "Tailor communication to stakeholder needs", "order": 4},
            {"name": "Execute stakeholder engagement plan", "order": 5},
        ]
    },
    "05-initiation": {
        "domain": "Process",
        "domain_id": 2,
        "tasks": [
            {"name": "Recommend project management approach", "order": 6},
            {"name": "Create and maintain project plan", "order": 7},
        ]
    },
    "06-project-planning": {
        "domain": "Process",
        "domain_id": 2,
        "tasks": [
            {"name": "Define and break down scope", "order": 1},
            {"name": "Prioritize work based on value", "order": 2},
            {"name": "Define and manage resources", "order": 4},
            {"name": "Plan and execute procurement", "order": 5},
        ]
    },
    "07-risk-quality": {
        "domain": "Process",
        "domain_id": 2,
        "tasks": [
            {"name": "Manage risk", "order": 9},
        ]
    },
    "08-execution": {
        "domain": "Process",
        "domain_id": 2,
        "tasks": [
            {"name": "Assess opportunities for incremental delivery", "order": 3},
            {"name": "Collect and analyze data", "order": 8},
        ]
    },
    "09-monitoring": {
        "domain": "Process",
        "domain_id": 2,
        "tasks": [
            {"name": "Collect and analyze data", "order": 8},
            {"name": "Manage change", "order": 10},
        ]
    },
    "10-ai-pm": {
        "domain": "Business Environment",
        "domain_id": 3,
        "tasks": [
            {"name": "Integrate sustainability and AI considerations", "order": 7},
        ]
    },
    "11-exam-prep": {
        "domain": "Foundation",
        "domain_id": None,
        "tasks": [
            {"name": "Exam Strategies", "order": 1},
        ]
    },
    "appendices": {
        "domain": "Foundation",
        "domain_id": None,
        "tasks": [
            {"name": "Reference Materials", "order": 1},
        ]
    },
}


@dataclass
class Flashcard:
    """Represents a flashcard with front and back content."""
    front: str
    back: str
    source_file: str
    domain: str
    task: str
    difficulty: str = "medium"


@dataclass
class Question:
    """Represents a practice test question."""
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str  # A, B, C, or D
    explanation: str
    source_file: str
    domain: str
    task: str
    difficulty: str = "medium"


@dataclass
class GeneratedContent:
    """Container for generated content from a source file."""
    source_file: str
    chapter: str
    domain: str
    task: str
    flashcards: list[Flashcard] = field(default_factory=list)
    questions: list[Question] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())


class ContentGenerator:
    """Generates flashcards and questions from markdown content using Gemini."""
    
    def __init__(self, api_key: Optional[str] = None, batch_size: int = 5):
        """
        Initialize the content generator.
        
        Args:
            api_key: Google AI API key. If not provided, reads from GOOGLE_AI_API_KEY env var.
            batch_size: Number of flashcards/questions to generate per batch.
        """
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_AI_API_KEY environment variable is required")
        
        self.client = genai.Client(api_key=self.api_key)
        self.batch_size = batch_size
        
    def _extract_text_from_markdown(self, content: str) -> str:
        """Extract plain text from markdown, removing special components."""
        # Remove frontmatter
        content = re.sub(r'^---\n.*?\n---\n', '', content, flags=re.DOTALL)
        
        # Remove Vue/MDX components
        content = re.sub(r'<[A-Z][a-zA-Z]*[^>]*>.*?</[A-Z][a-zA-Z]*>', '', content, flags=re.DOTALL)
        content = re.sub(r'<[A-Z][a-zA-Z]*[^>]*/>', '', content)
        
        # Remove code blocks but keep the content description
        content = re.sub(r'```[\s\S]*?```', '', content)
        
        # Remove inline code
        content = re.sub(r'`[^`]+`', '', content)
        
        # Remove custom tip/warning blocks
        content = re.sub(r'::: \w+.*?:::', '', content, flags=re.DOTALL)
        
        # Remove HTML comments
        content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
        
        # Remove images
        content = re.sub(r'!\[.*?\]\(.*?\)', '', content)
        
        # Clean up extra whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        return content.strip()
    
    def _parse_existing_questions(self, content: str) -> list[dict]:
        """Parse existing quiz questions from markdown content."""
        questions = []
        
        # Look for QuizComponent with questions array
        quiz_match = re.search(r':questions="\[(.*?)\]"', content, flags=re.DOTALL)
        if quiz_match:
            try:
                # This is a simplified parser - in production you'd want proper JS parsing
                questions_str = quiz_match.group(1)
                # Extract individual question objects
                question_blocks = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', questions_str)
                for block in question_blocks:
                    # Parse key fields
                    text_match = re.search(r"text:\s*['\"](.+?)['\"]", block)
                    correct_match = re.search(r"correct:\s*(\d+)", block)
                    explanation_match = re.search(r"explanation:\s*['\"](.+?)['\"]", block)
                    
                    if text_match and correct_match:
                        questions.append({
                            "text": text_match.group(1),
                            "correct_index": int(correct_match.group(1)),
                            "explanation": explanation_match.group(1) if explanation_match else ""
                        })
            except Exception:
                pass  # Silently handle parsing errors
                
        return questions
    
    def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API with retry logic."""
        for attempt in range(MAX_RETRIES):
            try:
                response = self.client.models.generate_content(
                    model=MODEL_NAME,
                    contents=prompt
                )
                return response.text
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    print(f"  Retry {attempt + 1}/{MAX_RETRIES}: {e}")
                    time.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    raise
        return ""
    
    def _generate_flashcards(
        self, 
        content: str, 
        chapter: str,
        domain: str,
        task: str,
        count: int = 5
    ) -> list[Flashcard]:
        """Generate flashcards from content using Gemini."""
        
        prompt = f"""You are an expert PMP (Project Management Professional) exam tutor.

Generate exactly {count} high-quality flashcards from the following PMP study content.
Focus on key concepts, definitions, formulas, and practical applications for the 2026 PMP exam.

CONTENT:
{content[:8000]}  # Limit content to avoid token limits

REQUIREMENTS:
1. Each flashcard should test a single concept
2. Front: A clear question or prompt
3. Back: A concise, accurate answer with key details
4. Difficulty: easy, medium, or hard
5. Focus on concepts that are likely to appear on the PMP exam

OUTPUT FORMAT (JSON array):
[
  {{
    "front": "Question or prompt text",
    "back": "Answer text with key details",
    "difficulty": "easy|medium|hard"
  }}
]

Generate exactly {count} flashcards. Return ONLY the JSON array, no additional text."""

        response = self._call_gemini(prompt)
        
        # Parse JSON response
        flashcards = []
        try:
            # Clean response - remove markdown code blocks if present
            json_str = re.sub(r'^```json\s*', '', response.strip())
            json_str = re.sub(r'\s*```$', '', json_str)
            
            data = json.loads(json_str)
            for item in data:
                flashcards.append(Flashcard(
                    front=item["front"],
                    back=item["back"],
                    difficulty=item.get("difficulty", "medium"),
                    source_file=chapter,
                    domain=domain,
                    task=task
                ))
        except json.JSONDecodeError as e:
            print(f"  Warning: Could not parse flashcard JSON: {e}")
            
        return flashcards
    
    def _generate_questions(
        self,
        content: str,
        chapter: str,
        domain: str,
        task: str,
        count: int = 3
    ) -> list[Question]:
        """Generate practice test questions from content using Gemini."""
        
        prompt = f"""You are an expert PMP (Project Management Professional) exam question writer.

Generate exactly {count} high-quality multiple choice questions from the following PMP study content.
Questions should mirror the style and difficulty of the actual 2026 PMP exam.

CONTENT:
{content[:8000]}  # Limit content to avoid token limits

REQUIREMENTS:
1. Each question should be scenario-based when possible
2. 4 answer choices (A, B, C, D)
3. Only ONE correct answer
4. Explanation of why the correct answer is right
5. Difficulty level: easy, medium, or hard
6. Questions should test application of knowledge, not just memorization

OUTPUT FORMAT (JSON array):
[
  {{
    "question_text": "The scenario or question text",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "A|B|C|D",
    "explanation": "Why this answer is correct",
    "difficulty": "easy|medium|hard"
  }}
]

Generate exactly {count} questions. Return ONLY the JSON array, no additional text."""

        response = self._call_gemini(prompt)
        
        # Parse JSON response
        questions = []
        try:
            # Clean response - remove markdown code blocks if present
            json_str = re.sub(r'^```json\s*', '', response.strip())
            json_str = re.sub(r'\s*```$', '', json_str)
            
            data = json.loads(json_str)
            for item in data:
                questions.append(Question(
                    question_text=item["question_text"],
                    option_a=item["option_a"],
                    option_b=item["option_b"],
                    option_c=item["option_c"],
                    option_d=item["option_d"],
                    correct_answer=item["correct_answer"].upper(),
                    explanation=item["explanation"],
                    difficulty=item.get("difficulty", "medium"),
                    source_file=chapter,
                    domain=domain,
                    task=task
                ))
        except json.JSONDecodeError as e:
            print(f"  Warning: Could not parse question JSON: {e}")
            
        return questions
    
    def process_file(
        self,
        file_path: Path,
        chapter: str,
        flashcard_count: int = 5,
        question_count: int = 3
    ) -> GeneratedContent:
        """Process a single markdown file and generate content."""
        
        print(f"  Processing: {file_path.name}")
        
        # Get domain/task mapping
        mapping = DOMAIN_TASK_MAPPING.get(chapter, {
            "domain": "General",
            "domain_id": None,
            "tasks": [{"name": "General Knowledge", "order": 1}]
        })
        
        domain = mapping["domain"]
        task = mapping["tasks"][0]["name"] if mapping["tasks"] else "General"
        
        # Read and extract content
        with open(file_path, "r", encoding="utf-8") as f:
            raw_content = f.read()
        
        content = self._extract_text_from_markdown(raw_content)
        
        if len(content) < 100:
            print(f"    Skipping - insufficient content ({len(content)} chars)")
            return GeneratedContent(
                source_file=str(file_path),
                chapter=chapter,
                domain=domain,
                task=task
            )
        
        # Generate flashcards
        print(f"    Generating {flashcard_count} flashcards...")
        flashcards = self._generate_flashcards(
            content, chapter, domain, task, flashcard_count
        )
        print(f"    Generated {len(flashcards)} flashcards")
        
        # Small delay to avoid rate limiting
        time.sleep(1)
        
        # Generate questions
        print(f"    Generating {question_count} questions...")
        questions = self._generate_questions(
            content, chapter, domain, task, question_count
        )
        print(f"    Generated {len(questions)} questions")
        
        return GeneratedContent(
            source_file=str(file_path),
            chapter=chapter,
            domain=domain,
            task=task,
            flashcards=flashcards,
            questions=questions
        )
    
    def process_chapter(
        self,
        chapter_name: str,
        flashcards_per_file: int = 5,
        questions_per_file: int = 3,
        skip_files: Optional[list[str]] = None
    ) -> list[GeneratedContent]:
        """Process all files in a chapter directory."""
        
        chapter_path = GUIDE_PATH / chapter_name
        if not chapter_path.exists():
            print(f"Chapter not found: {chapter_path}")
            return []
        
        skip_files = skip_files or ["index.md", "knowledge-check.md"]
        results = []
        
        md_files = sorted(chapter_path.glob("*.md"))
        print(f"\nProcessing chapter: {chapter_name}")
        print(f"Found {len(md_files)} markdown files")
        
        for md_file in md_files:
            if md_file.name in skip_files:
                print(f"  Skipping: {md_file.name}")
                continue
            
            try:
                result = self.process_file(
                    md_file,
                    chapter_name,
                    flashcards_per_file,
                    questions_per_file
                )
                results.append(result)
                
                # Delay between files to avoid rate limiting
                time.sleep(2)
                
            except Exception as e:
                print(f"  Error processing {md_file.name}: {e}")
                
        return results
    
    def process_all_chapters(
        self,
        flashcards_per_file: int = 5,
        questions_per_file: int = 3
    ) -> list[GeneratedContent]:
        """Process all chapters in the guide."""
        
        all_results = []
        
        for chapter_name in sorted(DOMAIN_TASK_MAPPING.keys()):
            results = self.process_chapter(
                chapter_name,
                flashcards_per_file,
                questions_per_file
            )
            all_results.extend(results)
            
        return all_results


def save_results(
    results: list[GeneratedContent],
    output_dir: Path,
    format: str = "json"
) -> None:
    """Save generated content to files."""
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Aggregate all content
    all_flashcards = []
    all_questions = []
    
    for result in results:
        for fc in result.flashcards:
            all_flashcards.append({
                "front": fc.front,
                "back": fc.back,
                "difficulty": fc.difficulty,
                "domain": fc.domain,
                "task": fc.task,
                "source_file": fc.source_file
            })
        
        for q in result.questions:
            all_questions.append({
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "difficulty": q.difficulty,
                "domain": q.domain,
                "task": q.task,
                "source_file": q.source_file
            })
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save flashcards
    flashcards_file = output_dir / f"flashcards_{timestamp}.json"
    with open(flashcards_file, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_count": len(all_flashcards),
            "by_domain": _group_by_domain(all_flashcards),
            "flashcards": all_flashcards
        }, f, indent=2)
    print(f"\nSaved {len(all_flashcards)} flashcards to: {flashcards_file}")
    
    # Save questions
    questions_file = output_dir / f"questions_{timestamp}.json"
    with open(questions_file, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_count": len(all_questions),
            "by_domain": _group_by_domain(all_questions),
            "questions": all_questions
        }, f, indent=2)
    print(f"Saved {len(all_questions)} questions to: {questions_file}")
    
    # Save Python seed data format
    seed_file = output_dir / f"seed_data_{timestamp}.py"
    with open(seed_file, "w", encoding="utf-8") as f:
        f.write('"""\nGenerated PMP 2026 Content\n')
        f.write(f'Generated at: {datetime.now().isoformat()}\n"""\n\n')
        f.write("GENERATED_FLASHCARDS = ")
        f.write(json.dumps(all_flashcards, indent=4))
        f.write("\n\nGENERATED_QUESTIONS = ")
        f.write(json.dumps(all_questions, indent=4))
        f.write("\n")
    print(f"Saved seed data to: {seed_file}")


def _group_by_domain(items: list[dict]) -> dict:
    """Group items by domain and task."""
    result = {}
    for item in items:
        domain = item.get("domain", "Unknown")
        task = item.get("task", "Unknown")
        
        if domain not in result:
            result[domain] = {"count": 0, "tasks": {}}
        
        if task not in result[domain]["tasks"]:
            result[domain]["tasks"][task] = 0
        
        result[domain]["count"] += 1
        result[domain]["tasks"][task] += 1
    
    return result


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate PMP flashcards and questions using Gemini AI"
    )
    parser.add_argument(
        "--chapter",
        type=str,
        help="Specific chapter to process (e.g., 01-introduction)"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all chapters"
    )
    parser.add_argument(
        "--flashcards",
        type=int,
        default=5,
        help="Number of flashcards per file (default: 5)"
    )
    parser.add_argument(
        "--questions",
        type=int,
        default=3,
        help="Number of questions per file (default: 3)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(DEFAULT_OUTPUT_DIR),
        help="Output directory for generated content"
    )
    parser.add_argument(
        "--list-chapters",
        action="store_true",
        help="List available chapters"
    )
    
    args = parser.parse_args()
    
    if args.list_chapters:
        print("Available chapters:")
        for chapter in sorted(DOMAIN_TASK_MAPPING.keys()):
            chapter_path = GUIDE_PATH / chapter
            if chapter_path.exists():
                file_count = len(list(chapter_path.glob("*.md")))
                print(f"  {chapter} ({file_count} files)")
        return
    
    if not args.chapter and not args.all:
        parser.print_help()
        print("\nError: Must specify --chapter or --all")
        sys.exit(1)
    
    try:
        generator = ContentGenerator()
        
        if args.all:
            results = generator.process_all_chapters(
                args.flashcards,
                args.questions
            )
        else:
            results = generator.process_chapter(
                args.chapter,
                args.flashcards,
                args.questions
            )
        
        if results:
            save_results(results, Path(args.output_dir))
            print("\n✅ Content generation complete!")
        else:
            print("\n⚠️ No content was generated")
            
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()
