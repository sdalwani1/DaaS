# DaaS Purchase Order Receiving

A slice of the DaaS inventory platform: create purchase orders, receive stock against them, and track derived status and on-hand inventory — with real database constraints, a transactional/idempotent receive mutation, and role-guarded access.

Built for the take-home brief, Option 1 (Sprint 2): Purchase order receiving.

## Stack

- **DB:** Postgres 17, Drizzle ORM, migrations checked in
- **API:** Apollo Server 5, TypeScript, JWT bearer auth
- **Web:** Next.js 16 (App Router), MUI 9, Redux Toolkit + RTK Query, react-hook-form + zod

## Setup

Prereqs: Node 24 LTS, pnpm (`corepack enable`), Docker or Podman.

```bash
# 1. Start Postgres
docker compose up -d          # or: podman compose up -d
docker compose ps             # confirm 'db' is healthy

# 2. API
cd api
pnpm install
cp .env.example .env
pnpm drizzle-kit generate     # only needed if you change the schema
pnpm drizzle-kit migrate
pnpm seed                     # inserts sample vendors, products, locations
pnpm dev                      # http://localhost:4000

# 3. Web (separate terminal)
cd web
pnpm install
cp .env.example .env.local
# then edit .env.local and paste in a token from the next step
pnpm dev                      # http://localhost:3000
```

### Getting a token

There's no login screen (out of scope for this slice). Mint a bearer token by role:

```bash
cd api
pnpm mint-token warehouse     # or: admin / viewer
```

Paste the printed token into `web/.env.local` as `NEXT_PUBLIC_DEV_TOKEN`, then restart `pnpm dev` in `web/`. `warehouse` and `admin` can receive stock; `viewer` can only read.

### Demo data

`pnpm seed` (in `api/`) creates 2 vendors, 2 products, 2 locations, so there's something to build a PO against immediately.

## What's in the slice

- Postgres schema: `vendors`, `products`, `locations`, `purchase_orders`, `purchase_order_lines`, `stock_movements` (append-only ledger), `stock_levels` (materialized on-hand)
- Real constraints: foreign keys throughout, `CHECK` constraints preventing over-receipt and negative stock, soft-delete-safe unique indexes
- PO status (`OPEN` / `PARTIAL` / `RECEIVED`) is **derived**, never stored — computed from line quantities on every read
- `receivePurchaseOrder` mutation: runs in a transaction, row-locks the PO lines (`FOR UPDATE`, locked in sorted order to avoid deadlocks), validates against the locked state, and is idempotent per line via a unique `idempotencyKey`
- Role guard: only `warehouse` or `admin` can call `receivePurchaseOrder`, enforced in the service layer, not just the UI
- Web: PO list with a status filter, create form (react-hook-form + zod), inline receive form per line, all data through RTK Query with tag-based cache invalidation, loading/empty/error states on every view, MUI theme (no hardcoded hex values)

## Architecture

api/src/
platform/ auth, db client — no domain knowledge
modules/
purchase-orders/
schema.graphql what the API can be asked
db.ts raw Drizzle queries
service.ts business rules (derived status, role checks, transactions)
resolvers.ts thin GraphQL glue
web/src/
store/ RTK Query setup + one file per API resource
components/ shared UI (ReceiveForm)
app/ routes (App Router)


Each backend module follows **resolver (thin) → service (rules) → db (queries)**. Resolvers never touch SQL and services never touch GraphQL types, so a module can gain a REST endpoint, a worker, or a CLI later without duplicating logic — a Sprint 1 module (vendors/clients sync) or a Sprint 4 module (RMAs) drops into `modules/` the same way, and an outbox+worker pattern (for Jetbuilt/HubSpot/Smartsheet sync) slots in beside `platform/` without touching this one.

### Architecture note: making stock movements transactional and auditable

Every change to inventory is a row in an append-only `stock_movements` ledger, written in the same transaction as the cached `stock_levels.on_hand` update. On-hand is effectively a materialized view of the ledger — it can be reconciled or rebuilt from it at any time. Concurrency is handled with deterministic-order row locks (`FOR UPDATE`, lines locked by sorted id) so two simultaneous receives against the same line can't both read a stale quantity, a `CHECK (on_hand >= 0)` constraint as a last line of defence, and a per-line idempotency key so a retried or double-submitted request can't double-count a delivery.

**Trade-off:** `stock_levels.on_hand` and `purchase_order_lines.qty_received` are denormalized counters — cheap to read and easy to put constraints on, but a second source of truth alongside the ledger. I accepted that in exchange for DB-enforced invariants (can't over-receive, can't go negative) that hold even if application code has a bug. The mitigation is that both counters are only ever written inside the same transaction as their ledger row, so they can't drift from a partial write, and a reconcile query (`sum(qty_delta) per product/location` vs `stock_levels.on_hand`) would be the next thing I'd add to catch drift from any future bug.

**What I'd ship first, next:** this `receive` movement type is done. `adjust` and `transfer` (Sprint 2's remaining movement types) reuse the exact same ledger-write pattern — the same transaction shape, just a different `type` value and, for transfers, two ledger rows instead of one — so they're the next-cheapest addition once this pattern is trusted.

## What I cut, and why

- **No `adjust`/`transfer` movement types, no barcode scanning, no PO editing after creation** — out of scope for one slice in the time budget; the ledger and receive pattern is built so they're additive, not a rework
- **No real login screen** — bearer tokens are minted via a CLI script (`mint-token`) instead; a real login/JWT-issuing endpoint is orthogonal to what this slice is testing
- **UUIDs are `gen_random_uuid()` (random), not UUIDv7** — time-ordered IDs are a nice-to-have for index locality at scale, not correctness; swapping in an app-side UUIDv7 generator later is a one-line change to `schema.ts`
- **Errors are plain `Error`, not typed `GraphQLError` codes** — the API returns clear messages (e.g. "Cannot receive 5, only 4 remaining"), but everything currently surfaces as `INTERNAL_SERVER_ERROR` rather than distinct codes like `FORBIDDEN` or `OVER_RECEIPT`. A client can't yet branch on error type, only read the message.
- **No integration tests against real Postgres** — the receive mutation's correctness (idempotency, over-receipt, role guard) was verified manually against a real Postgres instance via GraphQL requests; automating that into a test suite (compose/testcontainers) is the natural next step
- **No activity log** — who-changed-what isn't tracked separately from `stock_movements.created_by` and `created_at`, which cover the receive path but not, say, PO edits

## GraphQL operations used

See `api/docs/operations.graphql` for the exact queries/mutations exercised in the demo.
