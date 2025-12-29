"""
PMP 2026 Content Generator with DSPy

Uses DSPy for structured generation with hallucination control.
Generates flashcards and hard scenario-based practice questions from markdown source files.

Prerequisites:
    pip install dspy-ai google-genai python-dotenv

Environment Variables:
    GOOGLE_AI_API_KEY: Your Google AI Studio API key

Usage:
    python -m scripts.content_generator_dspy --help
    python -m scripts.content_generator_dspy --task "Lead the project team"
    python -m scripts.content_generator_dspy --all
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Literal

import dspy
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GUIDE_PATH = Path("/Users/dustinober/PMP-2026/guide")
DEFAULT_OUTPUT_DIR = Path("/Users/dustinober/Projects/pmp_study_app/backend/generated_content")
MODEL_NAME = "gemini/gemini-flash-lite-latest"  

# ============================================================================
# PMP 2026 ECO Task-to-File Mapping (Official ECO Structure)
# Source: eco-2026-task-map.md
# ============================================================================

# Domain I: People (33%) - 8 Tasks
ECO_PEOPLE_TASKS = {
    1: {
        "name": "Develop a common vision",
        "files": [
            "05-initiation/project-charter.md",
            "03-team-leadership/team-charter.md",
            "02-strategic/strategy-alignment.md",
        ]
    },
    2: {
        "name": "Manage conflicts",
        "files": [
            "03-team-leadership/conflict-management.md",
            "04-stakeholder/conflict-negotiation.md",
        ]
    },
    3: {
        "name": "Lead the project team",
        "files": [
            "03-team-leadership/building-teams.md",
            "03-team-leadership/motivation-performance.md",
            "08-execution/executing-work.md",
        ]
    },
    4: {
        "name": "Engage stakeholders",
        "files": [
            "04-stakeholder/stakeholder-analysis.md",
            "04-stakeholder/stakeholder-engagement.md",
        ]
    },
    5: {
        "name": "Align stakeholder expectations",
        "files": [
            "04-stakeholder/stakeholder-classification.md",
            "04-stakeholder/communication-planning.md",
            "05-initiation/delivery-strategy.md",
        ]
    },
    6: {
        "name": "Manage stakeholder expectations",
        "files": [
            "04-stakeholder/stakeholder-engagement.md",
            "09-monitoring/monitoring-closing.md",
        ]
    },
    7: {
        "name": "Help ensure knowledge transfer",
        "files": [
            "09-monitoring/project-closure.md",
            "09-monitoring/monitoring-closing.md",
        ]
    },
    8: {
        "name": "Plan and manage communication",
        "files": [
            "04-stakeholder/communication-planning.md",
            "06-project-planning/communications-planning.md",
            "09-monitoring/toolkit.md",
        ]
    },
}

# Domain II: Process (41%) - 10 Tasks
ECO_PROCESS_TASKS = {
    1: {
        "name": "Develop an integrated project management plan and plan delivery",
        "files": [
            "01-introduction/ways-of-working.md",
            "06-project-planning/scope-planning.md",
        ]
    },
    2: {
        "name": "Develop and manage project scope",
        "files": [
            "06-project-planning/scope-planning.md",
            "08-execution/executing-work.md",
        ]
    },
    3: {
        "name": "Help ensure value-based delivery",
        "files": [
            "02-strategic/benefits-realization.md",
            "02-strategic/benefits-value.md",
            "08-execution/value-delivery.md",
        ]
    },
    4: {
        "name": "Plan and manage resources",
        "files": [
            "06-project-planning/resource-planning.md",
            "03-team-leadership/building-teams.md",
        ]
    },
    5: {
        "name": "Plan and manage procurement",
        "files": [
            "06-project-planning/resource-planning.md",
            "08-execution/engagement-procurement.md",
        ]
    },
    6: {
        "name": "Plan and manage finance",
        "files": [
            "06-project-planning/cost-planning.md",
            "07-risk-quality/risk-management.md",
            "09-monitoring/monitoring-closing.md",
        ]
    },
    7: {
        "name": "Plan and optimize quality of products/deliverables",
        "files": [
            "06-project-planning/quality-planning.md",
            "07-risk-quality/quality-management.md",
        ]
    },
    8: {
        "name": "Plan and manage schedule",
        "files": [
            "06-project-planning/schedule-planning.md",
            "09-monitoring/monitoring-closing.md",
        ]
    },
    9: {
        "name": "Evaluate project status",
        "files": [
            "01-introduction/core-data.md",
            "06-project-planning/cost-planning.md",
            "09-monitoring/monitoring-closing.md",
            "09-monitoring/toolkit.md",
        ]
    },
    10: {
        "name": "Manage project closure",
        "files": [
            "09-monitoring/project-closure.md",
        ]
    },
}

# Domain III: Business Environment (26%) - 8 Tasks
ECO_BUSINESS_ENVIRONMENT_TASKS = {
    1: {
        "name": "Define and establish project governance",
        "files": [
            "02-strategic/compliance-governance.md",
            "02-strategic/pmo-role.md",
            "05-initiation/project-charter.md",
        ]
    },
    2: {
        "name": "Plan and manage project compliance",
        "files": [
            "02-strategic/compliance-governance.md",
            "02-strategic/sustainability.md",
        ]
    },
    3: {
        "name": "Manage and control changes",
        "files": [
            "09-monitoring/monitoring-closing.md",
            "08-execution/executing-work.md",
            "09-monitoring/toolkit.md",
        ]
    },
    4: {
        "name": "Remove impediments and manage issues",
        "files": [
            "08-execution/executing-work.md",
            "08-execution/toolkit.md",
            "03-team-leadership/conflict-management.md",
        ]
    },
    5: {
        "name": "Plan and manage risk",
        "files": [
            "06-project-planning/risk-planning.md",
            "07-risk-quality/risk-management.md",
        ]
    },
    6: {
        "name": "Continuous improvement",
        "files": [
            "07-risk-quality/quality-management.md",
            "09-monitoring/project-closure.md",
        ]
    },
    7: {
        "name": "Support organizational change",
        "files": [
            "02-strategic/organizational-change.md",
            "04-stakeholder/stakeholder-engagement.md",
        ]
    },
    8: {
        "name": "Evaluate external business environment changes",
        "files": [
            "02-strategic/external-environment.md",
            "07-risk-quality/risk-management.md",
        ]
    },
}

# Combined ECO structure
PMP_2026_ECO = {
    "People": {
        "id": 1,
        "weight": 33,
        "tasks": ECO_PEOPLE_TASKS,
    },
    "Process": {
        "id": 2,
        "weight": 41,
        "tasks": ECO_PROCESS_TASKS,
    },
    "Business Environment": {
        "id": 3,
        "weight": 26,
        "tasks": ECO_BUSINESS_ENVIRONMENT_TASKS,
    },
}


def get_all_eco_tasks() -> list[dict]:
    """Get flat list of all ECO tasks with metadata."""
    tasks = []
    for domain_name, domain_data in PMP_2026_ECO.items():
        for task_num, task_data in domain_data["tasks"].items():
            tasks.append({
                "domain": domain_name,
                "domain_id": domain_data["id"],
                "task_id": task_num,
                "task_name": task_data["name"],
                "files": task_data["files"],
            })
    return tasks


# ============================================================================
# Pydantic Models for Structured Output
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


class AnswerOption(BaseModel):
    """A single answer option with its explanation."""
    text: str = Field(description="The answer option text")
    explanation: str = Field(description="Why this option is correct or incorrect")
    is_correct: bool = Field(description="Whether this is the correct answer")
    
    @field_validator('text')
    @classmethod
    def text_must_have_content(cls, v: str) -> str:
        if not v or len(v.strip()) < 10:
            raise ValueError('Option text must be at least 10 characters')
        return v.strip()
    
    @field_validator('explanation')
    @classmethod
    def explanation_must_be_detailed(cls, v: str) -> str:
        if not v or len(v.strip()) < 20:
            raise ValueError('Explanation must be at least 20 characters')
        return v.strip()


class PracticeQuestion(BaseModel):
    """A hard, scenario-based PMP practice question with 4 options (randomizable order)."""
    question_text: str = Field(
        description="A complex scenario-based question (3-5 sentences describing a realistic project situation, then asking what the PM should do)"
    )
    options: list[AnswerOption] = Field(
        description="Exactly 4 answer options. One must be correct (is_correct=true), three must be incorrect (is_correct=false)."
    )
    difficulty: Literal["medium", "hard"] = Field(
        default="hard",
        description="Difficulty level (medium or hard only)"
    )
    
    @field_validator('question_text')
    @classmethod
    def must_be_scenario(cls, v: str) -> str:
        if not v or len(v.strip()) < 100:
            raise ValueError('Question must be a detailed scenario (at least 100 characters)')
        return v.strip()
    
    @field_validator('options')
    @classmethod
    def must_have_exactly_four_options(cls, v: list) -> list:
        if len(v) != 4:
            raise ValueError('Must have exactly 4 options')
        correct_count = sum(1 for opt in v if opt.is_correct)
        if correct_count != 1:
            raise ValueError('Exactly one option must be marked as correct')
        return v
    
    def get_correct_index(self) -> int:
        """Get the index (0-3) of the correct option."""
        for i, opt in enumerate(self.options):
            if opt.is_correct:
                return i
        return -1


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
    - ONLY use information from the provided content - do not make up facts
    - Focus on exam-relevant concepts, definitions, formulas, and practical applications
    - Mix difficulty levels appropriately
    """
    
    content: str = dspy.InputField(desc="PMP study content from the source material")
    domain: str = dspy.InputField(desc="ECO domain (People, Process, or Business Environment)")
    task_name: str = dspy.InputField(desc="ECO task name this content relates to")
    num_flashcards: int = dspy.InputField(desc="Number of flashcards to generate")
    
    flashcard_set: FlashcardSet = dspy.OutputField(desc="Generated flashcard set")


