"""
PMP 2026 Content Generator with DSPy

Uses DSPy for structured generation with hallucination control.
Generates flashcards and practice questions from markdown source files.

Prerequisites:
    pip install dspy-ai google-genai python-dotenv

Environment Variables:
    GOOGLE_AI_API_KEY: Your Google AI Studio API key

Usage:
    python -m scripts.content_generator_dspy --help
    python -m scripts.content_generator_dspy --chapter 01-introduction
    python -m scripts.content_generator_dspy --all
"""

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

import dspy
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GUIDE_PATH = Path("/Users/dustinober/PMP-2026/guide")
DEFAULT_OUTPUT_DIR = Path("/Users/dustinober/Projects/pmp_study_app/backend/generated_content")
MODEL_NAME = "gemini/gemini-2.0-flash"  # LiteLLM format for Gemini

# ============================================================================
# PMP 2026 ECO (Examination Content Outline) Domains and Tasks
# Source: New-PMP-Examination-Content-Outline-2026.pdf
# ============================================================================

PEOPLE_TASKS = {
    1: "Develop a common vision",
    2: "Manage conflicts",
    3: "Lead the project team",
    4: "Engage stakeholders",
    5: "Align stakeholder expectations",
    6: "Manage stakeholder expectations",
    7: "Help ensure knowledge transfer",
    8: "Plan and manage communication",
}

PROCESS_TASKS = {
    1: "Develop an integrated project management plan and plan delivery",
    2: "Develop and manage project scope",
    3: "Help ensure value-based delivery",
    4: "Plan and manage resources",
    5: "Plan and manage procurement",
    6: "Plan and manage finance",
    7: "Plan and optimize quality of products/deliverables",
    8: "Plan and manage schedule",
    9: "Evaluate project status",
    10: "Manage project closure",
}

BUSINESS_ENVIRONMENT_TASKS = {
    1: "Define and establish project governance",
    2: "Plan and manage project compliance",
    3: "Manage and control changes",
    4: "Remove impediments and manage issues",
    5: "Plan and manage risk",
    6: "Continuous improvement",
    7: "Support organizational change",
    8: "Evaluate external business environment changes",
}

CHAPTER_TO_ECO_MAPPING = {
    "01-introduction": {"domain": "Process", "domain_id": 2, "primary_tasks": [1]},
    "02-strategic": {"domain": "Business Environment", "domain_id": 3, "primary_tasks": [1, 7, 8]},
    "03-team-leadership": {"domain": "People", "domain_id": 1, "primary_tasks": [1, 2, 3]},
    "04-stakeholder": {"domain": "People", "domain_id": 1, "primary_tasks": [4, 5, 6, 8]},
    "05-initiation": {"domain": "Process", "domain_id": 2, "primary_tasks": [1, 2]},
    "06-project-planning": {"domain": "Process", "domain_id": 2, "primary_tasks": [2, 3, 4, 5, 6, 7, 8]},
    "07-risk-quality": {"domain": "Business Environment", "domain_id": 3, "primary_tasks": [5, 4]},
    "08-execution": {"domain": "Process", "domain_id": 2, "primary_tasks": [3, 7, 9]},
    "09-monitoring": {"domain": "Business Environment", "domain_id": 3, "primary_tasks": [3, 4, 6]},
    "10-ai-pm": {"domain": "Business Environment", "domain_id": 3, "primary_tasks": [6, 8]},
    "11-exam-prep": {"domain": "Process", "domain_id": 2, "primary_tasks": [9, 10]},
    "appendices": {"domain": "Process", "domain_id": 2, "primary_tasks": [1]},
}


def get_eco_task_name(domain: str, task_number: int) -> str:
    """Get the official ECO task name."""
    if domain == "People":
        return PEOPLE_TASKS.get(task_number, f"Task {task_number}")
    elif domain == "Process":
        return PROCESS_TASKS.get(task_number, f"Task {task_number}")
    elif domain == "Business Environment":
        return BUSINESS_ENVIRONMENT_TASKS.get(task_number, f"Task {task_number}")
    return f"Task {task_number}"


