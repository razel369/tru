# ADR 0002 — In-memory stubs over real Supabase in stage 8

## Status

Accepted 2026-07-10 (stage 8).

## Context

Stage 8 needs:
- Auth (sign in / sign out / refresh)
- Household (create, list, invite, accept, revoke)
- Sync outbox (queue, drain, idempotency)
- Conflict detection (terminal events per scheduled dose)

Each module has a swappable backend so we can ship the
client-side state machine without a Supabase project, and
swap to the real backend in stage 8-final without rewriting
the host code.

## Decision

Every module in `src/features/household/` follows the
`swappable backend` pattern. The default implementation is
an in-memory store with a test seam:

```ts
let backend: SomeBackend = inMemoryBackend;
export function __setSomeBackend(next: SomeBackend) { backend = next; }
```

The `__setSomeBackend` function is `__`-prefixed to make it
obvious it is a test seam and not part of the production API.

## Consequences

- Stage 8 commits ship 15 new tests that exercise the
  full state machine without any network or database.
- A real Supabase project replaces one file at a time
  (`makeSupabaseAuth`, `makeSupabaseOutbox`, ...) without
  touching any consumer.
- The app boots and demos fully on the web bundle and the
  test runner.
- The trade-off: stage 8-final still has to write the
  Supabase adapters. There is no partial credit for stage 8
  in production.

## Alternatives considered

- Spin up a local Supabase via Docker from stage 8 onwards:
  rejected because the in-memory test suite is faster and
  catches the same logic bugs. The Supabase adapters are
  integration-only and exercise the same logic.
- Wire to a real Supabase from day one: rejected because the
  AI tooling that built the stages cannot create a Supabase
  project on its own; the engineer who finalises the
  backend integration will write the adapters anyway.