class GenerateQuestions(dspy.Signature):
    """Generate HARD, scenario-based PMP practice test questions that mimic the actual PMP exam.
    
    You are an expert PMP exam question writer creating questions for the 2026 PMP certification exam.
    
    CRITICAL REQUIREMENTS:
    
    1. SCENARIO-BASED: Every question MUST start with a realistic project scenario (3-5 sentences)
       describing a specific situation a project manager faces. Include details like:
       - Project context (type, phase, team size, constraints)
       - A specific problem or decision point
       - Relevant stakeholders involved
       
    2. DIFFICULTY: Questions should be HARD - testing application of knowledge, not memorization.
       Use words like "BEST", "FIRST", "MOST important", "PRIMARY" to make students think critically.
       
    3. PLAUSIBLE DISTRACTORS: All 4 options should be reasonable actions a PM might consider.
       Wrong answers should be things a PM COULD do, but are not the BEST choice.
       
    4. OPTIONS FORMAT: Each question has exactly 4 options. Each option has:
       - text: The answer choice text
       - explanation: Why this option is correct OR incorrect
       - is_correct: true for the ONE correct answer, false for the three distractors
       
    5. EXPLANATIONS FOR ALL OPTIONS: For EACH option explain:
       - If is_correct=true: WHY this is the best choice and what makes it superior
       - If is_correct=false: WHY this is not the best choice, even though it might seem reasonable
       
    6. GROUNDED IN CONTENT: ONLY use concepts from the provided content. Do not fabricate.
    
    7. PMP EXAM STYLE: Mirror the actual exam format:
       - Complex scenarios requiring judgment
       - Multiple valid-seeming options
       - Focus on what a PM should do FIRST or what is MOST important
    """
    
    content: str = dspy.InputField(desc="PMP study content from the source material")
    domain: str = dspy.InputField(desc="ECO domain (People, Process, or Business Environment)")
    task_name: str = dspy.InputField(desc="ECO task name this content relates to")
    num_questions: int = dspy.InputField(desc="Number of questions to generate")
    
    question_set: QuestionSet = dspy.OutputField(desc="Generated question set")


