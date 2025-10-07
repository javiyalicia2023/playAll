# PlayAll Monorepo

PlayAll is a synchronized listening experience for YouTube audio that keeps the host as the source of truth and complies with YouTube's Terms of Service by using the IFrame Player API exclusively on the client.

## Getting started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for Postgres and Redis)

### Installation

```bash
pnpm install
```

### Environment variables

Create an `.env` file in the repo root or supply these variables when running the apps:

- `DATABASE_URL` – PostgreSQL connection string.
- `REDIS_URL` – Redis connection string.
- `SESSION_SECRET` – secret for signing anonymous session cookies.
- `NEXT_PUBLIC_API_URL` – URL of the NestJS API (defaults to `http://localhost:3333/api`).
- `NEXT_PUBLIC_SOCKET_URL` – URL of the Socket.IO server (defaults to `http://localhost:3333`).

See `.env.example` for details.

### Running locally

```bash
pnpm -r dev
```

This command starts both the NestJS API and the Next.js web app in development mode. Postgres and Redis can be started with Docker (see below).

### Building for production

```bash
pnpm -r build
```

### Testing

```bash
pnpm --filter api test
pnpm --filter web test
```

### Database & Redis

Spin up the development services with Docker Compose:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Run Prisma migrations:

```bash
cd apps/api
pnpm prisma migrate dev
```

### Legal notice

This project does not download, transcode, or redistribute any YouTube content. All playback happens through the YouTube IFrame Player API within the browser. The backend only coordinates room state, while video discovery happens client-side through the IFrame Player search playlist capabilities (with an offline-friendly fallback for local development and tests).
