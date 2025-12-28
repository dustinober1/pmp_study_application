#!/bin/bash
set -e
cd '/Users/dustinober/Projects/pmp_study_app'
PROMPT=$(cat '/Users/dustinober/Projects/pmp_study_app/.claude/orchestrator/workers/feature-2.prompt')
claude -p "$PROMPT" --allowedTools Bash,Read,Write,Edit,Glob,Grep 2>&1 | tee '/Users/dustinober/Projects/pmp_study_app/.claude/orchestrator/workers/feature-2.log'
echo 'WORKER_EXITED' >> '/Users/dustinober/Projects/pmp_study_app/.claude/orchestrator/workers/feature-2.log'
