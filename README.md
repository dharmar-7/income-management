# Income Management App

A cross-platform (web + mobile) personal finance app that imports Google Pay transaction data, tracks budgets, and provides spending analytics.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js (React) |
| Mobile Frontend | React Native + Expo |
| Backend / API | NestJS (Node.js) |
| Database | PostgreSQL + Prisma ORM |
| Authentication | Clerk (Google OAuth) |
| Monorepo | Turborepo |
| Hosting (Web) | Vercel |
| Hosting (API + DB) | Railway |
| Hosting (Mobile) | EAS (Expo) |

---

## Monorepo Structure

```
income-management/
├── apps/
│   ├── web/          ← Next.js web app
│   └── mobile/       ← Expo mobile app
├── packages/
│   ├── ui/           ← Shared UI components
│   └── types/        ← Shared TypeScript types
└── backend/
    └── api/          ← NestJS REST API
```

---

## Getting Started

### 1. Install dependencies

Make sure you have Node.js (v20+), Git, and Docker installed.

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in the values in `.env` (database URL, Clerk keys, Gmail API keys, etc.)

### 3. Start the database

```bash
docker-compose up -d
```

### 4. Run database migrations

```bash
cd backend/api
npx prisma migrate dev
```

### 5. Start the development servers

You can run everything together or individually:

**All at once (via Turborepo):**
```bash
npm run dev
```

**Or run each service individually:**

```bash
# Terminal 1 — Backend API (http://localhost:4000)
cd backend/api
npm run start:dev

# Terminal 2 — Web App (http://localhost:3000)
cd apps/web
npm run dev

# Terminal 3 — Mobile App (Expo Go)
cd apps/mobile
npx expo start --clear

# Mobile with tunnel (if phone is on different network)
npx expo start --clear --tunnel
```

### 6. Mobile app on a physical device

1. Install **Expo Go** from Play Store / App Store
2. Make sure your phone and PC are on the **same WiFi** (or use `--tunnel`)
3. Scan the QR code shown in the terminal
4. If the API isn't reachable from the phone, expose it via ngrok:
   ```bash
   ngrok http 4000
   ```
   Then update `apps/mobile/.env` with the ngrok URL:
   ```
   EXPO_PUBLIC_API_URL=https://your-id.ngrok-free.app
   ```

---

## Environment Variables

See [.env.example](.env.example) for all required variables and descriptions.

**Never commit `.env` to Git.** It contains secrets.

---

## Sprint Plan

This app is being built sprint by sprint, learning the full SDLC:

| Sprint | Focus |
|--------|-------|
| 0 | Planning & Environment Setup |
| 1 | Database Design & Backend Foundation |
| 2 | Authentication & Security Foundation |
| 3 | Google Takeout JSON Import |
| 4 | Gmail API Integration |
| 5 | Transaction Dashboard (Web) |
| 6 | Budgeting & Goals |
| 7 | Mobile App |
| 8 | Reports & Export |
| 9 | Testing |
| 10 | Security Hardening |
| 11 | Deployment & CI/CD |
| 12 | Monitoring & Maintenance |
