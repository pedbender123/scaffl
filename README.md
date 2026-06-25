# Scaffl — Self-Hosted AI Education Platform

Scaffl is an open-core, self-hostable platform for AI-powered education. It lets you deploy AI tutors (personas), a simulation lab, and a classroom management system using your own API keys — no subscription, no data leaving your server.

> **Status:** early public release — Onda 1 (separation & hygiene). Core features are stable; the admin UI for provider management is in active development.

---

## Features

- **AI Personas / Mural** — build custom AI tutors with pedagogical documents and disciplina context
- **Lab (Simulation Builder)** — students and teachers create interactive HTML simulations via AI agent
- **Classroom (AVA)** — activities, notifications, and classroom management
- **BYOK** — bring your own Gemini, OpenAI-compatible, or Anthropic key; keys are stored AES-256-GCM encrypted at rest
- **Multi-provider** — switch between Google Gemini, Anthropic Claude, or any OpenAI-compatible endpoint from the admin panel
- **Security suite** — built-in penetration test runner (`Admin → Security`)
- **SQLite** — zero-dependency database, runs anywhere

---

## Quick Start

### Prerequisites
- Node.js 20+
- A Gemini API key (or any supported provider key)

### 1. Clone & install

```bash
git clone https://github.com/your-org/scaffl.git
cd scaffl
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Random string ≥ 32 chars |
| `SCAFFL_MASTER_KEY` | Yes (for admin UI keys) | 32-byte base64 key |
| `SUPER_ADMIN_EMAIL` | Yes | Admin account email |
| `ADMIN_PASSWORD` | Yes | Admin account password |
| `GEMINI_API_KEY` | Yes (or set via UI) | Google Gemini API key |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # SCAFFL_MASTER_KEY
```

### 3. Run

```bash
# Development (hot-reload)
npm run dev

# Production
npm run build
npm start
```

The server runs on port `3001` by default. The React client runs on `3000` in development, or is served from the server in production.

---

## Provider Management (BYOK)

You can configure API keys in two ways:

1. **Environment variables** (`.env`) — simplest, always works as a fallback
2. **Admin UI** (`/settings → Inteligência Artificial`) — keys are encrypted with AES-256-GCM using `SCAFFL_MASTER_KEY` and stored in SQLite. Supports Google, Anthropic, and any OpenAI-compatible endpoint.

The DB credential takes priority over the env var when both are set.

---

## Docker

```bash
docker compose up --build
```

See [docker-compose.yml](docker-compose.yml) for volume mounts and environment variable wiring.

---

## Self-Hosted vs Cloud

`DEPLOYMENT_MODE=selfhosted` (default) removes all billing/credit-limit enforcement — you pay your own API bills directly. `DEPLOYMENT_MODE=cloud` enables per-user credit tiers for multi-tenant SaaS use.

---

## License

[MIT](LICENSE) © 2025 Pedro Bender