# ============================================================================
# Pydantic Models for Structured Output (DSPy TypedPredictors)
# ============================================================================

class Flashcard(BaseModel):
    """A single flashcard with front and back content."""
    front: str = Field(description="Question or prompt for the flashcard front")
    back: str = Field(description="Answer or explanation for the flashcard back")
    difficulty: Literal["easy", "medium", "hard"] = Field(
        default="medium",
        description="Difficulty level of the flashcard"
    )
    
    @field_validator('front', 'back')
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v or len(v.strip()) < 10:
            raise ValueError('Content must be at least 10 characters')
        return v.strip()


class FlashcardSet(BaseModel):
    """A set of flashcards generated from content."""
    flashcards: list[Flashcard] = Field(description="List of generated flashcards")
    
    @field_validator('flashcards')
    @classmethod
    def must_have_flashcards(cls, v: list) -> list:
        if not v:
            raise ValueError('Must generate at least one flashcard')
        return v


class PracticeQuestion(BaseModel):
    """A single PMP practice question with 4 options."""
    question_text: str = Field(description="The scenario-based question text")
    option_a: str = Field(description="First answer option (A)")
    option_b: str = Field(description="Second answer option (B)")
    option_c: str = Field(description="Third answer option (C)")
    option_d: str = Field(description="Fourth answer option (D)")
    correct_answer: Literal["A", "B", "C", "D"] = Field(
        description="The correct answer letter (A, B, C, or D)"
    )
    explanation: str = Field(
        description="Explanation of why the correct answer is right"
    )
    difficulty: Literal["easy", "medium", "hard"] = Field(
        default="medium",
        description="Difficulty level"
    )
    
    @field_validator('question_text', 'explanation')
    @classmethod
    def must_be_substantial(cls, v: str) -> str:
        if not v or len(v.strip()) < 20:
            raise ValueError('Content must be at least 20 characters')
        return v.strip()
    
    @field_validator('option_a', 'option_b', 'option_c', 'option_d')
    @classmethod
    def option_must_have_content(cls, v: str) -> str:
        if not v or len(v.strip()) < 5:
            raise ValueError('Options must be at least 5 characters')
        return v.strip()


class QuestionSet(BaseModel):
    """A set of practice questions generated from content."""
    questions: list[PracticeQuestion] = Field(description="List of generated questions")
    
    @field_validator('questions')
    @classmethod
    def must_have_questions(cls, v: list) -> list:
        if not v:
            raise ValueError('Must generate at least one question')
        return v


# ============================================================================
# DSPy Signatures for Structured Generation
# ============================================================================

class GenerateFlashcards(dspy.Signature):
    """Generate PMP exam study flashcards from source content.
    
    You are an expert PMP (Project Management Professional) exam tutor.
    Generate high-quality flashcards that help students prepare for the 2026 PMP exam.
    
    Requirements:
    - Each flashcard should test a single concept
    - Front: A clear question or prompt
    - Back: A concise, accurate answer with key details
    - ONLY use information from the provided content - do not hallucinate
    - Focus on exam-relevant concepts, definitions, formulas, and practical applications
    """
    
    content: str = dspy.InputField(desc="PMP study content from the source material")
    domain: str = dspy.InputField(desc="ECO domain (People, Process, or Business Environment)")
    task_name: str = dspy.InputField(desc="ECO task name this content relates to")
    num_flashcards: int = dspy.InputField(desc="Number of flashcards to generate")
    
    flashcard_set: FlashcardSet = dspy.OutputField(desc="Generated flashcard set")