# ============================================================================
# DSPy Modules
# ============================================================================

def parse_json_response(response: str, model_class, list_key: str = None):
    """Parse JSON from LLM response into a Pydantic model.
    
    Args:
        response: The raw string response from the LLM
        model_class: The Pydantic model class to validate against
        list_key: If the expected format is {list_key: [...]} but LLM returns [...],
                  this wraps the list automatically
    """
    import json
    import re
    
    if not response or not response.strip():
        raise ValueError("Empty response from LLM")
    
    # Try to extract JSON from markdown code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
    if json_match:
        json_str = json_match.group(1).strip()
    else:
        # Try to find raw JSON (object or array)
        json_match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', response)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = response.strip()
    
    try:
        data = json.loads(json_str)
        
        # If LLM returned a list but we expect an object with a list_key
        if isinstance(data, list) and list_key:
            data = {list_key: data}
        
        return model_class.model_validate(data)
    except json.JSONDecodeError as e:
        # Try json_repair if available
        try:
            from json_repair import repair_json
            repaired = repair_json(json_str)
            data = json.loads(repaired)
            if isinstance(data, list) and list_key:
                data = {list_key: data}
            return model_class.model_validate(data)
        except Exception:
            # Print debug info
            print(f"    DEBUG: Response length: {len(response)}")
            print(f"    DEBUG: First 200 chars: {response[:200]}")
            raise ValueError(f"Could not parse JSON: {e}")
    except Exception as e:
        # Validation error - print helpful debug
        print(f"    DEBUG: Parsed data type: {type(data)}")
        if isinstance(data, list):
            print(f"    DEBUG: List length: {len(data)}, wrapping with key '{list_key}'")
            if list_key:
                data = {list_key: data}
                return model_class.model_validate(data)
        raise


