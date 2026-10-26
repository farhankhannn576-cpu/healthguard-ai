# HealthGuard AI — AI-Based Early Health Detection & Prediction System

Full-stack demo app: Node/Express + MySQL backend, vanilla HTML/CSS/JS frontend,
a scikit-learn risk-prediction model, and a Gemini-powered AI health assistant.

> ⚠️ **Educational demo only.** The ML model is trained on a synthetic dataset and the
> AI assistant is instructed never to diagnose or prescribe. Nothing in this app is
> medical advice.

## Stack
- Frontend: HTML5, CSS3, vanilla JavaScript, Chart.js, jsPDF (loaded from CDN)
- Backend: Node.js + Express.js
- Database: MySQL
- Auth: JWT + bcrypt
- ML: Python + scikit-learn (LogisticRegression, trained on a synthetic dataset)
- AI Agent: Google Gemini 2.5 Flash API

## Project structure
```
healthguard-ai/
├── frontend/          static HTML/CSS/JS, served by Express
├── backend/           Express API (routes/controllers/middleware/services)
├── ai/                Python ML model (train.py, model.py) + requirements.txt
├── database/          schema.sql
├── .env.example
└── package.json
```

## 1. Install dependencies
```bash
npm install
pip install -r ai/requirements.txt
```

## 2. Create the MySQL database
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS healthguard_ai;"
```

## 3. Import the schema
```bash
mysql -u root -p healthguard_ai < database/schema.sql
```
(The schema also creates the database itself if you skip step 2 — either order works.)

## 4. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `DB_USER` / `DB_PASSWORD` — your MySQL credentials
- `JWT_SECRET` — any long random string
- `GEMINI_API_KEY` — from https://aistudio.google.com/apikey (server-side only, never exposed to the frontend)

## 5. Train the ML model (one-time)
```bash
cd ai
python3 train.py
cd ..
```
This writes `ai/model.pkl`, `ai/scaler.pkl`, and `ai/feature_order.json`, which the backend
loads via `ai/model.py` for every prediction. Re-run any time you want to retrain.

## 6. Start the Node backend
```bash
npm start
```
The backend serves the API **and** the static frontend together at:
```
http://localhost:5000
```
(No separate frontend server is needed — `backend/server.js` serves `frontend/` via
`express.static`.)

## 7. Open the app
Visit `http://localhost:5000` in your browser.

## 8. Test the flow
1. Register a new account → redirects to the assessment form.
2. Complete the 5-section assessment → submits to `/api/assessment`, which calls the
   Python ML model and stores the result.
3. View the result page, download the PDF report.
4. Check the Dashboard (risk trend chart, latest metrics, recommendations).
5. View History, delete an old assessment.
6. Open AI Assistant and ask a question about your results — this calls Gemini 2.5 Flash
   via the backend and stores the conversation in `chat_history`.

## API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account, returns JWT |
| POST | `/api/auth/login` | — | Log in, returns JWT |
| GET  | `/api/profile` | ✓ | Current user profile (also available at `/api/auth/profile`) |
| POST | `/api/assessment` | ✓ | Submit health data → runs ML prediction → stores result |
| GET  | `/api/assessment` | ✓ | List current user's assessments |
| GET  | `/api/assessment/:id` | ✓ | Full detail for one assessment |
| DELETE | `/api/assessment/:id` | ✓ | Delete an assessment |
| POST | `/api/ai/predict` | ✓ | Run the ML model without persisting (debug/preview) |
| POST | `/api/ai/chat` | ✓ | Chat with the Gemini assistant (stores history) |
| GET  | `/api/ai/chat/history` | ✓ | Full chat log |
| GET  | `/api/dashboard` | ✓ | Aggregated dashboard data |

## Security notes
- Passwords are hashed with bcrypt (12 salt rounds) — never stored in plaintext.
- All non-auth endpoints require a valid JWT (`Authorization: Bearer <token>`).
- All SQL queries use parameterized placeholders (no string concatenation).
- CORS is restricted via `FRONTEND_ORIGIN` in `.env`.
- The Gemini API key lives only in `.env` / `process.env` on the backend — it is never
  sent to or embedded in the frontend.

## About the ML model
`ai/train.py` generates a **synthetic, clearly-labeled educational dataset** (no real
patient data) and trains a `LogisticRegression` classifier to output Low/Moderate/High
risk. `ai/model.py` is invoked by the Node backend (`backend/services/mlService.js`) via
`child_process`, taking a JSON health profile on stdin and returning a JSON prediction
(risk level, probability, contributing factors, recommendations) on stdout. This is a
demonstration model only and is not clinically validated.