class GenerateQuestions(dspy.Signature):
    """Generate PMP practice test questions from source content.
    
    You are an expert PMP exam question writer.
    Generate high-quality, scenario-based multiple choice questions that mirror the 2026 PMP exam.
    
    Requirements:
    - Each question should be scenario-based when possible
    - 4 answer choices (A, B, C, D) with exactly ONE correct answer
    - Include explanation of why the correct answer is right
    - ONLY use information from the provided content - do not hallucinate
    - Questions should test application of knowledge, not just memorization
    - Mix difficulty levels (easy, medium, hard)
    """
    
    content: str = dspy.InputField(desc="PMP study content from the source material")
    domain: str = dspy.InputField(desc="ECO domain (People, Process, or Business Environment)")
    task_name: str = dspy.InputField(desc="ECO task name this content relates to")
    num_questions: int = dspy.InputField(desc="Number of questions to generate")
    
    question_set: QuestionSet = dspy.OutputField(desc="Generated question set")


# ============================================================================
# DSPy Modules with Retry and Validation
# ============================================================================

class FlashcardGenerator(dspy.Module):
    """DSPy module for generating flashcards with validation."""
    
    def __init__(self):
        super().__init__()
        self.generate = dspy.TypedPredictor(GenerateFlashcards)
    
    def forward(
        self,
        content: str,
        domain: str,
        task_name: str,
        num_flashcards: int = 10
    ) -> FlashcardSet:
        """Generate flashcards from content."""
        result = self.generate(
            content=content,
            domain=domain,
            task_name=task_name,
            num_flashcards=num_flashcards
        )
        return result.flashcard_set


class QuestionGenerator(dspy.Module):
    """DSPy module for generating practice questions with validation."""
    
    def __init__(self):
        super().__init__()
        self.generate = dspy.TypedPredictor(GenerateQuestions)
    
    def forward(
        self,
        content: str,
        domain: str,
        task_name: str,
        num_questions: int = 10
    ) -> QuestionSet:
        """Generate questions from content."""
        result = self.generate(
            content=content,
            domain=domain,
            task_name=task_name,
            num_questions=num_questions
        )
        return result.question_set


# ============================================================================
# Content Processing
# ============================================================================

def extract_text_from_markdown(content: str) -> str:
    """Extract plain text from markdown, removing special components."""
    # Remove frontmatter
    content = re.sub(r'^---\n.*?\n---\n', '', content, flags=re.DOTALL)
    
    # Remove Vue/MDX components
    content = re.sub(r'<[A-Z][a-zA-Z]*[^>]*>.*?</[A-Z][a-zA-Z]*>', '', content, flags=re.DOTALL)
    content = re.sub(r'<[A-Z][a-zA-Z]*[^>]*/>', '', content)
    
    # Remove code blocks
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


def load_chapter_content(chapter_name: str, skip_files: list[str] = None) -> tuple[str, list[str]]:
    """Load all markdown content from a chapter directory."""
    chapter_path = GUIDE_PATH / chapter_name
    if not chapter_path.exists():
        raise FileNotFoundError(f"Chapter not found: {chapter_path}")
    
    skip_files = skip_files or ["index.md", "knowledge-check.md"]
    
    all_content = []
    processed_files = []
    
    for md_file in sorted(chapter_path.glob("*.md")):
        if md_file.name in skip_files:
            continue
        
        with open(md_file, "r", encoding="utf-8") as f:
            raw_content = f.read()
        
        text = extract_text_from_markdown(raw_content)
        if len(text) >= 100:
            all_content.append(f"## File: {md_file.name}\n\n{text}")
            processed_files.append(md_file.name)
    
    return "\n\n---\n\n".join(all_content), processed_files


# ============================================================================
# Main Generator Class
# ============================================================================

