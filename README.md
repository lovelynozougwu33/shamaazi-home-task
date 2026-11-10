# Donations platform API

Hi — this is the take-home backend for donor enrolment, one-off and recurring donations, and simulated card/DD-style charging. I optimised for **clear state transitions**, **retry behaviour you can reason about**, and **products as data** so new SKUs do not need core code changes.

## Run it locally

**Prerequisites:** Node 18+, PostgreSQL 13+ (for `gen_random_uuid()`), Docker optional.

1. Copy `.env.example` to `.env` and adjust `DATABASE_URL` if needed.
2. Start Postgres. With Docker: `docker compose up -d` (maps `5432` and creates `shamaazi_dev`).
3. Install dependencies:

```bash
npm install
```

4. Run migrations:

```bash
npm run db:migrate
```

5. Run seeders:

```bash
npm run db:seed
```

6. Start the dev server:

```bash
npm run dev
```

`GET /health` should return `{ "ok": true }`. The worker runs on an interval (default 15s) to materialise recurring schedules into donation rows and to charge anything due.

**Swagger UI:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs) (adjust port if `PORT` differs). OpenAPI JSON: `GET /openapi.json`.

Production-style: `npm run build` then `npm start`.

## API (quick reference)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness |
| `POST` | `/donors` | Register `{ name, email }` |
| `GET` | `/donors/:donorId/donations` | List donations with product, amounts, status, dates |
| `GET` | `/products` | List products |
| `POST` | `/products` | Add a product `{ code, name, description? }` (data-only; no deploy) |
| `POST` | `/donations/one-off` | `{ donorId, productId, amountGbp, scheduledAt? }` — omit `scheduledAt` to run immediately |
| `POST` | `/donations/recurring` | Weekly: `{ donorId, productId, amountGbp, frequency: "weekly", dayOfWeek: 0–6 }` (Sun–Sat). Monthly: `frequency: "monthly", dayOfMonth: 1–28` |

Amounts are **GBP** as numbers in JSON; stored as `DECIMAL` in the database.

## Unit tests

Run unit tests with:

```bash
npm test
```

For watch mode while developing:

```bash
npm run test:watch
```

Current tests cover scheduling helpers and donation processor policy constants/date logic. A successful run looks like:
- `Test Files  2 passed`
- `Tests  12 passed`

## What I decided

- **ORM & migrations:** Sequelize with CLI migrations and seeders so schema changes stay explicit and reviewable in Git.
- **State machine:** Donations use `scheduled → processing → succeeded | failed`. Retries **return to `scheduled`** with a new `scheduled_at` and an incremented `attempt_count`, so the four named states stay honest and you never see a fake `failed` while a retry is still planned. Terminal `failed` means we exhausted attempts.
- **Retries:** Up to **five** charge attempts per donation, with backoff roughly **1m → 5m → 30m → 2h → 6h** (tunable in code). I preferred a small fixed table over pure exponential so behaviour is predictable in ops.
- **Stuck `processing`:** If a worker dies mid-charge, rows left in `processing` for longer than **15 minutes** are treated as a failed attempt (same retry rules). That is a simple safety net until you add outbox/idempotency keys with a real PSP.
- **Recurring giving:** A `recurring_schedules` row holds the rule and `next_scheduled_at`. When that time passes, the worker **creates a child `donations` row** (type `recurring`) and advances the schedule. Each charge is therefore auditable as its own donation.
- **Weekly / monthly:** Weekly uses JavaScript weekday numbering (0 = Sunday … 6 = Saturday). Monthly uses day-of-month **1–28** so we avoid “Feb 31” ambiguity; that trade-off is called out here on purpose.
- **Payments:** `PaymentProvider` is a thin interface; `SimulatedPaymentProvider` injects configurable random failures so you can watch retries without Stripe. Swapping in HTTP calls later should not touch the donation lifecycle code.
- **Products:** Seeded two real-ish rows (`schools-build`, `emergency-relief`). Adding more via `POST /products` only touches data.

## What I deliberately left out

- **Auth / admin roles** — public endpoints as per “API is sufficient”; I’d gate `POST /products` and add donor auth next.
- **Idempotency keys & PSP webhooks** — required for production money movement; the interface is ready, the wiring is not.
- **Time zones** — timestamps are stored in UTC; a UK live system would likely use `Europe/London` for “every Friday” semantics.
- **Observability** — structured logs, metrics, and dead-letter queues for poison messages would be the next hardening step.

## What I’d tackle next (in order)

1. **Stripe (or GoCardless) adapter** behind `PaymentProvider`, with idempotency keys on `donationId` + attempt number.
2. **Separate worker process** (or Lambda) from the API so web and charging scale independently, plus a proper queue (SQS) if volume grows.
3. **Cancellation / amount changes** on recurring schedules and donor-facing history pagination.

If anything here feels wrong for your domain (e.g. monthly edge cases), I’d rather adjust the model early than paper over it in the worker.
