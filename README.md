# Hotel Atlas

Static, Netlify-ready hotel discovery MVP, hosted at https://hotelatlas.netlify.app.

## What works
- Search and filter starter brand catalog for Marriott, Hilton, Hyatt, IHG and Accor.
- Browse OSM-sourced hotel candidates on a Leaflet map, filter by group, name and city.
- See an OSM source link per property and required attribution.
- Link to official loyalty program websites.

**Current hotel count starts at zero.** This is intentional: no fabricated hotels or unverified benefits. A real regional OSM extract must be imported before pins appear.

## Import actual hotel data
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