class PMPContentGenerator:
    """Generate PMP flashcards and questions using DSPy."""
    
    def __init__(self, api_key: str = None):
        """Initialize with Google AI API key."""
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_AI_API_KEY environment variable is required")
        
        # Configure DSPy with Gemini via LiteLLM
        self.lm = dspy.LM(
            model=MODEL_NAME,
            api_key=self.api_key,
            max_tokens=8192,  # Large output for batch generation
            temperature=0.7,
        )
        dspy.configure(lm=self.lm)
        
        # Initialize generators
        self.flashcard_gen = FlashcardGenerator()
        self.question_gen = QuestionGenerator()
    
    def generate_for_chapter(
        self,
        chapter_name: str,
        num_flashcards: int = 15,
        num_questions: int = 10
    ) -> dict:
        """Generate content for an entire chapter (leverages full context window)."""
        
        print(f"\n{'='*60}")
        print(f"Processing Chapter: {chapter_name}")
        print(f"{'='*60}")
        
        # Get ECO mapping
        mapping = CHAPTER_TO_ECO_MAPPING.get(chapter_name, {
            "domain": "Process",
            "domain_id": 2,
            "primary_tasks": [1]
        })
        
        domain = mapping["domain"]
        domain_id = mapping["domain_id"]
        primary_task_num = mapping["primary_tasks"][0]
        task_name = get_eco_task_name(domain, primary_task_num)
        
        print(f"Domain: {domain} (ID: {domain_id})")
        print(f"Primary Task: {task_name}")
        
        # Load all chapter content at once (full context)
        print("\nLoading chapter content...")
        content, files = load_chapter_content(chapter_name)
        print(f"Loaded {len(files)} files ({len(content):,} characters)")
        
        if len(content) < 500:
            print("Insufficient content, skipping...")
            return {"flashcards": [], "questions": [], "files": files}
        
        # Generate flashcards
        print(f"\nGenerating {num_flashcards} flashcards...")
        try:
            flashcard_set = self.flashcard_gen(
                content=content,
                domain=domain,
                task_name=task_name,
                num_flashcards=num_flashcards
            )
            flashcards = [
                {
                    "front": fc.front,
                    "back": fc.back,
                    "difficulty": fc.difficulty,
                    "domain": domain,
                    "domain_id": domain_id,
                    "task": task_name,
                    "task_id": primary_task_num,
                    "source_chapter": chapter_name
                }
                for fc in flashcard_set.flashcards
            ]
            print(f"✓ Generated {len(flashcards)} flashcards")
        except Exception as e:
            print(f"✗ Error generating flashcards: {e}")
            flashcards = []
        
        # Generate questions
        print(f"\nGenerating {num_questions} questions...")
        try:
            question_set = self.question_gen(
                content=content,
                domain=domain,
                task_name=task_name,
                num_questions=num_questions
            )
            questions = [
                {
                    "question_text": q.question_text,
                    "option_a": q.option_a,
                    "option_b": q.option_b,
                    "option_c": q.option_c,
                    "option_d": q.option_d,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation,
                    "difficulty": q.difficulty,
                    "domain": domain,
                    "domain_id": domain_id,
                    "task": task_name,
                    "task_id": primary_task_num,
                    "source_chapter": chapter_name
                }
                for q in question_set.questions
            ]
            print(f"✓ Generated {len(questions)} questions")
        except Exception as e:
            print(f"✗ Error generating questions: {e}")
            questions = []
        
        return {
            "chapter": chapter_name,
            "domain": domain,
            "domain_id": domain_id,
            "task": task_name,
            "task_id": primary_task_num,
            "files": files,
            "flashcards": flashcards,
            "questions": questions
        }
    
    def generate_all(
        self,
        num_flashcards_per_chapter: int = 15,
        num_questions_per_chapter: int = 10
    ) -> dict:
        """Generate content for all chapters."""
        
        all_results = {
            "generated_at": datetime.now().isoformat(),
            "chapters": [],
            "all_flashcards": [],
            "all_questions": [],
            "summary": {}
        }
        
        for chapter in sorted(CHAPTER_TO_ECO_MAPPING.keys()):
            result = self.generate_for_chapter(
                chapter,
                num_flashcards_per_chapter,
                num_questions_per_chapter
            )
            all_results["chapters"].append(result)
            all_results["all_flashcards"].extend(result["flashcards"])
            all_results["all_questions"].extend(result["questions"])
        
        # Summary by domain
        all_results["summary"] = {
            "total_flashcards": len(all_results["all_flashcards"]),
            "total_questions": len(all_results["all_questions"]),
            "by_domain": {}
        }
        
        for fc in all_results["all_flashcards"]:
            domain = fc["domain"]
            if domain not in all_results["summary"]["by_domain"]:
                all_results["summary"]["by_domain"][domain] = {"flashcards": 0, "questions": 0}
            all_results["summary"]["by_domain"][domain]["flashcards"] += 1
        
        for q in all_results["all_questions"]:
            domain = q["domain"]
            if domain not in all_results["summary"]["by_domain"]:
                all_results["summary"]["by_domain"][domain] = {"flashcards": 0, "questions": 0}
            all_results["summary"]["by_domain"][domain]["questions"] += 1
        
        return all_results


