# Hotel Atlas

Static, Netlify-ready hotel discovery MVP, hosted at https://hotelatlas.netlify.app.

## What works
- Search and filter starter brand catalog for Marriott, Hilton, Hyatt, IHG and Accor.
- Browse about 31,000 chain hotels on a Leaflet map, filter by group, name and city.
- Hotel data comes from two open sources: All the Places (CC0) and OpenStreetMap (ODbL). OSM records within ~150 m of an All the Places hotel from the same group are merged in the browser.
- Each property links to its official chain page (All the Places) or its OSM source.
- Link to official loyalty program websites.

No fabricated hotels or unverified benefits: every pin comes from one of the two open datasets.

## Import hotel data

### All the Places (main source)
- `data/hotels_atp.json` holds Marriott, Hilton, Hyatt, IHG and Accor hotels from the weekly [All the Places](https://www.alltheplaces.xyz/) run (CC0, no attribution required; credited anyway).
- GitHub Actions → **Import All the Places hotels** refreshes it every Tuesday, or on demand. It downloads the latest per-spider GeoJSON; it never contacts hotel chain websites.
- A spider whose new count drops below 70% of the current file is skipped and its previous records are kept.
- Local run: `python scripts/import_atp.py` (or `--from-dir DIR` with `<spider>.geojson` files).
- Seeded from the 2026-10-10 run (Hilton from 2026-08-29).
- Known gap: upstream Marriott data is missing JW Marriott, W Hotels and Westin (a spider bug) and Autograph Collection, The Luxury Collection and Tribute Portfolio (excluded by policy). A fix for All the Places is ready in `docs/upstream/` (patch + PR text) and still needs to be submitted to `alltheplaces/alltheplaces`; the weekly import picks it up once merged.

### OpenStreetMap (supplement)
1. Open GitHub Actions → **Import OSM hotel extract (manual)** → Run workflow.
2. Supply an HTTPS regional `.osm.pbf` URL from https://download.geofabrik.de/ (start with a small region).
3. The workflow downloads that extract, conservatively matches properties using OSM brand/operator tags, and commits `data/hotels.json` to `main`.
4. Netlify automatically deploys the changed JSON file if Git integration is enabled.

Alternatively: `pip install osmium==4.0.2` and `python scripts/import_osm.py /path/to/region.osm.pbf`.

**Coverage limitations:** OSM tags can be incomplete, inconsistent or stale; classification is conservative and may miss many hotels. The script skips relations and uses the first node of ways as an approximate marker, not an exact centroid. Output is *candidates*, not verified official chain inventory. Regional imports merge by OSM object ID, and do not delete old records; later validation and reconciliation are required. For very large extracts use a dedicated data pipeline rather than GitHub Actions.

## Netlify
- Import repository `iskkang/hotel-atlas`, branch `main`.
- Publish directory: `.`
- Build command configured in `netlify.toml`.
- No secrets needed for this static stage.

## Licensing and access
- OpenStreetMap data © OpenStreetMap contributors, ODbL. Attribution is displayed. Evaluate ODbL share-alike and derived database obligations before commercial publication.
- Data is sourced from downloadable regional extracts, **not** live queries to public Overpass servers.
- OpenStreetMap's public tile server has its own usage policy; replace it with a suitable hosted tile provider before meaningful production traffic.
- Do not scrape hotel chain sites in violation of their terms.
- No hotel prices, guaranteed member benefits or official booking links are claimed.

## Next steps
Expand extraction coverage, verify brands against official sources, add property-level evidence tracking, source confidence and data refresh governance.
