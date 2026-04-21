# UX Research Platform — CLAUDE.md

Async UX research tool: participants browse a test site inside an iframe while a floating widget records voice responses, ratings, and click events. Admins review sessions in a dashboard.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.3.6 (App Router) |
| UI | React 19.1.2, Tailwind CSS 4 |
| Language | TypeScript 5, strict mode |
| ORM | Prisma 6.9 |
| Database | PostgreSQL (hosted on VPS, port 5433) |
| AI | OpenAI Whisper (`whisper-1`) + GPT-4o-mini |
| Process manager | PM2 (`ux-research` app, port 3001) |
| Reverse proxy | Caddy (`research.srv1362562.hstgr.cloud`) |
| Deploy | rsync → VPS (`root@srv1362562.hstgr.cloud`, key `~/.ssh/vps_hostinger`) |

---

## Architecture

```
/src
├── app/
│   ├── admin/                  # Server components, light theme
│   │   ├── sessions/           # Session list with checkboxes + favorites
│   │   │   ├── [id]/           # Session detail: timeline, audio, click map
│   │   │   └── bin/            # Soft-deleted sessions, 14-day retention
│   │   ├── projects/           # Project list
│   │   └── scenarios/          # Scenario list
│   ├── participant/[projectId]/  # 5-step participant flow, dark theme
│   │   ├── welcome/            # Consent + project intro
│   │   ├── screener/           # Demographics (borough, children, habits)
│   │   ├── task/               # Task briefing card
│   │   ├── test/               # iframe + ResearchWidget overlay
│   │   └── thank-you/          # Completion + email capture
│   └── api/
│       ├── sessions/[sessionId]/
│       │   ├── route.ts        # GET/PATCH/DELETE (soft-delete)
│       │   ├── restore/        # POST: clear deletedAt
│       │   └── transcribe/     # POST: batch Whisper + GPT summary
│       ├── audio/              # POST upload, GET stream
│       ├── events/             # POST batch event log
│       ├── participants/       # POST create
│       ├── projects/[id]/      # GET project + scenario
│       ├── responses/          # POST answer
│       └── cron/purge-trash/   # GET/POST: hard-delete expired bin items
├── components/
│   ├── admin/
│   │   ├── SessionsTable.tsx   # Client: checkboxes, star toggle, delete
│   │   ├── SessionActions.tsx  # Client: star + bin button on detail page
│   │   ├── TranscribeButton.tsx # Client: batch transcription trigger
│   │   ├── TrashTable.tsx      # Client: bin list with restore/purge
│   │   └── ClickMap.tsx        # Client: dot/heatmap on test site URL
│   ├── participant-flow/
│   │   └── ParticipantLayout.tsx # Dark card, logo, progress bar
│   └── research-widget/
│       ├── ResearchWidget.tsx  # Floating panel, minimizable
│       └── StepRenderer.tsx    # Renders each step type
└── lib/
    ├── db/index.ts             # Singleton Prisma client
    ├── audio/index.ts          # AudioRecorder class + uploadAudio()
    ├── event-tracking/index.ts # Client-side buffered event tracker
    ├── scenario-engine/index.ts # parseScenario, getStep, isLastStep
    ├── session-trash.ts        # purgeSession, purgeExpiredTrash
    ├── storage/index.ts        # saveAudioFile, getAudioUrl
    └── types/scenario.ts       # StepType union + step interfaces
```

---

## Database Models

```
Project       id, name, slug (unique), shortCode (unique, e.g. "PU2"),
              description, testSiteUrl, timestamps

Scenario      projectId, name, version, definitionJson (steps array),
              isActive

Participant   projectId, email?, screenerAnswersJson, source, externalId

Session       projectId, scenarioId, participantId?, seqNumber,
              @@unique([projectId, seqNumber])
              status (started|in_progress|completed|abandoned),
              isFavorite, deletedAt (soft-delete), timestamps

Event         sessionId, eventType, pageUrl?, elementSelector?,
              x, y (absolute coords), payloadJson

Response      sessionId, stepId, responseType (rating|text|choice|audio),
              valueJson

AudioAsset    sessionId, stepId, filePath, mimeType, durationSec,
              transcript?, summary?
```

---

## Environment Variables

```
DATABASE_URL              PostgreSQL connection string (port 5433 on VPS)
NEXT_PUBLIC_BASE_URL      Public base URL shown to clients
UPLOAD_DIR                Disk path for audio files (default ./uploads)
OPENAI_API_KEY            Whisper + GPT-4o-mini (server-side only)
CRON_SECRET               Bearer token for /api/cron/purge-trash
```

On VPS: `/opt/ux-research/.env` (add new vars and `pm2 restart ux-research --update-env`)

---

## Projects in DB

| shortCode | Slug | Test site |
|---|---|---|
| PK | pulsekids-research | pulseup.srv1362562.hstgr.cloud |
| PU | pulseup-research | pulseup.me |
| PU2 | pulseup-v2-research | pulseup-v2.srv1362562.hstgr.cloud |
| PU4 | pulseup-v4-research | pulseup.me (production) |