class FlashcardGenerator(dspy.Module):
    """DSPy module for generating flashcards with validation."""
    
    def __init__(self):
        super().__init__()
        self.generate = dspy.Predict(GenerateFlashcards)
    
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
        # Parse the string response into Pydantic model
        response = result.flashcard_set
        if isinstance(response, str):
            return parse_json_response(response, FlashcardSet, list_key="flashcards")
        return response


class QuestionGenerator(dspy.Module):
    """DSPy module for generating hard scenario-based questions."""
    
    def __init__(self):
        super().__init__()
        self.generate = dspy.Predict(GenerateQuestions)
    
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
        # Parse the string response into Pydantic model
        response = result.question_set
        if isinstance(response, str):
            return parse_json_response(response, QuestionSet, list_key="questions")
        return response


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


def load_files_for_task(file_paths: list[str]) -> tuple[str, list[str]]:
    """Load content from specific files for an ECO task."""
    all_content = []
    loaded_files = []
    
    for file_path in file_paths:
        full_path = GUIDE_PATH / file_path
        if full_path.exists():
            with open(full_path, "r", encoding="utf-8") as f:
                raw_content = f.read()
            
            text = extract_text_from_markdown(raw_content)
            if len(text) >= 100:
                all_content.append(f"## Source: {file_path}\n\n{text}")
                loaded_files.append(file_path)
        else:
            print(f"  ⚠️  File not found: {full_path}")
    
    return "\n\n---\n\n".join(all_content), loaded_files


# ============================================================================
# Main Generator Class
# ============================================================================

