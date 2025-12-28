# Repository Guidelines

## Project Structure
- `backend/`: FastAPI API (Python)
  - `app/`: routers (`routers/`), models (`models/`), schemas (`schemas/`), seed data (`seed/`)
  - `alembic/` + `alembic.ini`: migrations
  - `tests/`: pytest tests (add `test_*.py`)
- `frontend/`: Next.js 14 web app (TypeScript)
  - `src/app/`: routes (`**/page.tsx`, `layout.tsx`)
  - `src/components/`: UI + feature components
  - `src/lib/api/`: API client + SWR hooks
  - `src/stores/`: Zustand state
  - `src/types/`: API types (mirrors backend schemas)
- `render.yaml`: Render deployment (Docker for both services)

## Build, Test, and Development Commands
Frontend (from `frontend/`):
```bash
npm ci
npm run dev      # http://localhost:3000
npm run lint
npm run build && npm start
```

Backend (from `backend/`):
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
python -m app.seed.pmp_2026_data   # optional: seed local DB
pytest                             # tests
```

## Coding Style & Naming Conventions
- Python: 4-space indentation, type hints, `snake_case` modules/functions, `PascalCase` classes. When changing DB models, include an Alembic migration.
- TypeScript: `strict` mode is on; prefer typed props/hooks. Use `@/*` imports (see `frontend/tsconfig.json`). React components are `PascalCase.tsx`.

## Testing Guidelines
- Backend uses `pytest` (+ `pytest-asyncio`/`httpx`). Place tests in `backend/tests/` as `test_<area>.py`.
- Frontend has no dedicated unit test runner configured; use `npm run lint` and `npm run build` as the main checks.

## Commit & Pull Request Guidelines
- Commit history largely follows Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`). Keep commits focused and messages imperative.
- PRs should include: a short summary, testing steps, and screenshots for UI changes; call out any API/schema changes (update both `backend/app/schemas/` and `frontend/src/types/`).
