# AI Detective V3 — Phase 1: Gemini Case Generation

V3 is a separate project copied from the final V2 baseline. Keep your V2 directory untouched. This phase adds on-demand case generation through the Google Gemini API while retaining the existing gameplay UI and predefined cases.

## What's in this phase

- Separate V3 project directory and versioned API.
- `POST /api/cases/generate` accepts a difficulty and optional theme.
- Gemini is asked for schema-constrained JSON matching the existing Pydantic `Case` schema.
- Server validates references, clue/action dependencies, reachability, and difficulty duration before returning a case.
- Canonical solution is excluded from `PublicCase` and remains in the backend's temporary in-memory registry.
- Existing predefined cases remain available via **Play Prebuilt Case**.
- Frontend adds **Generate a New AI Case** for the selected difficulty.
- Your Instagram, LinkedIn, and GitHub links are preserved.

## Important Phase 1 limitations

- Generated cases are stored in process memory only. A backend restart loses generated cases, so an active generated case cannot be scored or interrogated after a restart. PostgreSQL persistence is Phase 2.
- This is not yet secure authoritative game-state tracking. Phase 2 will move session state and scoring validation server-side.
- Gemini calls can fail due to missing keys, quota, model availability, network issues, or invalid/unsolvable model output. Such cases are rejected; don't assume every generation request will succeed on the first attempt.
- A Gemini API key may incur charges depending on current Google AI Studio terms, model and usage. Check current quotas/pricing before repeated generation.
- Do not commit `.env` or share your API key. The backend reads secrets only; never place the key in frontend variables.

## Requirements

- Python 3.11+
- Node.js 18+
- npm
- Google Gemini API key from Google AI Studio

## Backend setup (Linux / Chromebook)

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and replace `replace_with_your_key` with your Gemini API key. The default model is `gemini-2.5-flash`; set `GEMINI_MODEL` in `.env` if you want to change it to a model enabled for your account.

Run tests:

```bash
python -m pytest
```

Start the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000/docs` to inspect the API.

## Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173/`.

## Try AI generation

1. Start the backend with a valid key configured in `backend/.env`.
2. Start the frontend.
3. Choose Easy, Medium, Hard or Expert.
4. Click **Generate a New AI Case**.
5. Wait for generation and validation. If rejected, read the error and retry or use a prebuilt case.

## Phase roadmap

- **Phase 1 (this package):** Gemini generation + schema and logic validation.
- **Phase 2:** PostgreSQL storage, persistent cases/sessions, server-authoritative game state and scoring.
- **Phase 3:** Managed deployment, hosted database, secrets, HTTPS, production CORS and cross-device testing.

## Project structure

```text
ai-detective-v3/
  backend/
    app/api/                 FastAPI routes
    app/schemas/             Pydantic case schema
    app/services/            Prebuilt cases, Gemini generation, validation, scoring
    tests/                   Regression and generator tests
    .env.example              Safe environment template
  frontend/
    src/components/          V2 game UI with V3 generation controls
    src/services/api.ts      Backend API calls
  README.md
```
