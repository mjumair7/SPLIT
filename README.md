# Split App - Full-Stack Gym Training Platform

Split is a full-stack workout app where users can design workout splits, log sets, and track personal records over time.

## Tech Stack
- Web: Next.js, TailwindCSS, Recharts
- Mobile: React Native (Expo)
- API: Node.js, Express, Prisma
- Database: PostgreSQL

## Features
- Register/login with JWT auth
- Create and manage multi-day workout splits
- Define exercises, target sets, and rep ranges per split day
- Log workout sessions and sets
- Automatic personal record tracking:
  - Max weight
  - Estimated one-rep max (Epley formula)
- Analytics dashboard for progression trends
- Mobile companion for quick logging and split visibility

## Repository Layout
- `apps/api`: Express + Prisma backend
- `apps/web`: Next.js dashboard
- `apps/mobile`: Expo React Native app
- `docs/INTERVIEW_GUIDE.md`: architecture + interview prep walkthrough
- `docker-compose.yml`: local PostgreSQL

## Local Setup

### 1. Start PostgreSQL
```bash
docker compose up -d
```

### 2. Configure environment
Copy env templates into each app:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Set values in `/Users/mjumair/Split-App/apps/api/.env`:
- `DATABASE_URL`
- `JWT_SECRET` (must be at least 16 chars)
- `PORT`

Set values in `/Users/mjumair/Split-App/apps/web/.env.local`:
- `NEXT_PUBLIC_API_BASE_URL`

Set values in `/Users/mjumair/Split-App/apps/mobile/.env`:
- `EXPO_PUBLIC_API_BASE_URL`

### 3. Install dependencies
```bash
npm install
```

### 4. Generate Prisma client, migrate DB, seed exercises
```bash
npm --workspace apps/api run db:generate
npm --workspace apps/api run db:migrate
npm --workspace apps/api run db:seed
```

### 5. Run apps
```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

- API: `http://localhost:4000`
- Web: `http://localhost:3000`
- Mobile: Expo dev server

## API Endpoints

### Public
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`

### Protected (Bearer token)
- `GET /api/me`
- `GET /api/exercises`
- `POST /api/splits`
- `GET /api/splits`
- `GET /api/splits/:splitId`
- `DELETE /api/splits/:splitId`
- `POST /api/workouts/sessions`
- `GET /api/workouts/sessions`
- `GET /api/analytics/summary`
- `GET /api/analytics/exercise/:exerciseId/progress`

## Core Consistency Checks
- User ownership checks on splits/split days
- Duplicate day prevention inside a split
- Duplicate exercise prevention inside a session
- Sequential set numbering per exercise (`1..n`)
- Exercise existence validation for both split creation and session logging
- Split-day exercise membership enforcement when logging against a specific split day
- PR updates happen transactionally with workout logging

