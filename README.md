"# IELTS Tutor

This project is the start of a full IELTS preparation platform, not just a single feature. The current version includes the writing exam flow and grading backend, but the long-term direction is a complete IELTS learning system covering writing, speaking, reading, vocabulary, analytics, test tracking, and progress-based coaching.

## Project structure

- `ielts-backend/`: FastAPI service for prompt generation, validation, grading, and quality tracking
- `ielts-frontend/`: Next.js app for the student exam experience and dashboard

## Local setup

### 1. Install backend dependencies

```bash
cd ielts-backend
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pip install pytest
```

On Windows PowerShell:

```powershell
cd ielts-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip install pytest
```

### 2. Configure the environment

```bash
copy .env.example .env
```

Then update `.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:3000
```

> Do not commit a real key. Keep `.env` local only.

### 3. Run the backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Run the frontend

```bash
cd ../ielts-frontend
npm install
npm run dev
```

## Testing

Run the backend contract and validation tests:

```bash
cd ielts-backend
python -m pytest tests/test_api_contracts.py -q
```

## Deployment and branch workflow

This project should not be merged to `main` until you have validated the new branch in a real test environment.

### Recommended branch flow

```bash
git checkout -b test/ielts-platform
git push origin test/ielts-platform
```

### Render deployment workflow

1. Go to your Render backend service.
2. In the service settings, change the branch to `test/ielts-platform`.
3. Add environment variable:
   - `GEMINI_API_KEY` = your real Gemini API key
4. Trigger a deploy.

That lets you test the live backend without affecting the production branch.

### Vercel deployment workflow

1. In Vercel, open the frontend project.
2. Deploy the preview from the same test branch or a preview branch.
3. Set the frontend env variable:
   - `NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com`
4. Confirm the UI is hitting the Render backend correctly.

### Merge to production only after testing

Once the preview works and the API contract tests pass:

```bash
git checkout main
git merge test/ielts-platform
git push origin main
```

This keeps `main` as the stable production branch.

## Production environment variables

Backend on Render:

- `GEMINI_API_KEY`
- `FRONTEND_URL`

Frontend on Vercel:

- `NEXT_PUBLIC_API_URL`

## Quality and reliability

The backend includes:

- API contract tests under `ielts-backend/tests/`
- rubric validation before returning a score
- a quality log under `ielts-backend/quality/model_quality_log.jsonl`
- a `/api/quality/summary` endpoint for recent model-quality issues

## Notes

The app defaults to mock mode when no valid Gemini API key is configured. That is useful for local development and safe validation before production deployment.
" 
