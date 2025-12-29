import argparse
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Literal

import dspy
import chromadb
from chromadb.utils import embedding_functions
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


# ============================================================================
# 1. SETUP & ECO MAPPING (Your Official Structure)
# ============================================================================
GUIDE_PATH = Path("/Users/dustinober/PMP-2026/guide")
OUTPUT_DIR = Path("/Users/dustinober/Projects/pmp_study_app/backend/generated_content")
CHROMA_PATH = Path("./pmp_vector_db")

PMP_2026_ECO = {
    "People": [
        "Develop a common vision",
        "Manage conflicts",
        "Lead the project team",
        "Engage stakeholders",
        "Align stakeholder expectations",
        "Manage stakeholder expectations",
        "Help ensure knowledge transfer",
        "Plan and manage communication"
    ],
    "Process": [
        "Develop an integrated project management plan and plan delivery",
        "Develop and manage project scope",
        "Help ensure value-based delivery",
        "Plan and manage resources",
        "Plan and manage procurement",
        "Plan and manage finance",
        "Plan and optimize quality of products/deliverables",
        "Plan and manage schedule",
        "Evaluate project status",
        "Manage project closure"
    ],
    "Business Environment": [
        "Define and establish project governance",
        "Plan and manage project compliance",
        "Manage and control changes",
        "Remove impediments and manage issues",
        "Plan and manage risk",
        "Continuous improvement",
        "Support organizational change",
        "Evaluate external business environment changes"
    ]
}

# ============================================================================
# 2. MODELS & SIGNATURES
# ============================================================================
class Flashcard(BaseModel):
    front: str
    back: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"

class PracticeQuestion(BaseModel):
    question_text: str
    options: List[dict] # [{text: str, explanation: str, is_correct: bool}]
    difficulty: str = "hard"

class GeneratePMPContent(dspy.Signature):
    """Generate 2026 PMP Exam content based on provided study guide context."""
    context = dspy.InputField(desc="Relevant chunks from the PMP guide")
    task_name = dspy.InputField()
    
    flashcards = dspy.OutputField(desc="List of 5 JSON flashcard objects")
    questions = dspy.OutputField(desc="List of 3 JSON scenario-based questions")

# ============================================================================
# 3. THE RAG ENGINE
# ============================================================================
class PMPRAGManager:
    def __init__(self):
        # 1. Setup Vector DB
        self.client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        self.emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        self.collection = self.client.get_or_create_collection("pmp_2026", embedding_function=self.emb_fn)
        
        # 2. Setup API Key - LiteLLM specifically checks GEMINI_API_KEY
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_AI_API_KEY not found in .env file")
        os.environ["GEMINI_API_KEY"] = api_key

        # 3. Setup DSPy with the standard LiteLLM model string
        # We use 'gemini/gemini-1.5-flash-latest' to ensure we hit the 1.5 endpoint
        self.lm = dspy.LM(
            "gemini/gemini-1.5-flash-latest", 
            api_key=os.environ["GEMINI_API_KEY"]
        )
        dspy.configure(lm=self.lm)
        
        # 4. Chain of Thought Generator
        self.generator = dspy.ChainOfThought(GeneratePMPContent)

    def index_files(self):
        """Finds all MD files and chunks them into the database."""
        if self.collection.count() > 0: return
        print("Indexing files...")
        for md_file in GUIDE_PATH.glob("**/*.md"):
            content = md_file.read_text()
            chunks = [c.strip() for c in content.split("\n\n") if len(c) > 100]
            for i, chunk in enumerate(chunks):
                self.collection.add(documents=[chunk], ids=[f"{md_file.stem}_{i}"])

    def process_task(self, domain: str, task: str):
        """The core RAG loop: Retrieve -> Generate -> Parse."""
        # Retrieve context
        results = self.collection.query(query_texts=[f"{domain} {task}"], n_results=5)
        context = "\n\n".join(results['documents'][0])
        
        # Generate
        pred = self.generator(context=context, task_name=task)
        
        # Clean and Parse
        def clean_json(s): return json.loads(re.sub(r'```json\s*|\s*```', '', s))
        
        return {
            "task": task,
            "domain": domain,
            "flashcards": clean_json(pred.flashcards),
            "questions": clean_json(pred.questions)
        }

# ============================================================================
# 4. MASTER FILE HANDLING
# ============================================================================
def save_to_master(new_data):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    for content_type in ["flashcards", "questions"]:
        master_path = OUTPUT_DIR / f"{content_type}_master.json"
        existing = []
        if master_path.exists():
            with open(master_path, "r") as f:
                existing = json.load(f).get(content_type, [])
        
        # Add metadata and append
        for item in new_data[content_type]:
            item.update({"task": new_data["task"], "domain": new_data["domain"], "date": datetime.now().isoformat()})
            existing.append(item)
            
        with open(master_path, "w") as f:
            json.dump({content_type: existing, "last_update": datetime.now().isoformat()}, f, indent=2)

# ============================================================================
# 5. EXECUTION
# ============================================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--task", type=str)
    args = parser.parse_args()

    rag = PMPRAGManager()
    rag.index_files()

    if args.all:
        for domain, tasks in PMP_2026_ECO.items():
            for task in tasks:
                print(f"Working on: {task}...")
                result = rag.process_task(domain, task)
                save_to_master(result)
    elif args.task:
        # Find domain for the specific task
        domain = next((d for d, ts in PMP_2026_ECO.items() if args.task in ts), "General")
        result = rag.process_task(domain, args.task)
        save_to_master(result)
        print(f"Completed {args.task}")