# 🧠 AI Productivity Twin

> Your AI-powered digital productivity mirror — tracks daily activity, predicts burnout risk, and delivers personalized insights.

![Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Stack](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)
![Stack](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Stack](https://img.shields.io/badge/scikit--learn-1.4-F7931E?logo=scikit-learn)
![Stack](https://img.shields.io/badge/AWS-Deployed-FF9900?logo=amazonaws)

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript + Tailwind)                   │
│  Pages: Dashboard | Daily Log | History | Insights          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / REST JSON
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS API Gateway  ──►  FastAPI (ECS Fargate)                │
│                                                             │
│  /api/v1/auth   • Register, Login, Refresh Token           │
│  /api/v1/logs   • CRUD daily activity logs                 │
│  /api/v1/dashboard • Weekly stats, trends, heatmap         │
│  /api/v1/insights  • AI-generated recommendations          │
└──────────┬───────────────────────┬──────────────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────┐    ┌──────────────────────────────────┐
│  PostgreSQL RDS  │    │  ML Inference Layer              │
│  • users         │    │  • Productivity Score (GBR)      │
│  • activity_logs │    │  • Burnout Classifier (GBC)      │
│  • predictions   │    │  • Insight Engine (rule-based)   │
│  • insights      │    │  • Focus Time Predictor          │
└──────────────────┘    └──────────────────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │  AWS S3          │
                        │  Model artifacts │
                        └──────────────────┘
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### 1. Clone & Configure
```bash
git clone https://github.com/yourname/productivity-twin.git
cd productivity-twin

# Backend config
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

### 2. Start with Docker Compose
```bash
cd docker
docker-compose up -d

# Services started:
# • PostgreSQL  → localhost:5432
# • Redis       → localhost:6379
# • FastAPI     → localhost:8000
# • React       → localhost:5173
```

### 3. Train ML Models (optional but recommended)
```bash
pip install scikit-learn pandas numpy joblib imbalanced-learn
python ml/train_pipeline.py --mode synthetic --samples 2000
# Models saved to: backend/app/ml/models/
```

### 4. Open the App
Navigate to **http://localhost:5173**, create an account, and start logging!

---

## 🛠️ Manual Setup (No Docker)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start PostgreSQL and Redis manually, then:
cp .env.example .env  # configure DATABASE_URL etc.
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🤖 ML Pipeline

### Models
| Model | Algorithm | Target | Metric |
|-------|-----------|--------|--------|
| Productivity Regressor | GradientBoosting | Score 0-100 | R² ~0.85, MAE ~5pts |
| Burnout Classifier | GradientBoosting + SMOTE | LOW/MEDIUM/HIGH | AUC ~0.91 |

### Productivity Score Formula
```
score = 0.25×sleep_n + 0.20×coding_n + 0.15×study_n
      + 0.20×mood_n  + 0.10×exercise_n + 0.10×(1-distraction_n)
× 100
```
Where each feature is normalized to [0, 1] before weighting.

### Train on Real Data
```bash
python ml/train_pipeline.py --mode db --db-url postgresql://...
```

---

## 📡 API Reference

```
POST   /api/v1/auth/register        Create account
POST   /api/v1/auth/login           Get JWT tokens
POST   /api/v1/auth/refresh         Refresh access token

POST   /api/v1/logs/                Submit daily log → triggers ML inference
GET    /api/v1/logs/                List logs (with date range filter)
GET    /api/v1/logs/{date}          Get log for specific date
PUT    /api/v1/logs/{id}            Update existing log
DELETE /api/v1/logs/{id}            Delete log

GET    /api/v1/dashboard/weekly     Weekly score, burnout, stats
GET    /api/v1/dashboard/trends     30/90-day productivity trends
GET    /api/v1/dashboard/heatmap    Focus time heatmap

GET    /api/v1/insights/            Paginated insights list
PATCH  /api/v1/insights/{id}/read   Mark insight as read
POST   /api/v1/insights/read-all    Mark all read
```

Interactive docs: http://localhost:8000/docs

---

## ☁️ AWS Deployment

### Infrastructure (manual steps)
1. **RDS PostgreSQL**: `db.t3.micro`, Multi-AZ, private subnet
2. **ElastiCache Redis**: `cache.t3.micro` for Celery + session cache
3. **S3 Bucket**: model artifacts + frontend static files
4. **ECR Repository**: Docker images
5. **ECS Fargate Cluster**: API containers, auto-scaling
6. **ALB**: HTTPS → ECS, health checks
7. **CloudFront**: CDN for React SPA
8. **Secrets Manager**: DB URL, JWT secret, AWS keys

### CI/CD
Push to `main` → GitHub Actions → ECR push → ECS force-new-deployment + S3/CloudFront invalidation.

### Required GitHub Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
PRODUCTION_API_URL
CLOUDFRONT_DISTRIBUTION_ID
```

---

## 📁 Project Structure

```
productivity-twin/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── models/              # ORM models (User, ActivityLog, Prediction, Insight)
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API routes (auth, logs, dashboard, insights)
│   │   ├── services/            # ML service + Insight Engine
│   │   └── core/                # JWT security
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # Dashboard, LogEntry, History, Insights
│   │   ├── components/          # Layout, reusable components
│   │   ├── services/            # API client (axios)
│   │   └── store/               # Zustand auth store
│   ├── package.json
│   └── tailwind.config.js
│
├── ml/
│   ├── train_pipeline.py        # Full ML training script
│   └── models/                  # Trained .pkl artifacts (gitignored)
│
├── docker/
│   └── docker-compose.yml
│
└── .github/workflows/deploy.yml # CI/CD pipeline
```

---

## 🔮 Phase 2 Roadmap

- [ ] **LSTM/Prophet** time-series forecasting (predict next 7-day productivity)
- [ ] **RL Suggestion Engine** (Stable-Baselines3 PPO — optimize daily schedule)
- [ ] **"Ask Your Twin"** — RAG-based conversational AI over your own history
- [ ] **MLflow** experiment tracking + model versioning
- [ ] **Evidently AI** data drift detection → auto-retrain trigger
- [ ] **Terraform IaC** for full AWS infrastructure provisioning
- [ ] **AWS Cognito** OAuth2 (Google/GitHub social login)

---

## 🧑‍💻 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts, TanStack Query |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| Auth | JWT (python-jose), bcrypt (passlib) |
| ML | scikit-learn, pandas, numpy, joblib, imbalanced-learn |
| Task Queue | Celery + Redis |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, AWS ECS Fargate, RDS, S3, CloudFront, API Gateway |
| CI/CD | GitHub Actions |

---

## 📝 License

MIT
