# Typeform Builder

Next.js (TypeScript) + FastAPI + SQLite clone of Typeform: builder with live preview, publish links, one-question-at-a-time respondent flow, results and stats.

## Setup
```bash
# backend (http://localhost:8000, auto-seeds sample data)
cd backend && python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload

# frontend (http://localhost:3000)
cd frontend && npm install && npm run dev
```
Set `NEXT_PUBLIC_API_URL` in the frontend env for deployment.

## Architecture
Next.js -> REST -> FastAPI -> SQLAlchemy -> SQLite

## Database
forms(id,title,description,status,slug,created_at,updated_at) 1—N questions(id,form_id,text,type,position,required,description,options JSON)
forms 1—N responses(id,form_id,submitted_at) 1—N answers(id,response_id,question_id,value)

## API
Forms: GET/POST /forms, GET/PUT/DELETE /forms/{id}, POST /forms/{id}/duplicate|publish|unpublish
Questions: POST /forms/{id}/questions, PUT /forms/{id}/questions/reorder, PUT/DELETE /questions/{id}
Public: GET /public/forms/{slug}, POST /public/forms/{slug}/responses
Results: GET /forms/{id}/responses|summary|export.csv

## Assumptions
Single default creator (no auth). Choice questions are single-select. Branching, themes, integrations are placeholders.