Session codes are stable and survive deletion: `PU2-24`, `PK-3`, etc.

---

## Key Patterns

### Session numbering (race-safe)
`seqNumber` is assigned at creation as `MAX(seqNumber)+1` per project, with up to 5 retries on unique-constraint conflicts (`P2002`). Never reassigned; survives deletions. Displayed as `${shortCode}-${seqNumber}`.

### Soft-delete (Bin)
- `DELETE /api/sessions/[id]` sets `deletedAt = now`
- `?purge=1` flag does an immediate hard-delete
- Bin page at `/admin/sessions/bin` shows days remaining
- VPS crontab runs daily at 04:00: hard-deletes sessions older than 14 days
- `TRASH_RETENTION_DAYS = 14` — constant in `src/lib/session-trash.ts`

### Audio pipeline
1. `MediaRecorder` → WebM/Opus blob
2. `POST /api/audio` → saved to `UPLOAD_DIR/audio/[sessionId]/[stepId]-[ts].webm`
3. Creates `AudioAsset` + `Response` records
4. Admin clicks Transcribe → `POST /api/sessions/[id]/transcribe`
   - Whisper: audio → raw transcript
   - GPT-4o-mini: transcript → 2-3 sentence summary (preserves language)

### Event tracking (client-side)
Buffers up to 20 events or flushes every 3 s. Tracks clicks (with selector + relative coords), scroll depth, page views. Skips widget clicks (`data-rw-widget` attr). `beforeunload` flush.

### Scenario steps
Defined in JSON: `message | button | rating | text_input | audio_prompt | wait_for_time | end`. Widget skips `wait_for_time` steps (hides itself, plays a beep when timer ends). Progress counter only counts `audio_prompt + rating` steps.

### State across participant pages
`sessionStorage` holds `sessionId`, `participantId`, screener answers, and consent flags. Cleared when tab closes.

---

## Deploy Workflow

```bash
# Local build check
cd "ux-research" && npx next build

# Sync + deploy
rsync -az -e "ssh -i ~/.ssh/vps_hostinger" \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude uploads --exclude '.env' \
  ./ux-research/ root@srv1362562.hstgr.cloud:/opt/ux-research/

ssh -i ~/.ssh/vps_hostinger root@srv1362562.hstgr.cloud \
  'cd /opt/ux-research && npm run build && pm2 restart ux-research --update-env'

# Schema changes: run locally first (points at VPS DB), then on VPS
npx prisma db push
npx prisma generate

# Update DB project URLs after domain change (run locally)
npx prisma db seed
```

---

## Code Conventions

- **Server components by default** — client components only when state/events are needed (`"use client"` at top of file)
- **Tailwind for layout** — inline `style={}` for dynamic/brand colours (pink `#e91e63`, purple `#1a1745`, etc.)
- **No auth middleware** — single-tenant; admin route is open. Add auth before making public.
- **API responses** — always `NextResponse.json(...)`, errors include `{ error: string }` with appropriate status code
- **Prisma transactions** for multi-table writes (e.g. session + event creation)
- **Optimistic updates** in client components (star toggle, etc.) — revert on API error
- **`export const dynamic = "force-dynamic"`** on all admin pages and data-fetching API routes
- **No `any`** — use `unknown` with type narrowing, or explicit interfaces
- **Path alias** `@/` maps to `src/`

---

## Current Participant Scenario

`"Weekend activity discovery test v1"` applied to all 4 projects:

```
welcome-task  → message  ("find a morning activity for your child")
continue-1    → button   ("Got it, let's start")
voice-feedback→ audio_prompt (walk us through your thinking, max 120s)
clarity-rating→ rating   (1–10 ease of finding)
end           → end
```

The `wait_for_time` step that used to exist between explore and voice-feedback was removed. The widget appears after the task card, then shows the voice prompt immediately.

---

## Admin URLs (prod)

| Page | URL |
|---|---|
| Sessions list | https://research.srv1362562.hstgr.cloud/admin/sessions |
| Session detail | https://research.srv1362562.hstgr.cloud/admin/sessions/[id] |
| Bin | https://research.srv1362562.hstgr.cloud/admin/sessions/bin |
| Projects | https://research.srv1362562.hstgr.cloud/admin/projects |

---

## Participant URLs (prod)

| Project | Start URL |
|---|---|
| PulseUp V2 (main) | https://research.srv1362562.hstgr.cloud/participant/pulseup-v2-research/welcome |
| PulseUp V4 | https://research.srv1362562.hstgr.cloud/participant/pulseup-v4-research/welcome |
| PulseKids | https://research.srv1362562.hstgr.cloud/participant/pulsekids-research/welcome |
| PulseUp prod | https://research.srv1362562.hstgr.cloud/participant/pulseup-research/welcome |
