# Development Notes — Income Management App

A running log of commands, setup steps, decisions, and issues encountered during development.

---

## Table of Contents

1. [Environment & Versions](#environment--versions)
2. [Daily Commands (Quick Reference)](#daily-commands-quick-reference)
3. [Sprint 0 — Planning & Environment Setup](#sprint-0--planning--environment-setup)
4. [Sprint 1 — Database Design & Backend Foundation](#sprint-1--database-design--backend-foundation)
5. [Sprint 2 — Authentication & Security Foundation](#sprint-2--authentication--security-foundation)
6. [Sprint 3 — Google Takeout JSON Import](#sprint-3--google-takeout-json-import)
7. [Sprint 4 — Gmail API Integration](#sprint-4--gmail-api-integration)
8. [Known Issues & Fixes](#known-issues--fixes)

---

## Environment & Versions

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v22.11.0 | Managed via nvm for Windows |
| npm | 11.6.2 | |
| Git | 2.47.0 | |
| Docker | 29.1.3 | Docker Desktop for Windows |
| PostgreSQL | 18.3 (latest) | Running in Docker on port **5433** |
| NestJS CLI | 11.x | Installed globally |
| Next.js | 16.2.2 | |
| Prisma | 6.19.3 | |
| Clerk | @clerk/nextjs 7.0.8, @clerk/backend 3.2.4 | |

> **Important:** Node.js v22.11.0 is one patch below Prisma's stated minimum (22.12+) but works fine in practice.

---

## Daily Commands (Quick Reference)

### Start everything for development

```bash
# 1. Start the database (run once, stays running)
docker compose up -d

# 2. Start the API server (in its own terminal)
cd backend/api
npm run start:dev

# 3. Start the web app (in another terminal)
cd apps/web
npm run dev
```

### Stop everything

```bash
# Stop the database
docker compose down

# Stop Node servers — Ctrl+C in their terminals, or:
# Kill all node processes (Windows)
powershell -Command "Get-Process -Name 'node' | Stop-Process -Force"
```

### Database commands

```bash
# Connect to the database directly
docker exec income_db psql -U income_user -d income_db

# List all tables
docker exec income_db psql -U income_user -d income_db -c "\dt"

# Run a new migration after changing schema.prisma
cd backend/api
npx prisma migrate dev --name your_migration_name

# Regenerate Prisma client after schema changes
cd backend/api
npx prisma generate

# Open Prisma Studio (visual DB browser)
cd backend/api
npx prisma studio
```

### Useful URLs (when servers are running)

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API Server | http://localhost:4000 |
| Health Check | http://localhost:4000/health |
| Prisma Studio | http://localhost:5555 |

---

## Sprint 0 — Planning & Environment Setup

### What was done

- Initialized Turborepo monorepo structure manually (create-turbo failed on existing directory)
- Created `package.json` at root with npm workspaces
- Created `turbo.json` for task orchestration
- Created placeholder `package.json` in each app/package
- Set up `.gitignore` (protects .env files, node_modules, build outputs)
- Created `.env.example` (safe template for secrets)
- Wrote `README.md`
- Wrote `USER_STORIES.md`

### Commands run

```bash
# Initialize root package.json
npm init -y

# Install Turborepo
npm install turbo --save-dev
```

### Files created

```
income-management/
├── package.json          ← root monorepo config with workspaces
├── turbo.json            ← Turborepo task config
├── .gitignore
├── .env.example
├── README.md
├── USER_STORIES.md
├── apps/web/package.json
├── apps/mobile/package.json
├── packages/ui/package.json
├── packages/types/package.json
└── backend/api/package.json
```

---

## Sprint 1 — Database Design & Backend Foundation

### What was done

- Set up PostgreSQL in Docker via `docker-compose.yml`
- Initialized NestJS in `backend/api/`
- Installed and configured Prisma ORM
- Designed schema with 4 tables: `User`, `Category`, `Transaction`, `Budget`
- Ran first database migration
- Built `GET /health` endpoint

### Commands run

```bash
# Install NestJS CLI globally
npm install -g @nestjs/cli

# Scaffold NestJS project
cd backend
nest new api --package-manager npm --skip-git

# Start Docker database
docker compose up -d

# Install Prisma
cd backend/api
npm install prisma @prisma/client dotenv

# Initialize Prisma
npx prisma init --datasource-provider postgresql

# Run first migration
npx prisma migrate dev --name init

# Regenerate Prisma client
npx prisma generate
```

### Database tables

| Table | Key Fields |
|-------|-----------|
| `User` | id, clerkId, email, name |
| `Category` | id, name, icon |
| `Transaction` | id, amount, merchant, date, type, source, userId, categoryId |
| `Budget` | id, amount, month, year, userId, categoryId |

### Enums

- `TransactionType`: `DEBIT` / `CREDIT`
- `ImportSource`: `TAKEOUT` / `GMAIL` / `MANUAL`

---

## Sprint 2 — Authentication & Security Foundation

### What was done

- Initialized Next.js 16 in `apps/web/` (TypeScript + Tailwind + App Router)
- Installed and configured Clerk for authentication
- Created sign-in, sign-up, and dashboard pages
- Added `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`)
- Added Clerk JWT guard to NestJS API
- Added Helmet (secure HTTP headers)
- Added CORS (only allows requests from our web app)
- Added ThrottlerModule (rate limiting: 100 req/min per IP)
- Created `PrismaModule` (global DB access)
- Created `POST /users/me` endpoint (auto-creates user on first login)

### Commands run

```bash
# Scaffold Next.js
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes

# Install Clerk in web app
cd apps/web
npm install @clerk/nextjs

# Install security packages in API
cd backend/api
npm install @clerk/backend @nestjs/throttler helmet
```

### Clerk setup

1. Created account at clerk.com
2. Created application named `income-management`
3. Enabled Google as sign-in provider
4. Added keys to `.env` files:
   - `CLERK_SECRET_KEY` — used by backend to verify tokens
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — used by frontend

### API routes added

| Method | Route | Auth Required | Description |
|--------|-------|--------------|-------------|
| GET | `/health` | No | Server health check |
| POST | `/users/me` | Yes (Clerk JWT) | Sync user to DB after login |

---

## Sprint 3 — Google Takeout JSON Import

### What was done

- Installed Multer for file upload handling (in-memory, no disk writes)
- Built `TakeoutParserService` — flexible JSON parser handling multiple Google Takeout field naming variants
- Built `CategorizerService` — keyword-based merchant → category mapping with DB seeding on startup
- Built `ImportService` — saves transactions with upsert (deduplication built-in)
- Built `POST /import/takeout` endpoint — auth required, 50MB limit, JSON only
- Built drag & drop upload UI (`TakeoutUploader.tsx`) with idle/uploading/success/error states
- Added `/import` route to protected routes in `proxy.ts`
- Added "Import Google Takeout" link on dashboard

### Commands run

```bash
# Install Multer
cd backend/api
npm install @nestjs/platform-express multer
npm install -D @types/multer
```

### API routes added

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/import/takeout` | Yes | Upload & import Google Takeout JSON file |

### Files created

```
backend/api/src/import/
├── takeout-parser.service.ts   ← parses raw JSON into clean transaction objects
├── categorizer.service.ts      ← merchant → category lookup + DB seeding
├── import.service.ts           ← saves to DB with deduplication
├── import.controller.ts        ← POST /import/takeout with Multer
└── import.module.ts

apps/web/app/import/
├── page.tsx                    ← import page (server component, auth-protected)
└── TakeoutUploader.tsx         ← drag & drop UI (client component)
```

### Google Takeout JSON — supported field names

The parser handles multiple field naming variants Google uses:

| Data | Field names tried |
|------|------------------|
| Date | `Transaction Date`, `Date`, `Timestamp`, `transactionTime` |
| Merchant | `Paid To`, `Received From`, `Merchant`, `merchant`, `counterparty` |
| Amount | `Amount (INR)`, `Amount`, `amount` |
| Type | `Transaction Type`, `Type`, `type` |
| Description | `Description`, `description`, `note` |

### Auto-categorization keywords

12 categories seeded on startup. Merchant matching uses lowercase substring search.
Examples: `swiggy` → Food & Dining, `uber` → Transport, `amazon` → Shopping.

---

## Sprint 4 — Gmail API Integration

### What was done

- Added Gmail token fields to `User` table (`gmailAccessToken`, `gmailRefreshToken`, `gmailTokenExpiry`, `gmailSyncedAt`)
- Built `EncryptionService` (AES-256-CBC) to encrypt/decrypt tokens before storing in DB
- Built `GmailOAuthService` — generates consent URL, handles callback, saves encrypted tokens, disconnect/revoke
- Built `GmailSyncService` — fetches Google Pay emails from Gmail, parses HTML/text for amount + merchant, saves transactions
- Built `GmailCronService` — runs `@Cron(EVERY_HOUR)` syncing all users with Gmail connected
- Built `GmailController` — GET /gmail/connect, GET /gmail/callback, GET /gmail/status, POST /gmail/sync, DELETE /gmail/disconnect
- Built settings page with connect/disconnect/manual sync UI

### Commands run

```bash
cd backend/api
npm install googleapis @nestjs/schedule
npx prisma migrate dev --name add_gmail_fields
npx prisma generate
```

### Generate ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add output to both `.env` files as `ENCRYPTION_KEY`.

### Google Cloud Console setup

1. Create project at console.cloud.google.com
2. Enable Gmail API (APIs & Services → Library)
3. Create OAuth 2.0 credentials (Web application type)
4. Add redirect URI: `http://localhost:4000/gmail/callback`
5. Configure OAuth consent screen (External, add test users, gmail.readonly scope)

### API routes added

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/gmail/connect` | Clerk JWT | Redirects user to Google consent screen |
| GET | `/gmail/callback` | None (Google redirects here) | Saves tokens, redirects to /settings |
| GET | `/gmail/status` | Clerk JWT | Returns `{ connected: boolean }` |
| POST | `/gmail/sync` | Clerk JWT | Manually triggers Gmail sync |
| DELETE | `/gmail/disconnect` | Clerk JWT | Revokes tokens, deletes from DB |

### Files created

```
backend/api/src/
├── common/
│   ├── encryption.service.ts   ← AES-256-CBC encrypt/decrypt
│   └── common.module.ts        ← Global module
└── gmail/
    ├── gmail-oauth.service.ts  ← OAuth flow + token management
    ├── gmail-sync.service.ts   ← Fetch + parse Gmail emails
    ├── gmail-cron.service.ts   ← Hourly @Cron job
    ├── gmail.controller.ts     ← HTTP routes
    └── gmail.module.ts

apps/web/app/settings/
├── page.tsx                    ← Settings page (server, auth-protected)
└── GmailSettings.tsx           ← Connect/sync/disconnect UI (client)
```

### Known fix — Response type in decorated NestJS controller

**Error:** `A type referenced in a decorated signature must be imported with 'import type'`

**Fix:** Use `import * as express from 'express'` and type parameters as `express.Response` instead of `import type { Response }`.

---

## Sprint 5 — Cash Tracking & Manual Transactions

### What was done
- Added `CashTransaction` model + `CashFlow` / `CashSource` enums to Prisma schema
- Built `/cash` CRUD endpoints (balance, history, add, spend, delete)
- Added manual transaction entry (`POST /transactions`, `DELETE /transactions/:id`)
- Web: `CashCard.tsx` on dashboard, `AddTransactionModal.tsx` on transactions page
- Mobile: `CashSheet.tsx` bottom sheet, orange cash card on home tab, `AddTransactionSheet.tsx`

---

## Sprint 6 — SMS Bank Sync

### What was done
- Built `SmsParserService` — regex extraction of amount, type, UPI ref, ATM detection, merchant
- Two-tier deduplication: UPI ref match → same amount + same calendar day
- `POST /sms/sync` endpoint — receives raw SMS array, returns imported count + ATM transactions
- `GET /sms/last-sync` — returns timestamp (defaults 90 days back if never synced)
- Mobile: SMS sync section in Settings (Android only, guarded with Expo Go warning banner)
- ATM transactions trigger a cash add prompt after sync

---

## Sprint 7 — Savings & Reports

### What was done
- Built Savings module: goals CRUD, progress tracking
- Built Reports module: income/expense summary, category breakdown, monthly trends
- Web: Reports page with charts, Savings page with goal cards and progress bars
- Mobile: Savings tab, Reports tab (hidden from tab bar, linked via dashboard button)
- Dashboard: "📈 View Full Reports" button added to mobile home screen

---

## Sprint 8 — Notes Module

### What was done
- Added `Note` and `NoteImage` models to Prisma schema
- Added `isLocked Boolean` and `passwordHash String?` for password-protected notes
- Installed `bcrypt` in backend for password hashing
- Built `NotesModule` — full CRUD, image upload (stored as bytes in DB), tags, pin, archive, reminder cron
- Lock endpoints: `POST /notes/:id/lock`, `POST /notes/:id/unlock`, `POST /notes/:id/remove-lock`
- Content redacted in list responses when note is locked; full content only returned after password verification

**Web (`apps/web/app/notes/`):**
- `page.tsx` — Notes page with subtle background blobs (power the mirror/glass effect)
- `NotesManager.tsx` — masonry grid, QuickCreateBar, NoteCard, NoteModal, PasswordModal
- Color system: 8 standard colors + **Mirror** (liquid glass using `backdrop-filter: blur(40px) saturate(160%)`)
- react-datepicker (rounded popup) for reminder date/time
- Installed: `react-markdown`, `remark-gfm`, `react-datepicker`

**Mobile (`apps/mobile/app/(tabs)/notes.tsx`):**
- Notes tab added to `_layout.tsx`; Reports hidden from tab bar
- expo-blur `BlurView` for mirror mode native blur
- Color picker with mirror/chrome quadrant dots
- Lock flow: 🔒 on locked cards, password prompt sheet before opening

### Commands run
```bash
cd backend/api
npm install bcrypt @types/bcrypt
npx prisma db push --skip-generate

cd apps/web
npm install react-markdown remark-gfm react-datepicker @types/react-datepicker

cd apps/mobile
npx expo install expo-blur
```

---

## Known Issues & Fixes

---

### Issue 1: `create-turbo` fails on existing directory

**Error:**
```
has 1 conflicting file - please try a different location
```

**Cause:** `create-turbo` won't scaffold into a directory that already has files (our README.md was there from the initial git commit).

**Fix:** Set up Turborepo manually — created `package.json`, `turbo.json`, and folder structure by hand. This is actually better for learning.

---

### Issue 2: PostgreSQL v18 volume mount path changed

**Error:**
```
there appears to be PostgreSQL data in: /var/lib/postgresql/data (unused mount/volume)
```

**Cause:** PostgreSQL 18 (latest) changed the data directory structure. The old mount path `/var/lib/postgresql/data` no longer works. v18 wants the mount at `/var/lib/postgresql`.

**Fix:** Updated `docker-compose.yml`:
```yaml
# Old (broken for v18)
volumes:
  - postgres_data:/var/lib/postgresql/data

# Fixed
volumes:
  - postgres_data:/var/lib/postgresql
```
Also had to wipe the old volume: `docker compose down -v`

---

### Issue 3: Prisma P1000 — Authentication failed (port conflict)

**Error:**
```
Error: P1000: Authentication failed against database server
```

**Cause:** A native PostgreSQL installation was already running on Windows on port 5432. Docker was configured to use the same port. Prisma was connecting to the Windows PostgreSQL (which had different credentials), not our Docker container.

**Discovery:** Running `powershell -Command "Get-NetTCPConnection -LocalPort 5432"` revealed TWO listeners on port 5432 — Docker Desktop and a native `postgres` Windows process.

**Fix:** Changed Docker to use port 5433 instead:
```yaml
# docker-compose.yml
ports:
  - '5433:5432'  # expose on 5433 to avoid conflict
```

Updated `.env`:
```
DATABASE_URL="postgresql://income_user:income_password@127.0.0.1:5433/income_db?sslmode=disable"
```

---

### Issue 4: Prisma `prisma.config.ts` blocking env loading

**Error:**
```
Prisma config detected, skipping environment variable loading.
```

**Cause:** Prisma v6 introduced `prisma.config.ts`. When this file exists, Prisma skips loading `.env` automatically. The config file used a special `env()` function from `prisma/config` that didn't read `.env` files the same way as `process.env`.

**Fix:** Deleted `prisma.config.ts` entirely. The classic approach (`schema.prisma` + `.env`) works perfectly and is simpler.

---

### Issue 5: ESM vs CommonJS conflict with Prisma v6 generator

**Error:**
```
ReferenceError: exports is not defined
```

**Cause:** Prisma v6 introduced a new generator (`provider = "prisma-client"`) that outputs to a local `generated/` folder. NestJS 11 runs with `module: nodenext` (ESM). The generated client used CommonJS `exports` syntax but was being loaded as an ES module.

**Fix:** Switched back to the classic Prisma generator in `schema.prisma`:
```prisma
# Old (Prisma v6 new generator — caused ESM/CJS conflict)
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

# Fixed (classic generator — outputs to node_modules/@prisma/client)
generator client {
  provider = "prisma-client-js"
}
```
Import in code:
```typescript
import { PrismaClient } from '@prisma/client';  // standard, works everywhere
```

---

### Issue 6: `middleware.ts` deprecated in Next.js 16

**Warning:**
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**Cause:** Next.js 16 renamed `middleware.ts` to `proxy.ts`.

**Fix:** Renamed the file:
```bash
mv apps/web/middleware.ts apps/web/proxy.ts
```

---

### Issue 7: `SignedIn` / `SignedOut` removed in Clerk v7

**Error:**
```
Module '"@clerk/nextjs"' has no exported member 'SignedIn'
```

**Cause:** Clerk v7 removed the `<SignedIn>` and `<SignedOut>` components and replaced them with the `<Show>` component.

**Fix:**
```tsx
// Old (Clerk v6 and below)
<SignedOut><SignInButton /></SignedOut>
<SignedIn><Link href="/dashboard" /></SignedIn>

// Fixed (Clerk v7)
<Show when="signed-out"><SignInButton /></Show>
<Show when="signed-in"><Link href="/dashboard" /></Show>
```

---

### Issue 8: `ClerkClient.verifyToken` doesn't exist in `@clerk/backend` v3

**Error:**
```
Property 'verifyToken' does not exist on type 'ClerkClient'
```

**Cause:** In `@clerk/backend` v3, `verifyToken` is a standalone exported function, not a method on the `ClerkClient` instance.

**Fix:**
```typescript
// Old (broken)
import { createClerkClient } from '@clerk/backend';
const clerk = createClerkClient({ secretKey: '...' });
await clerk.verifyToken(token);

// Fixed
import { verifyToken } from '@clerk/backend';
await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
```

---

### Issue 9: `nest new` fails if `package.json` already exists in target directory

**Error:**
```
Error: A merge conflicted on path "/api/package.json"
```

**Cause:** We had created a placeholder `package.json` in `backend/api/` during Sprint 0. The NestJS scaffolder can't overwrite it.

**Fix:** Delete the placeholder before scaffolding:
```bash
rm backend/api/package.json
cd backend
nest new api --package-manager npm --skip-git
```

---

## Environment Files Reference

### `backend/api/.env`
```
DATABASE_URL="postgresql://income_user:income_password@127.0.0.1:5433/income_db?sslmode=disable"
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### `apps/web/.env.local`
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_API_URL=http://localhost:4000
```

> Never commit `.env` or `.env.local` files. They are protected by `.gitignore`.
