# RainTank

RainTank is an offline-first rainwater harvesting planner for iOS and Android.
It models monthly roof catchment, tank storage, overflow, shortfall, and annual
demand reliability in metric or imperial units.

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

## Calculation model

Monthly captured water is:

`roof area × rainfall depth × roof runoff coefficient`

The app then applies a monthly water balance: incoming water is added to the
current tank level, storage is capped at tank capacity, and monthly demand is
removed. Overflow and unmet demand are tracked separately. The suggested tank
capacity uses a bounded search for a 95% annual demand target.

Monthly averages are appropriate for early feasibility only. Detailed system
design should use multi-year daily rainfall records and qualified local advice.
