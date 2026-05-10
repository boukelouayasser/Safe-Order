# Safe Order — Change Log & Hosting Guide

This document records every change made during the fix-up session and explains
how to deploy the FastAPI backend to **Railway** and the React frontend to **Vercel**.

---

## 1. Summary of changes

### Backend (`backend/`)

| File | Change | Reason |
|---|---|---|
| `requirements.txt` | Added `psycopg2-binary` and `gunicorn` | PostgreSQL driver for Railway; production-grade WSGI fallback |
| `app/database.py` | Normalize `postgres://` → `postgresql://` automatically | Railway exposes the legacy URL scheme that SQLAlchemy 1.4+ rejects |
| `app/config.py` | New `CORS_ORIGINS` and `CORS_ALLOW_ALL` settings; `cors_origin_list` helper; longer access-token lifetime; `extra: ignore` so unknown env vars do not crash the app | Production CORS flexibility, robustness against Railway adding extra env vars |
| `app/main.py` | CORS middleware now uses `cors_origin_list` and `allow_origin_regex` for `*.vercel.app`; new `/` root endpoint | Lets the deployed frontend talk to the backend; Railway’s “open” button hits `/` |
| `app/seed.py` | Idempotent re-seed; new `_ensure_test_account()` helper that always creates `test@safeorder.dz / Test1234!` | Stable demo + dedicated test account for QA / Railway smoke tests |
| `app/routers/demo.py` | Added a `test` alias to `quick-login`; surfaced the test account in `/api/demo/accounts` | One-click login for the test account from the frontend |
| `app/routers/payments.py` | Reject `process` if the order has no customer; removed FK-violating `customer_id="anonymous"` fallback | Prevented FK constraint errors on PostgreSQL where the “anonymous” user does not exist |
| `app/routers/feedback.py` | Same FK fix as above for feedback submission | Same reason |
| `app/routers/orders.py` | Customer `fillOrder` now updates an existing customer record’s wilaya/municipality/address | FR-10 (“Info saved for future recognition”) |
| `Procfile` | New (`web: uvicorn ...`) | Railway can detect and run the app |
| `railway.json` | New, with `healthcheckPath: /api/health` | Faster healthchecks + auto-restart |
| `nixpacks.toml` | New, pins Python 3.11 | psycopg2-binary wheels are stable on 3.11 |
| `runtime.txt` | New, `python-3.11.9` | Same as above (belt-and-braces for buildpacks that read this file) |

### Frontend (`frontend/`)

| File | Change | Reason |
|---|---|---|
| `.env`, `.env.example` | Document `VITE_API_URL` | Required for production builds pointing at Railway |
| `src/api/client.ts` | Trim trailing slashes on the base URL; richer error messages (network errors, FastAPI validation arrays) | Better DX, helpful production errors |
| `src/context/AuthContext.tsx` | Added `loginWithTokens` (used by registration and OTP), refreshUser refetches merchant profile cleanly, returns the user from `login`/`quickLogin` | Bug-free post-register navigation |
| `src/pages/Landing.tsx` | Moved `navigate(...)` out of render and into a `useEffect` guarded by `isLoading` | Was triggering React warnings + double-redirects |
| `src/pages/merchant/Login.tsx` | Routes after login based on the actual role + Safe Standards status; new “Pre-fill test account” + “Quick login → Test Account” buttons; clearer error states | Login was always landing on `/merchant/dashboard` even for admin or for merchants with unaccepted standards |
| `src/pages/merchant/Register.tsx` | Phone/password/wilaya validation; uses `loginWithTokens` so the AuthContext re-syncs without a full reload | Removes a guaranteed flash + “redirected to login” after registration |
| `src/pages/merchant/SafeStandards.tsx` | Awaits `refreshUser()` before navigating; replaces history entry | Stops the merchant being bounced back to Safe Standards by the new gate |
| `src/components/layout/MerchantLayout.tsx` | New Safe Standards gate: any merchant with unaccepted standards is redirected to `/merchant/safe-standards` | Implements FR-03 (“Dashboard locked without acceptance”) |
| `src/components/ui/index.tsx` | `Input` now forwards `style` to its wrapper (and adds `inputStyle` for the inner element) | Fixed broken flex layouts where `style={{flex:1}}` was being applied to the inner `<input>` rather than the form-field div |
| `src/pages/customer/Home.tsx` | New page: phone-based identification, order history, wallet summary, tracking-by-code form | Implements FR-12 (Cart) and the entry point for FR-15 (Wallet) |
| `src/pages/customer/TrackOrder.tsx` | Adds the post-delivery feedback form (rating + criteria + comment), pulls existing feedback if any, routes back to the customer hub | Implements FR-14 (Post-Reception Feedback) |
| `src/api/endpoints.ts` | URL-encode tracking codes/phones; nothing else changed | Defence against odd characters |
| `src/App.tsx` | `/customer` now renders `CustomerHome` rather than `TrackOrder` | Distinguishes the hub from the tracker |

