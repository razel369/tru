# PawPair

PawPair is a design-led pet medication tracker for households that share care.
It makes the answer to “did someone already give the medicine?” immediately
visible, while keeping medication schedules, supply, and vet-ready history in
one calm interface.

## Run locally

```bash
npm install
npm start
```

Scan the Expo QR code with a development device, or press `a`/`i` for an
available simulator.

## Quality checks

```bash
npm run typecheck
npm test
```

## MVP

- Unified daily timeline across multiple pets
- Given, skipped, due, upcoming, and missed dose states
- Caregiver-attributed dose confirmation
- Medication supply countdown and refill warnings
- Multi-pet medication profiles
- Adherence and caregiver insights
- Functional add-medication flow
- Local offline persistence

PawPair is a record-keeping tool. It does not recommend medications, alter
dosages, diagnose conditions, or replace veterinary advice.

## Production handoff

The complete product, architecture, design, testing, and App Store completion
plan for the next implementation agent is in
[`docs/AAA-HANDOFF.md`](docs/AAA-HANDOFF.md).
