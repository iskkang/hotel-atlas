#!/usr/bin/env python3
"""Import chain hotel locations from All the Places (CC0) into data/hotels_atp.json.

All the Places (https://www.alltheplaces.xyz/) publishes weekly, CC0-licensed
point data built from brand store-locator pages. This script reads its
per-spider GeoJSON for the five hotel groups; it never contacts hotel chain
websites itself.

Usage:
  python scripts/import_atp.py                    # download the latest weekly run
  python scripts/import_atp.py --from-dir DIR     # use local <spider>.geojson files

A spider whose new feature count falls below --min-fraction of the count
already in the output file is skipped and its previous records are kept,
so one broken upstream run never wipes a hotel group from the map.
"""
import argparse
import datetime
import json
import math
import pathlib
import urllib.request

LATEST_URL = "https://data.alltheplaces.xyz/runs/latest/output/{spider}.geojson"
SPIDERS = {
    "marriott_hotels": "marriott",
    "ritz_carlton": "marriott",
    "hilton": "hilton",
    "hyatt": "hyatt",
    "ihg_hotels": "ihg",
    "accor": "accor",
}
# marriott_hotels already emits most Ritz-Carlton hotels; drop ritz_carlton
# features that sit within this distance of a Ritz-branded Marriott feature.
RITZ_DUPLICATE_M = 500
OUTPUT = pathlib.Path("data/hotels_atp.json")


def clean(value):
    return value.strip() if isinstance(value, str) and value.strip() else ""


def point(geometry):
    if not geometry:
        return None
    coords = geometry.get("coordinates")
    if geometry.get("type") == "Point" and coords and len(coords) >= 2:
        lon, lat = coords[0], coords[1]
    elif geometry.get("type") in ("Polygon", "MultiPolygon"):
        ring = coords[0] if geometry["type"] == "Polygon" else coords[0][0]
        lon = sum(p[0] for p in ring) / len(ring)
        lat = sum(p[1] for p in ring) / len(ring)
    else:
        return None
    if not (isinstance(lat, (int, float)) and isinstance(lon, (int, float))):
        return None
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    return round(lat, 6), round(lon, 6)


def address(props):
    # Raw All the Places output has addr:* tags; slimmed mirrors have "address".
    full = clean(props.get("addr:full")) or clean(props.get("address"))
    if full:
        return full
    parts = [clean(props.get(k)) for k in ("addr:street_address", "addr:street", "addr:city", "addr:postcode")]
    return ", ".join(p for p in parts if p)


def convert(spider, group, features):
    hotels = []
    for index, feature in enumerate(features):
        props = feature.get("properties") or {}
        name = clean(props.get("name"))
        location = point(feature.get("geometry"))
        if not name or not location:
            continue
        ref = clean(str(feature.get("id") or "")) or clean(str(props.get("ref") or "")) or str(index)
        hotels.append({
            "id": f"atp/{spider}/{ref}",
            "name": name,
            "brand": clean(props.get("brand")),
            "group": group,
            "city": clean(props.get("addr:city")),
            "address": address(props),
            "country": (clean(props.get("addr:country")) or clean(props.get("country"))).upper(),
            "lat": location[0],
            "lon": location[1],
            "url": clean(props.get("website")),
        })
    return hotels


def distance_m(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (a["lat"], a["lon"], b["lat"], b["lon"]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def drop_ritz_duplicates(ritz, marriott):
    anchors = [h for h in marriott if "ritz" in h["brand"].lower()]
    return [h for h in ritz if not any(distance_m(h, a) <= RITZ_DUPLICATE_M for a in anchors)]


def load_features(spider, from_dir):
    if from_dir:
        path = pathlib.Path(from_dir) / f"{spider}.geojson"
        if not path.exists():
            raise FileNotFoundError(path)
        return json.loads(path.read_text(encoding="utf-8")).get("features", [])
    request = urllib.request.Request(LATEST_URL.format(spider=spider), headers={"User-Agent": "hotel-atlas-import"})
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.loads(response.read().decode("utf-8")).get("features", [])


def write(path, payload, hotels):
    # One hotel per line keeps weekly diffs readable.
    head = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))[:-1]
    with path.open("w", encoding="utf-8") as out:
        out.write(head + ',"hotels":[\n')
        for i, h in enumerate(hotels):
            out.write(json.dumps(h, ensure_ascii=False, separators=(",", ":")) + (",\n" if i < len(hotels) - 1 else "\n"))
        out.write("]}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-dir", help="directory of <spider>.geojson files instead of downloading")
    parser.add_argument("--run-date", help="date of the upstream run, recorded in the output (YYYY-MM-DD)")
    parser.add_argument("--min-fraction", type=float, default=0.7)
    parser.add_argument("--output", default=str(OUTPUT))
    args = parser.parse_args()

    out_path = pathlib.Path(args.output)
    previous = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {"hotels": [], "spiders": {}}
    previous_by_spider = {}
    for h in previous.get("hotels", []):
        previous_by_spider.setdefault(h["id"].split("/")[1], []).append(h)

    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    run_date = args.run_date or today
    fresh, spiders_meta = {}, {}
    for spider, group in SPIDERS.items():
        old = previous_by_spider.get(spider, [])
        old_meta = previous.get("spiders", {}).get(spider, {})
        try:
            hotels = convert(spider, group, load_features(spider, args.from_dir))
        except Exception as exc:
            print(f"{spider}: download failed ({exc}); keeping {len(old)} previous records", flush=True)
            fresh[spider] = old
            spiders_meta[spider] = {**old_meta, "stale": True}
            continue
        floor = int(len(old) * args.min_fraction)
        if spider != "ritz_carlton" and len(hotels) < floor:
            print(f"{spider}: {len(hotels)} features is below {floor}; keeping {len(old)} previous records", flush=True)
            fresh[spider] = old
            spiders_meta[spider] = {**old_meta, "stale": True}
            continue
        fresh[spider] = hotels
        spiders_meta[spider] = {"count": len(hotels), "run_date": run_date, "stale": False}
        print(f"{spider}: {len(hotels)} hotels", flush=True)

    if not spiders_meta.get("ritz_carlton", {}).get("stale"):
        before = len(fresh["ritz_carlton"])
        fresh["ritz_carlton"] = drop_ritz_duplicates(fresh["ritz_carlton"], fresh["marriott_hotels"])
        spiders_meta["ritz_carlton"]["count"] = len(fresh["ritz_carlton"])
        spiders_meta["ritz_carlton"]["duplicates_dropped"] = before - len(fresh["ritz_carlton"])

    hotels = sorted((h for group in fresh.values() for h in group), key=lambda h: h["id"])
    if not hotels:
        raise SystemExit("No hotels imported; leaving the existing file untouched")
    payload = {
        "updated_at": today,
        "source": "All the Places (CC0)",
        "source_url": "https://www.alltheplaces.xyz/",
        "spiders": spiders_meta,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    write(out_path, payload, hotels)
    print(f"Wrote {len(hotels)} hotels to {out_path}", flush=True)


if __name__ == "__main__":
    main()