class PMPContentGenerator:
    """Generate PMP flashcards and hard scenario-based questions using DSPy."""
    
    def __init__(self, api_key: str = None):
        """Initialize with Google AI API key."""
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_AI_API_KEY environment variable is required")
        
        # Configure DSPy with Gemini via LiteLLM
        self.lm = dspy.LM(
            model=MODEL_NAME,
            api_key=self.api_key,
            max_tokens=16384,  # Large output for detailed explanations
            temperature=0.7,
        )
        dspy.configure(lm=self.lm)
        
        # Initialize generators
        self.flashcard_gen = FlashcardGenerator()
        self.question_gen = QuestionGenerator()
    
    def generate_for_task(
        self,
        domain: str,
        task_id: int,
        task_name: str,
        files: list[str],
        num_flashcards: int = 10,
        num_questions: int = 10
    ) -> dict:
        """Generate content for a specific ECO task."""
        
        domain_id = PMP_2026_ECO[domain]["id"]
        
        print(f"\n{'='*70}")
        print(f"ECO Task: {domain} - Task {task_id}")
        print(f"  {task_name}")
        print(f"{'='*70}")
        
        # Load content from mapped files
        print(f"\nLoading {len(files)} source files...")
        content, loaded_files = load_files_for_task(files)
        print(f"Loaded {len(loaded_files)} files ({len(content):,} characters)")
        
        if len(content) < 500:
            print("Insufficient content, skipping...")
            return {
                "domain": domain,
                "domain_id": domain_id,
                "task_id": task_id,
                "task_name": task_name,
                "files": loaded_files,
                "flashcards": [],
                "questions": []
            }
        
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
                    "task_id": task_id,
                }
                for fc in flashcard_set.flashcards
            ]
            print(f"✓ Generated {len(flashcards)} flashcards")
        except Exception as e:
            print(f"✗ Error generating flashcards: {e}")
            flashcards = []
        
        # Generate hard scenario-based questions
        print(f"\nGenerating {num_questions} hard scenario-based questions...")
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
                    "options": [
                        {
                            "text": opt.text,
                            "explanation": opt.explanation,
                            "is_correct": opt.is_correct
                        }
                        for opt in q.options
                    ],
                    "difficulty": q.difficulty,
                    "domain": domain,
                    "domain_id": domain_id,
                    "task": task_name,
                    "task_id": task_id,
                }
                for q in question_set.questions
            ]
            print(f"✓ Generated {len(questions)} scenario-based questions")
        except Exception as e:
            print(f"✗ Error generating questions: {e}")
            questions = []
        
        return {
            "domain": domain,
            "domain_id": domain_id,
            "task_id": task_id,
            "task_name": task_name,
            "files": loaded_files,
            "flashcards": flashcards,
            "questions": questions
        }
    
    def generate_all(
        self,
        num_flashcards_per_task: int = 10,
        num_questions_per_task: int = 10
    ) -> dict:
        """Generate content for all ECO tasks."""
        
        all_results = {
            "generated_at": datetime.now().isoformat(),
            "eco_version": "PMP 2026",
            "tasks": [],
            "all_flashcards": [],
            "all_questions": [],
            "summary": {}
        }
        
        all_tasks = get_all_eco_tasks()
        print(f"\nGenerating content for {len(all_tasks)} ECO tasks...")
        
        for task_info in all_tasks:
            result = self.generate_for_task(
                domain=task_info["domain"],
                task_id=task_info["task_id"],
                task_name=task_info["task_name"],
                files=task_info["files"],
                num_flashcards=num_flashcards_per_task,
                num_questions=num_questions_per_task
            )
            all_results["tasks"].append(result)
            all_results["all_flashcards"].extend(result["flashcards"])
            all_results["all_questions"].extend(result["questions"])
        
        # Summary by domain
        all_results["summary"] = {
            "total_flashcards": len(all_results["all_flashcards"]),
            "total_questions": len(all_results["all_questions"]),
            "by_domain": {}
        }
        
        for domain_name in ["People", "Process", "Business Environment"]:
            fc_count = len([f for f in all_results["all_flashcards"] if f["domain"] == domain_name])
            q_count = len([q for q in all_results["all_questions"] if q["domain"] == domain_name])
            all_results["summary"]["by_domain"][domain_name] = {
                "flashcards": fc_count,
                "questions": q_count
            }
        
        return all_results


def compute_content_hash(text: str) -> str:
    """Compute a hash for content deduplication."""
    import hashlib
    # Normalize text for comparison
    normalized = " ".join(text.lower().split())
    return hashlib.md5(normalized.encode()).hexdigest()[:12]


def load_existing_content(output_dir: Path) -> tuple[set[str], set[str], list, list]:
    """Load existing flashcards and questions from master files for deduplication."""
    flashcard_hashes = set()
    question_hashes = set()
    existing_flashcards = []
    existing_questions = []
    
    # Load existing flashcards
    flashcards_master = output_dir / "flashcards_master.json"
    if flashcards_master.exists():
        with open(flashcards_master, "r", encoding="utf-8") as f:
            data = json.load(f)
            existing_flashcards = data.get("flashcards", [])
            for fc in existing_flashcards:
                hash_key = compute_content_hash(fc.get("front", ""))
                flashcard_hashes.add(hash_key)
        print(f"Loaded {len(existing_flashcards)} existing flashcards for deduplication")
    
    # Load existing questions
    questions_master = output_dir / "questions_master.json"
    if questions_master.exists():
        with open(questions_master, "r", encoding="utf-8") as f:
            data = json.load(f)
            existing_questions = data.get("questions", [])
            for q in existing_questions:
                hash_key = compute_content_hash(q.get("question_text", ""))
                question_hashes.add(hash_key)
        print(f"Loaded {len(existing_questions)} existing questions for deduplication")
    
    return flashcard_hashes, question_hashes, existing_flashcards, existing_questions