def save_results(results: dict, output_dir: Path) -> None:
    """Save generated content to files."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save full results
    full_file = output_dir / f"pmp_content_{timestamp}.json"
    with open(full_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved full results to: {full_file}")
    
    # Save flashcards only
    flashcards_file = output_dir / f"flashcards_{timestamp}.json"
    with open(flashcards_file, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": results["generated_at"],
            "count": len(results["all_flashcards"]),
            "flashcards": results["all_flashcards"]
        }, f, indent=2)
    print(f"Saved {len(results['all_flashcards'])} flashcards to: {flashcards_file}")
    
    # Save questions only
    questions_file = output_dir / f"questions_{timestamp}.json"
    with open(questions_file, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": results["generated_at"],
            "count": len(results["all_questions"]),
            "questions": results["all_questions"]
        }, f, indent=2)
    print(f"Saved {len(results['all_questions'])} questions to: {questions_file}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate PMP content using DSPy with Gemini (hallucination-controlled)"
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
        default=15,
        help="Number of flashcards per chapter (default: 15)"
    )
    parser.add_argument(
        "--questions",
        type=int,
        default=10,
        help="Number of questions per chapter (default: 10)"
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
        print("Available chapters (with ECO mapping):\n")
        for chapter in sorted(CHAPTER_TO_ECO_MAPPING.keys()):
            chapter_path = GUIDE_PATH / chapter
            if chapter_path.exists():
                mapping = CHAPTER_TO_ECO_MAPPING[chapter]
                domain = mapping["domain"]
                task = get_eco_task_name(domain, mapping["primary_tasks"][0])
                file_count = len(list(chapter_path.glob("*.md")))
                print(f"  {chapter} ({file_count} files)")
                print(f"    → {domain}: {task}")
        return
    
    if not args.chapter and not args.all:
        parser.print_help()
        print("\nError: Must specify --chapter or --all")
        sys.exit(1)
    
    try:
        generator = PMPContentGenerator()
        
        if args.all:
            results = generator.generate_all(args.flashcards, args.questions)
        else:
            result = generator.generate_for_chapter(
                args.chapter,
                args.flashcards,
                args.questions
            )
            results = {
                "generated_at": datetime.now().isoformat(),
                "chapters": [result],
                "all_flashcards": result["flashcards"],
                "all_questions": result["questions"],
                "summary": {
                    "total_flashcards": len(result["flashcards"]),
                    "total_questions": len(result["questions"])
                }
            }
        
        if results["all_flashcards"] or results["all_questions"]:
            save_results(results, Path(args.output_dir))
            print(f"\n{'='*60}")
            print("✅ Content generation complete!")
            print(f"   Flashcards: {results['summary']['total_flashcards']}")
            print(f"   Questions:  {results['summary']['total_questions']}")
            print(f"{'='*60}")
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
