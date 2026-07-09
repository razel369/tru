# Market research: RainTank

Research date: July 2026

## Decision

Build a focused **rainwater harvesting and tank sizing calculator**. App Store
ranking cannot be guaranteed: ranking varies by storefront, language, query,
conversion, retention, rating velocity, and competition. The practical target
is to rank for narrow, high-intent phrases in multiple localized storefronts.

## Why this niche

- Dedicated App Store competition is small. The closest apps found were
  Rainfall Calculator, Rain Harvest, Rain Harvesting, and Water BoD-I-Y
  Calculator. Public rating footprints were very small, and most products
  offered either a one-event/annual volume calculator or a broad collection of
  water tools.
- Existing calculators commonly use simplistic annual estimates. RainTank
  differentiates with a 12-month water-balance model showing storage, overflow,
  shortage, and demand reliability.
- The same deterministic, offline product works across climates and languages.
  It avoids accounts, proprietary hardware, subscriptions, and regulated
  medical interpretation.
- The problem has clear global relevance for gardeners, homesteaders,
  off-grid households, property owners, and early-stage system planning.

## Initial search positioning

Primary English phrases:

- rainwater harvesting calculator
- rainwater tank calculator
- rain catchment calculator
- cistern size calculator
- roof rainwater calculator

Initial App Store title and subtitle direction:

- Name: `RainTank: Harvest Planner`
- Subtitle: `Rainwater Tank Calculator`

Localization priorities:

1. Spanish: `calculadora captación agua lluvia`
2. Brazilian Portuguese: `calculadora captação água da chuva`
3. German: `Regenwasser Rechner`
4. French: `calculateur récupération eau de pluie`

Metadata must be validated against the final 30-character App Store limits and
tested per storefront before release.

## MVP differentiation

- Metric and imperial units
- Four roof surfaces with visible runoff assumptions
- Editable 12-month rainfall profile
- Monthly tank balance, overflow, shortage, and annual demand reliability
- Suggested capacity for a 95% annual demand target
- Offline saved plans
- Explicit planning disclaimer

## Evidence and methodology

The standard catchment relationship is `volume = area × rainfall × runoff
coefficient`. Monthly water balance adds captured water to current storage,
caps it at tank capacity, subtracts demand, and records overflow and shortage.

Sources consulted:

- Texas Water Development Board, *The Texas Manual on Rainwater Harvesting*:
  https://www.twdb.texas.gov/publications/brochures/conservation/doc/RainwaterHarvestingManual_3rdedition.pdf
- Rahman et al., tank sizing and yield-after-spillage modeling:
  https://cs-people.bu.edu/papon/pdfs/2017_STK_MTIP.pdf
- Apple listing, Rainfall Calculator:
  https://apps.apple.com/us/app/rainfall-calculator/id1446150880
- Apple listing, Rain Harvest:
  https://apps.apple.com/us/app/rain-harvest/id322055663
- Apple listing, Water BoD-I-Y Calculator:
  https://apps.apple.com/us/app/water-bod-i-y-calculator/id6749874589

Apple does not publish organic keyword volume or keyword difficulty. App counts
and ratings are therefore competition signals, not proof of demand. Before a
paid launch, validate each keyword with a localized landing page and a small
Apple Search Ads discovery campaign.
