# marriott_hotels: request brand codes containing "W"; emit collection brands

## Problem

The spider builds every two-letter brand code from `"ABCDEFGHIJKLMNOPQRSTUVXYZ"`, which has no `W`. So the JSON files for three brands it already maps are never requested:

| Code | Brand | Wikidata |
|---|---|---|
| JW | JW Marriott Hotels | Q1067636 |
| WH | W Hotels | Q7958488 |
| WI | Westin Hotels & Resorts | Q1969162 |

None of these brands appear in recent output. For example, in the 2026-10-10 run there is no JW Marriott, W or Westin property anywhere, including Dubai, where all three operate.

The spider also drops three Marriott collection brands on purpose (`"ignore"`): Autograph Collection (AK), The Luxury Collection (LC) and Tribute Portfolio (TX).

## Change

1. Iterate over `string.ascii_uppercase`, so codes containing `W` are requested (26 × 26 = 676 requests instead of 625).
2. Map the three collection brands instead of ignoring them, using the brand names and Wikidata IDs from the Name Suggestion Index:
   - AK → Autograph Collection, Q19872869
   - LC → The Luxury Collection, Q2412604
   - TX → Tribute Portfolio, Q92021343

Change 2 reverses an earlier decision ("Continue policy of ignoring collection hotels for now"). If maintainers prefer to keep collection hotels out, change 1 stands on its own and change 2 can be dropped.

## Notes

- No new endpoints; same `pacsys.marriott.com` files the spider already uses, and the existing `DOWNLOAD_DELAY` of 2 s.
- Not run locally against the live site.
