# UX Research Platform — MVP

Async UX research platform for task-based usability testing.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
# Using Docker:
docker run --name ux-research-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ux_research -p 5432:5432 -d postgres:16

# Or use your existing PostgreSQL instance
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env if needed (DATABASE_URL, etc.)
```

### 4. Apply database schema

```bash
npx prisma db push
```

### 5. Seed the database

```bash
npm run db:seed
```

### 6. Start dev server

```bash
npm run dev
```

### 7. Open the app

- **Participant flow**: http://localhost:3000/participant/pulsekids-research/welcome
- **Admin dashboard**: http://localhost:3000/admin/projects

## Project Structure

```
src/
  app/
    admin/          — Admin dashboard pages
    participant/    — Participant flow pages
    api/            — API routes
  components/
    research-widget/ — Floating research widget
    participant-flow/ — Shared participant UI
    admin/           — Admin components
  lib/
    db/              — Prisma client
    scenario-engine/ — JSON scenario parser
    event-tracking/  — Client-side event collector
    audio/           — MediaRecorder wrapper
    storage/         — File storage abstraction
    types/           — TypeScript types
prisma/
  schema.prisma     — Database schema
  seed.ts           — Seed script
```

## Tech Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4
- PostgreSQL + Prisma
- MediaRecorder API for audio