def deduplicate_content(
    new_flashcards: list,
    new_questions: list,
    existing_fc_hashes: set[str],
    existing_q_hashes: set[str]
) -> tuple[list, list, int, int]:
    """Remove duplicate flashcards and questions based on content hashing."""
    unique_flashcards = []
    unique_questions = []
    fc_duplicates = 0
    q_duplicates = 0
    
    for fc in new_flashcards:
        hash_key = compute_content_hash(fc.get("front", ""))
        if hash_key not in existing_fc_hashes:
            unique_flashcards.append(fc)
            existing_fc_hashes.add(hash_key)  # Prevent within-batch duplicates too
        else:
            fc_duplicates += 1
    
    for q in new_questions:
        hash_key = compute_content_hash(q.get("question_text", ""))
        if hash_key not in existing_q_hashes:
            unique_questions.append(q)
            existing_q_hashes.add(hash_key)
        else:
            q_duplicates += 1
    
    return unique_flashcards, unique_questions, fc_duplicates, q_duplicates


def save_results(
    results: dict, 
    output_dir: Path,
    append_to_master: bool = True
) -> None:
    """Save generated content to files with optional append to master files."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Load existing content for deduplication
    fc_hashes, q_hashes, existing_fcs, existing_qs = load_existing_content(output_dir)
    
    # Deduplicate new content
    new_flashcards = results.get("all_flashcards", [])
    new_questions = results.get("all_questions", [])
    
    unique_fcs, unique_qs, fc_dupes, q_dupes = deduplicate_content(
        new_flashcards, new_questions, fc_hashes, q_hashes
    )
    
    if fc_dupes > 0 or q_dupes > 0:
        print(f"\n⚠️  Removed duplicates: {fc_dupes} flashcards, {q_dupes} questions")
    
    # Save timestamped run file (just this run's unique content)
    run_file = output_dir / f"run_{timestamp}.json"
    run_data = {
        "generated_at": results.get("generated_at", datetime.now().isoformat()),
        "new_flashcards": len(unique_fcs),
        "new_questions": len(unique_qs),
        "duplicates_removed": {"flashcards": fc_dupes, "questions": q_dupes},
        "flashcards": unique_fcs,
        "questions": unique_qs
    }
    with open(run_file, "w", encoding="utf-8") as f:
        json.dump(run_data, f, indent=2)
    print(f"\nSaved run to: {run_file}")
    
    if append_to_master:
        # Append to master flashcards file
        all_flashcards = existing_fcs + unique_fcs
        flashcards_master = output_dir / "flashcards_master.json"
        with open(flashcards_master, "w", encoding="utf-8") as f:
            json.dump({
                "updated_at": datetime.now().isoformat(),
                "count": len(all_flashcards),
                "flashcards": all_flashcards
            }, f, indent=2)
        print(f"Updated master flashcards: {len(all_flashcards)} total ({len(unique_fcs)} new)")
        
        # Append to master questions file
        all_questions = existing_qs + unique_qs
        questions_master = output_dir / "questions_master.json"
        with open(questions_master, "w", encoding="utf-8") as f:
            json.dump({
                "updated_at": datetime.now().isoformat(),
                "count": len(all_questions),
                "questions": all_questions
            }, f, indent=2)
        print(f"Updated master questions: {len(all_questions)} total ({len(unique_qs)} new)")
    else:
        # Just save timestamped files (old behavior)
        flashcards_file = output_dir / f"flashcards_{timestamp}.json"
        with open(flashcards_file, "w", encoding="utf-8") as f:
            json.dump({
                "generated_at": results.get("generated_at"),
                "count": len(unique_fcs),
                "flashcards": unique_fcs
            }, f, indent=2)
        print(f"Saved {len(unique_fcs)} flashcards to: {flashcards_file}")
        
        questions_file = output_dir / f"questions_{timestamp}.json"
        with open(questions_file, "w", encoding="utf-8") as f:
            json.dump({
                "generated_at": results.get("generated_at"),
                "count": len(unique_qs),
                "questions": unique_qs
            }, f, indent=2)
        print(f"Saved {len(unique_qs)} questions to: {questions_file}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate hard PMP exam content using DSPy with Gemini"
    )
    parser.add_argument(
        "--task",
        type=str,
        help="Specific task name to process (e.g., 'Lead the project team')"
    )
    parser.add_argument(
        "--domain",
        type=str,
        choices=["People", "Process", "Business Environment"],
        help="Process all tasks in a domain"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all ECO tasks"
    )
    parser.add_argument(
        "--flashcards",
        type=int,
        default=10,
        help="Number of flashcards per task (default: 10)"
    )
    parser.add_argument(
        "--questions",
        type=int,
        default=10,
        help="Number of questions per task (default: 10)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(DEFAULT_OUTPUT_DIR),
        help="Output directory for generated content"
    )
    parser.add_argument(
        "--no-append",
        action="store_true",
        help="Don't append to master files (just create timestamped files)"
    )
    parser.add_argument(
        "--list-tasks",
        action="store_true",
        help="List all ECO tasks with their source files"
    )
    
    args = parser.parse_args()
    
    if args.list_tasks:
        print("PMP 2026 ECO Tasks with Source Files:\n")
        for domain_name, domain_data in PMP_2026_ECO.items():
            print(f"\n{'='*60}")
            print(f"Domain: {domain_name} ({domain_data['weight']}%)")
            print(f"{'='*60}")
            for task_id, task_data in domain_data["tasks"].items():
                print(f"\n  Task {task_id}: {task_data['name']}")
                for f in task_data["files"]:
                    exists = "✓" if (GUIDE_PATH / f).exists() else "✗"
                    print(f"    {exists} {f}")
        return
    
    if not args.task and not args.domain and not args.all:
        parser.print_help()
        print("\nError: Must specify --task, --domain, or --all")
        sys.exit(1)
    
    try:
        generator = PMPContentGenerator()
        
        if args.all:
            results = generator.generate_all(args.flashcards, args.questions)
        elif args.domain:
            # Process all tasks in a domain
            domain_tasks = PMP_2026_ECO[args.domain]["tasks"]
            all_results = {
                "generated_at": datetime.now().isoformat(),
                "tasks": [],
                "all_flashcards": [],
                "all_questions": [],
                "summary": {}
            }
            for task_id, task_data in domain_tasks.items():
                result = generator.generate_for_task(
                    domain=args.domain,
                    task_id=task_id,
                    task_name=task_data["name"],
                    files=task_data["files"],
                    num_flashcards=args.flashcards,
                    num_questions=args.questions
                )
                all_results["tasks"].append(result)
                all_results["all_flashcards"].extend(result["flashcards"])
                all_results["all_questions"].extend(result["questions"])
            all_results["summary"] = {
                "total_flashcards": len(all_results["all_flashcards"]),
                "total_questions": len(all_results["all_questions"])
            }
            results = all_results
        else:
            # Find the specific task
            found = False
            for domain_name, domain_data in PMP_2026_ECO.items():
                for task_id, task_data in domain_data["tasks"].items():
                    if args.task.lower() in task_data["name"].lower():
                        result = generator.generate_for_task(
                            domain=domain_name,
                            task_id=task_id,
                            task_name=task_data["name"],
                            files=task_data["files"],
                            num_flashcards=args.flashcards,
                            num_questions=args.questions
                        )
                        results = {
                            "generated_at": datetime.now().isoformat(),
                            "tasks": [result],
                            "all_flashcards": result["flashcards"],
                            "all_questions": result["questions"],
                            "summary": {
                                "total_flashcards": len(result["flashcards"]),
                                "total_questions": len(result["questions"])
                            }
                        }
                        found = True
                        break
                if found:
                    break
            
            if not found:
                print(f"Error: Task '{args.task}' not found")
                sys.exit(1)
        
        if results["all_flashcards"] or results["all_questions"]:
            save_results(
                results, 
                Path(args.output_dir),
                append_to_master=not args.no_append
            )
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
