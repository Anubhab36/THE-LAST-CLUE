# THE LAST CLUE 🔎
### An AI-Powered Detective Investigation Game

**THE LAST CLUE** is an interactive detective game where players investigate fictional criminal cases, examine evidence, explore timelines, interrogate suspects, connect clues, and identify the culprit.

The project combines interactive storytelling, AI-assisted case generation, structured investigation workflows, and backend-managed game sessions to create a detective experience in which players must reason from evidence rather than simply guess the answer.

---

## Table of Contents

- [Overview](#overview)
- [Project Goals](#project-goals)
- [Features](#features)
- [Gameplay Workflow](#gameplay-workflow)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Database and Migrations](#database-and-migrations)
- [Testing](#testing)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Security](#security)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Traditional detective games often follow fixed narratives with predetermined evidence and outcomes. THE LAST CLUE explores a more flexible approach by combining a browser-based investigation interface with AI-assisted case generation and structured game logic.

Players take the role of an investigator. Each case presents a mystery to solve through the examination of available evidence, investigation actions, suspect interrogation, and deduction.

The project is designed around three core principles:

1. **Investigation over guessing:** Players should build conclusions from clues and evidence.
2. **Interactive storytelling:** The investigation should feel like an unfolding mystery rather than a static questionnaire.
3. **Structured game logic:** Investigation progress, evidence discovery, and accusation outcomes should be managed consistently by the backend.

The project has evolved through multiple development iterations. This repository contains the current implementation of the application, including its React frontend, FastAPI backend, database integration, and AI-assisted case-generation workflow.

## Project Goals

- Build an immersive and interactive detective experience.
- Generate fictional investigative cases using a large language model.
- Provide dedicated interfaces for evidence, suspects, timelines, and investigative notes.
- Support structured investigation sessions and accusation scoring.
- Separate frontend presentation from backend game logic.
- Persist relevant game and generated-case data using PostgreSQL.
- Establish a foundation for deployment, further gameplay features, and future expansion.

## Features

### Investigation and Gameplay

- **Case selection:** Start an investigation using the available case-generation and case-selection workflows.
- **Crime scene investigation:** Explore the information presented for a case.
- **Evidence board:** Review and organize clues discovered during an investigation.
- **Investigation actions:** Perform available actions to uncover information.
- **Suspect interrogation:** Ask questions and investigate inconsistencies in suspect statements.
- **Timeline investigation:** Examine the sequence of events surrounding a case.
- **Investigator's notebook:** Keep track of relevant observations and deductions.
- **Final accusation:** Submit a conclusion about the case.
- **Results and scoring:** Evaluate the submitted accusation using backend investigation and scoring logic.

The availability and behavior of individual features depend on the implementation of the selected case and the current game flow.

### AI-Assisted Case Generation

The backend integrates with Google's Gemini API to support the generation of fictional detective cases.

The case-generation workflow includes:

- Requesting a generated case from the configured AI model.
- Validating generated case data.
- Converting case information into structured application data.
- Making generated cases available to the game interface.

AI-generated content is treated as application data and should be validated before being used by gameplay logic.

### Backend-Managed Game Sessions

The backend provides APIs for game sessions and investigation-related operations. This separates important game-state and scoring logic from the frontend.

The current implementation includes session management, evidence discovery, investigation progress, interrogation-related functionality, and accusation handling.

### Data Persistence

PostgreSQL and SQLAlchemy support the application's persistence layer. Alembic manages database schema migrations.

The persistence layer includes models for generated cases and game sessions.

---

## Gameplay Workflow

A typical investigation follows this sequence:

1. **Start a case:** Choose an available case or use the case-generation workflow.
2. **Review the scene:** Read the initial incident information and available details.
3. **Collect evidence:** Investigate clues and perform available actions.
4. **Examine suspects:** Ask questions and look for contradictions or inconsistencies.
5. **Build the timeline:** Connect events and evidence into a coherent explanation.
6. **Develop a theory:** Use the collected information to determine what happened.
7. **Submit an accusation:** Identify the suspected culprit and provide the required conclusion.
8. **Review the outcome:** Examine the result and scoring provided by the game.

The goal is to make the final accusation a consequence of the investigation, not merely a guess.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | CSS |
| Backend | Python, FastAPI |
| API validation | Pydantic |
| AI integration | Google Gemini API, Google Gen AI SDK |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Database migrations | Alembic |
| Backend testing | pytest, HTTPX |
| Frontend tooling | Node.js, npm |
| Version control | Git and GitHub |

---

## System Architecture

THE LAST CLUE uses a client-server architecture.

```text
                    PLAYER
                       |
                       v
          React + TypeScript Frontend
             (Vite Development Server)
                       |
                  HTTP / JSON
                       |
                       v
                FastAPI Backend
                       |
          +------------+------------+
          |            |            |
          v            v            v
     Case Logic    Session and    Scoring and
     and AI        Investigation  Validation
     Generation    Management
          |            |
          v            v
     Google Gemini   SQLAlchemy
                          |
                          v
                     PostgreSQL
```

### Frontend

The frontend is responsible for the user interface, investigation screens, game interactions, and communication with the backend.

It is built with React and TypeScript and bundled with Vite.

### Backend

The FastAPI backend exposes HTTP endpoints for case generation, case retrieval, session operations, and investigation-related actions.

It also manages case validation, session state, and scoring-related logic.

### AI Integration

The backend communicates with the configured Gemini model to support case generation. AI requests depend on a valid API key, model availability, network access, and applicable provider quotas.

### Database

PostgreSQL stores supported persistent application data. SQLAlchemy provides database access, while Alembic manages schema changes.

---

## Project Structure

```text
THE-LAST-CLUE/
├── README.md
├── .gitignore
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cases.py
│   │   │   ├── interrogation.py
│   │   │   └── sessions.py
│   │   ├── models/
│   │   │   └── game.py
│   │   ├── repositories/
│   │   ├── schemas/
│   │   │   └── case.py
│   │   ├── services/
│   │   │   ├── ai_case_generator.py
│   │   │   ├── case_generator.py
│   │   │   ├── case_registry.py
│   │   │   ├── case_validator.py
│   │   │   ├── scoring_engine.py
│   │   │   └── session_service.py
│   │   ├── db.py
│   │   └── main.py
│   ├── migrations/
│   ├── tests/
│   ├── alembic.ini
│   ├── pytest.ini
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Accusation/
    │   │   ├── CrimeScene/
    │   │   ├── EvidenceBoard/
    │   │   ├── Interrogation/
    │   │   ├── InvestigationActions/
    │   │   ├── Notebook/
    │   │   ├── Results/
    │   │   ├── Timeline/
    │   │   └── Timer/
    │   ├── services/
    │   │   └── api.ts
    │   ├── types/
    │   ├── App.tsx
    │   ├── App.css
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── package-lock.json
    └── vite.config.ts
```

*This structure summarizes the current repository; individual modules may evolve as development continues.*

---

## Getting Started

### Prerequisites

Install the following tools before running the application:

- Python 3.11 or a compatible supported Python version.
- Node.js and npm.
- PostgreSQL.
- Git.
- A Google Gemini API key for AI-assisted case generation.

### 1. Clone the repository

```bash
git clone https://github.com/Anubhab36/THE-LAST-CLUE.git
cd THE-LAST-CLUE
```

### 2. Configure the backend

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create a local `backend/.env` file using the configuration described below.

### 3. Configure PostgreSQL

Create a dedicated PostgreSQL database and application user. Configure the database connection string in `backend/.env`.

Do not use production credentials for local development, and do not commit the `.env` file.

### 4. Apply database migrations

From the `backend/` directory, with the virtual environment activated and the database configured:

```bash
alembic upgrade head
```

### 5. Start the backend

From the `backend/` directory:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend should be accessible locally at:

- API base: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

### 6. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will print the local development URL, typically:

`http://localhost:5173`

Open that URL in your browser.

Keep the backend and frontend running in separate terminals during local development.

---

## Environment Configuration

Create `backend/.env` with the required configuration:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql+psycopg://your_user:your_password@127.0.0.1:5432/your_database
```

Replace the example values with your own local credentials.

The database connection format shown above uses SQLAlchemy with the Psycopg PostgreSQL driver. Ensure the variable names match the application's settings and configuration code.

Depending on the deployment environment, additional settings such as CORS origins, model selection, or frontend API URLs may be required.

**Security requirements:**

- Never commit `.env` files.
- Never expose the Gemini API key in frontend code.
- Never place database credentials in client-side environment variables.
- Configure production secrets through the hosting provider's environment settings.
- Rotate credentials immediately if they are accidentally exposed.

---

## Running the Application

### Backend development

From `backend/`:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend development

From `frontend/`:

```bash
npm run dev
```

### Production frontend build

From `frontend/`:

```bash
npm run build
```

The compiled frontend is written to `frontend/dist/`. This directory is generated output and should not be committed to Git.

---

## Database and Migrations

The application uses SQLAlchemy models and Alembic migrations to manage persistent data.

Common migration commands, executed from `backend/`, include:

```bash
# Apply all pending migrations
alembic upgrade head

# View the current database revision
alembic current

# View migration history
alembic history
```

When database models change, create and review an appropriate migration before applying it to a shared or production database.

Back up important production data before performing potentially destructive schema changes.

---

## Testing

### Backend tests

From `backend/`, activate the virtual environment and run:

```bash
python -m pytest -q
```

The tests cover supported game logic, AI generation workflows, and session behavior.

### Frontend build verification

From `frontend/`, run:

```bash
npm run build
```

This checks TypeScript compilation and builds the frontend with Vite.

Run these checks before submitting significant changes or deploying a new version.

---

## API Overview

The backend exposes REST endpoints through FastAPI. The main API modules are:

| Module | Responsibility |
|---|---|
| `api/cases.py` | Case-related operations, including available case-generation workflows |
| `api/sessions.py` | Game session operations and investigation progress |
| `api/interrogation.py` | Interrogation-related operations |

The frontend communicates with the backend through the API service in `frontend/src/services/api.ts`.

For the exact routes, request schemas, response formats, and interactive testing, run the backend and visit:

`http://127.0.0.1:8000/docs`

The interactive API documentation is the authoritative reference for the routes exposed by the running backend.

---

## Deployment

The application is structured for separate frontend and backend deployment.

A possible hosting arrangement is:

| Component | Hosting option |
|---|---|
| React frontend | Vercel or another static frontend host |
| FastAPI backend | Railway or another Python-compatible application host |
| PostgreSQL database | Managed PostgreSQL provider |
| AI case generation | Google Gemini API |

These are deployment options, not a claim that the production deployment is already complete.

Before deploying:

1. Provision a production PostgreSQL database.
2. Configure backend environment variables and secrets.
3. Apply Alembic migrations to the production database.
4. Configure the frontend's backend API URL.
5. Configure CORS to allow only the intended frontend origins.
6. Ensure the backend binds to the port required by the hosting platform.
7. Deploy the backend and frontend.
8. Verify case generation, investigation actions, interrogation, accusation submission, and error handling on the public website.

Production deployments should use HTTPS and should not depend on local files, local credentials, or a developer's running machine.

---

## Security

THE LAST CLUE integrates external AI services and a database, so security must be considered throughout development.

Important practices include:

- Keep API keys and credentials out of source control.
- Validate AI-generated case data before using it.
- Validate and constrain client input on the backend.
- Apply appropriate database access controls.
- Restrict production CORS origins.
- Avoid returning internal exception details or secrets in API responses.
- Monitor provider quotas, request failures, and application errors.
- Review dependencies and update them when necessary.

The current repository should be treated as a developing application; security and production readiness must be verified for each deployment.

---

## Future Improvements

Potential areas for continued development include:

- More varied and replayable AI-generated cases.
- Richer suspect personalities and interrogation mechanics.
- More interactive evidence and timeline visualizations.
- Improved deduction and accusation feedback.
- Additional difficulty levels and case complexity.
- Persistent player history and investigation statistics.
- Better accessibility and responsive design.
- Automated integration and end-to-end tests.
- Production monitoring, rate limiting, and error reporting.
- Further improvements to case generation quality and validation.

These are possible future enhancements rather than a statement that every item is already implemented.

---

## Contributing

Contributions, bug reports, and suggestions are welcome.

A useful contribution workflow is:

1. Fork the repository.
2. Create a feature branch.
3. Make a focused change.
4. Run the relevant backend tests and frontend build.
5. Open a pull request describing the change and how it was tested.

Please do not include credentials, private user data, or production database contents in commits or issue reports.

---

## License

No license has been specified in this repository yet. Until a license is added, the project should not be assumed to be available for unrestricted reuse, modification, or redistribution.

---

## Author

**Anubhab Chakraborty**

- GitHub: [@Anubhab36](https://github.com/Anubhab36)
- LinkedIn: [Anubhab Chakraborty](https://www.linkedin.com/in/anubhab-chakraborty-4h28s)
- Instagram: [@_anoobhab_](https://www.instagram.com/_anoobhab_/)

---

*THE LAST CLUE — Every mystery leaves a trail. Find the evidence, connect the clues, and uncover the truth.*