### Customer signup / login (added in follow-up)

The customer side previously had no real auth — visitors typed any phone
number into a form and saw the matching orders. That has been replaced with
a proper OTP-based signup/login flow.

| File | Change |
|---|---|
| `app/schemas/auth.py` | `VerifyOTPRequest` now accepts optional `first_name`, `last_name`, `language` so a phone-based signup can carry the customer's name |
| `app/routers/auth.py` (`/otp/verify`) | Refuses to auto-create a customer with a default "Client" name — names are required for signup; existing customers get their info refreshed instead of overwritten with placeholders |
| `app/routers/auth.py` (`GET /api/auth/customer/exists/{phone}`) | New public lookup so the frontend can decide between *signup* (ask for name) and *login* (skip the name fields) |
| `src/api/auth.ts` | `verifyOtp` accepts an `extra` payload (name + language); new `customerExists` helper |
| `src/pages/customer/Login.tsx` | New page — two-step phone → OTP flow, auto-detects signup vs. login, surfaces the demo OTP code (`123456`) when `DEMO_MODE=True` |
| `src/pages/customer/Home.tsx` | Now requires authentication — redirects to `/customer/login` if no session, auto-loads orders + wallet for the logged-in phone, exposes a logout button |
| `src/pages/Landing.tsx` | Already-logged-in customers are redirected to `/customer`; the role card now points to `/customer/login` |
| `src/App.tsx` | New routes `/customer/login` and `/customer/register` (alias) |

End-to-end flow (verified):
1. Click **Client** on the landing → `/customer/login`.
2. Enter phone (`0556001122`) and name (Sarah Test) → "Recevoir le code".
3. The OTP send returns `demo_code: 123456` — shown in a yellow banner under the input.
4. Enter `123456` → tokens are issued, user is created server-side, and the page redirects to `/customer`.
5. The hub page auto-fetches the customer's orders + wallet via the authenticated `/api/tracking/by-phone/...` and `/api/payments/wallet/...` endpoints.
6. Logging out and re-entering the same phone skips the name fields (because `/api/auth/customer/exists/{phone}` returns `{exists: true}`) and goes straight to OTP verification.

### Customer order link / 58 wilayas (follow-up)

The customer-facing order page (`/order/<token>`) used a hard-coded list of 15
delivery companies and a free-text wilaya input. That meant analytics were
corrupted whenever a customer typed "alger", "Alger", "16 - Alger" or "16-Alger"
into the same field. Both fields now come from the backend.

| File | Change |
|---|---|
| `src/pages/customer/OrderPage.tsx` | Rewritten. Loads the 58 wilayas (`/api/auth/wilayas`) and the 15 delivery companies (`/api/auth/delivery-companies`) on mount, renders them as `Select` controls, validates phone format, fully translated via `useT`, pre-fills the form from the logged-in customer's profile (FR-10's "info saved for future recognition"), shows a "📍 Track my order" CTA on the done step |
| `src/pages/customer/PasteLink.tsx` | New page at `/order` (no token). Lets a customer paste the full URL or just the bare 32-hex token; also detects pasted `SO-XXXXXX` tracking codes and routes to `/track/<code>` |
| `src/App.tsx` | New `/order` route → `<PasteLink />` |
| `src/pages/merchant/CreateOrder.tsx` | Adds a one-click **WhatsApp share** button (`wa.me/?text=…` with full product summary + link + tracking code), proper "copied!" feedback (2 s timer with a fallback to `execCommand` for non-HTTPS dev hosts), read-only selectable link input |
| `src/components/ui/index.tsx` | `Select` placeholder now translates via `t('common.select_placeholder')` (was hard-coded "— Sélectionner —") |
| `src/i18n/translations.ts` | New keys for the order, payment, done, paste-link, and create-share flows in fr/en/ar |

End-to-end verification (TestClient):
- `GET /api/auth/wilayas` → 200, **58 wilayas** (`01 - Adrar` → `58 - In Guezzam`)
- `GET /api/auth/delivery-companies` → 200, **15 companies** with slug + `has_api` flag
- Merchant creates order → 201 with `customer_link = http://…/order/<32-hex>`
- Customer pastes the link → `OrderPage` loads order, wilaya + delivery dropdowns populated
- Fill submitted with `delivery_company: 'yalidine'`, `wilaya: '25 - Constantine'` → 200, `safe_pay_amount` calculated, `customer_id` materialised

### Top-level

| File | Change |
|---|---|
| `CHANGES.md` (this file) | New |

---

## 2. Test / Dummy Accounts

The seeder always produces the following accounts on first launch (and re-creates the
test account if it goes missing). Demo mode (`DEMO_MODE=True`) is the default.

