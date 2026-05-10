# 🛡 Safe Order — Livraison Sécurisée

> Plateforme e-commerce algérienne pour réduire les retours de livraison.

## ⚡ Démarrage Rapide

### Backend (FastAPI + SQLite)
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

L'API est disponible sur **http://localhost:8000/api/docs** (Swagger UI).

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

L'interface est disponible sur **http://localhost:5173**.

---

## 🔑 Comptes de Démo

| Rôle | Email | Mot de passe | Téléphone |
|------|-------|-------------|-----------|
| Admin | admin@safeorder.dz | Admin123! | 0550000000 |
| Marchand | merchant@safeorder.dz | Merchant123! | 0551111111 |
| Marchand 2 | karim@safeorder.dz | Merchant123! | 0553333333 |
| Client | — | OTP: 123456 | 0552222222 |

> 💡 Des boutons de **connexion rapide** sont disponibles sur la page de login.

---

## 📁 Structure

```
Safe-Order/
├── frontend/                    # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── api/                 # Clients API typés
│   │   ├── components/          # UI + Layout
│   │   ├── context/             # AuthContext
│   │   ├── pages/               # 13 pages (Landing, Merchant, Customer)
│   │   └── styles/              # Design system (CSS vanilla)
│   └── package.json
│
├── backend/                     # Python FastAPI
│   ├── app/
│   │   ├── routers/             # 8 routers (40+ endpoints)
│   │   ├── schemas/             # Modèles Pydantic
│   │   ├── services/            # JWT + OTP
│   │   ├── models.py            # 9 tables SQLAlchemy
│   │   ├── seed.py              # Données de démo
│   │   └── dependencies.py      # RBAC middleware
│   └── models/                  # IA: analyse retours + recommandations
│
├── .env                         # Variables d'environnement (SQLite par défaut)
└── .env.example                 # Template de configuration
```

---

## 🎯 Fonctionnalités

### Safe Pay 💳
Système d'acompte simulé (CIB / Dahabia / BaridiMob). Le client paie un % du prix pour confirmer sa commande.

### Safe Track 📍
Suivi en temps réel avec code de suivi. Le client peut ajouter des remarques (détection de dates → alerte D-1).

### Safe Insights 🧠
Analyse IA des retours : 10 causes identifiées, recommandations personnalisées, Trust Score (0-100).

### Pipeline 6 catégories 📦
Confirmation → Préparation → Expédition → Livraison → Livré → Retour

### Smart Badges 🏷️
- **Safe Pay** : acompte payé
- **Fidèle** : client avec 3+ livraisons réussies
- **Risque** : score de risque ≥ 60
- **Nouveau** : première commande

---

## 🔧 Configuration

Copiez `.env.example` vers `.env` et ajustez :

```bash
# SQLite (par défaut — aucune installation nécessaire)
DATABASE_URL=sqlite:///./safeorder.db

# PostgreSQL (production)
# DATABASE_URL=postgresql://user:pass@host:5432/safeorder
```
