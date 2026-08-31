# Contributing to LMPC AI Compliance & Enforcement Platform

Thank you for your interest in contributing to the Legal Metrology (Packaged Commodities) AI Compliance Platform! This project was developed for **Smart India Hackathon 2026** (Problem Statement 26034) by **Team PredictXY**.

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+** with pip
- **Node.js 20+** with npm
- **Tesseract OCR** (for label text extraction)
- **Git**

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/harshithps35/Legal-Metrology-Packaged-Commodities-LMPC-AI-Compliance-Enforcement-Platform.git
cd Legal-Metrology-Packaged-Commodities-LMPC-AI-Compliance-Enforcement-Platform

# 2. Backend setup
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# 3. Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```
lmpc-compliance-system/
├── backend/           # FastAPI + SQLite/PostgreSQL
│   ├── app/
│   │   ├── api/       # REST route handlers (auth, scan, reports, portals)
│   │   ├── core/      # Configuration, security, JWT
│   │   ├── db/        # Database models, migrations
│   │   ├── engine/    # OCR + Rule Engine + Font Measurement
│   │   ├── nlp/       # spaCy NER pipelines
│   │   ├── rules/     # Codified LMPC 2011 statutory rules
│   │   └── services/  # Business logic layer
│   └── tests/         # Pytest test suite
├── frontend/          # React 19 + Vite + Tailwind CSS v4
│   └── src/
│       ├── portals/   # 6 role-based portal UIs
│       └── components/# Shared UI components
├── docs/              # Architecture, API reference, rule engine docs
└── dataset/           # Sample packaged commodity label images
```

---

## 🔧 Development Guidelines

### Code Style
- **Python**: Follow PEP 8. Use type hints for function signatures.
- **JavaScript/React**: Use ES6+ syntax. Functional components with hooks.
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat:` — new features
  - `fix:` — bug fixes
  - `docs:` — documentation
  - `chore:` — maintenance
  - `ci:` — CI/CD changes

### Branch Strategy
- `main` — stable, production-ready code
- `dev` — active development branch
- Feature branches: `feat/<feature-name>`

### Testing
```bash
# Run backend tests
cd backend
pytest tests/ -v

# Run frontend build check
cd frontend
npm run build
```

---

## 📝 Submitting Changes

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with descriptive commit messages
4. Ensure all tests pass
5. Submit a Pull Request with a clear description

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).