| Role | Email | Password | Phone | Notes |
|---|---|---|---|---|
| **Test (recommended)** | `test@safeorder.dz` | `Test1234!` | `0555000000` | Empty pipeline, Safe Standards already accepted |
| Admin | `admin@safeorder.dz` | `Admin123!` | `0550000000` | |
| Merchant | `merchant@safeorder.dz` | `Merchant123!` | `0551111111` | TechStore DZ — populated with 5 sample orders |
| Merchant 2 | `karim@safeorder.dz` | `Merchant123!` | `0553333333` | Fashion Oran |
| Customer | — | OTP `123456` | `0552222222` | Identifies via phone; OTP-only |

Quick login from the merchant Login page:
- “⚡ Connexion rapide — Compte de test” → `POST /api/demo/quick-login/test`
- “🏪 Marchand — TechStore DZ” → `…/quick-login/merchant`
- “⚙️ Admin” → `…/quick-login/admin`

---

## 3. Local development

### Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The Swagger UI is at <http://localhost:8000/api/docs>.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server runs on <http://localhost:5173>. It reads
`VITE_API_URL` from `frontend/.env` (default: `http://localhost:8000`).

---

## 4. Hosting on Railway (backend + database)

> Goal: deploy the FastAPI app + PostgreSQL service on Railway, then point
> the Vercel-hosted frontend at the new public URL.

### 4.1 Create a Railway project

1. Go to <https://railway.app/new> → **Deploy from GitHub repo** → pick the
   `Safe-Order` repository.
2. When asked for a root directory, set it to **`backend`** (Railway will only
   look at `backend/requirements.txt`, `backend/Procfile`, `backend/nixpacks.toml`).
3. Wait for the first build to finish — it will fail if you haven’t added a
   database yet, that’s expected.

### 4.2 Add a PostgreSQL service

1. In the project, click **+ New → Database → Add PostgreSQL**.
2. Open the new Postgres service → **Variables** tab → copy the value of
   `DATABASE_URL` (it starts with `postgres://...`).
3. Open the FastAPI service → **Variables** tab → click **+ New Variable** and
   add a *reference variable* called `DATABASE_URL` pointing at
   `${{ Postgres.DATABASE_URL }}`. (Or paste the URL literally — Railway’s
   `postgres://` scheme is handled automatically by `app/database.py`.)

### 4.3 Required environment variables

Add these on the FastAPI service’s **Variables** tab:

| Key | Example value | Why |
|---|---|---|
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` | Replace SQLite with Railway Postgres |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` | JWT signing key |
| `DEMO_MODE` | `True` (or `False` for prod) | Enables test seed + quick-login |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Allowed CORS origin |
| `CORS_ORIGINS` | `https://staging.example.com` (optional, comma-separated) | Extra origins (PR previews, custom domain, …) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (optional) | 1 day default |

> The CORS layer always includes `https://*.vercel.app` via a regex, so most
> Vercel preview URLs work out of the box.

### 4.4 Trigger a redeploy

After saving env vars, Railway redeploys automatically. When the deployment is
green, click **Settings → Networking → Generate Domain** to expose a public URL
(e.g. `https://safe-order-production.up.railway.app`).

Smoke tests:
- `GET /api/health` → `{"status":"healthy", ...}`
- `GET /api/docs` → Swagger UI
- `POST /api/demo/quick-login/test` → returns access + refresh tokens

> **First boot**: the app calls `Base.metadata.create_all()` and the seed
> functions on startup. The seeded `test@safeorder.dz` account is reachable
> immediately. For long-running production use, switch to Alembic migrations
> (the project already includes `alembic/` and `alembic.ini`).

### 4.5 Point the frontend at Railway

The frontend is wired to `import.meta.env.VITE_API_URL`, so you only need to
flip one variable.

#### Option A — Vercel project (recommended)

1. Open the Vercel project → **Settings → Environment Variables**.
2. Add `VITE_API_URL = https://safe-order-production.up.railway.app`
   (no trailing slash) for **Production** (and optionally **Preview**).
3. Redeploy: **Deployments → ⋯ → Redeploy** (uncheck the build cache).

That’s it — no code change is required; the backend URL is pulled from the
environment at build time.

#### Option B — Hard-coded fallback

If you don’t want to use environment variables on Vercel for some reason, edit
`frontend/.env` (which is committed) and set the production URL there. Vite
will inline the value at build time.

### 4.6 What if I change the Railway URL later?

Update `VITE_API_URL` on Vercel and `FRONTEND_URL` (+ `CORS_ORIGINS` if needed)
on Railway, then trigger a redeploy on each side. No code change is required.

---

## 5. Verifying the fix-ups

```powershell
# Backend imports cleanly
cd backend
venv\Scripts\python.exe -c "from app.main import app; print(len(app.routes), 'routes')"

# Backend boots and seeds
uvicorn app.main:app --port 8000
# → look for: [SEED] Test account ensured: test@safeorder.dz / Test1234!

# Frontend builds with the production URL
cd ..\frontend
$env:VITE_API_URL = "https://safe-order-production.up.railway.app"
npm run build
```

Then visit <http://localhost:5173>, click **Marchand**, choose
**⚡ Connexion rapide — Compte de test** — you should land on the merchant
dashboard with no Safe Standards prompt (it’s already accepted for the test
account).
