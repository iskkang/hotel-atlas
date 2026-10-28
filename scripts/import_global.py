#!/usr/bin/env python3
"""Incremental, multi-continent OSM import. Only trusted Geofabrik extracts."""
import argparse
import datetime
import json
import pathlib
import subprocess
import tempfile
import urllib.request
from import_osm import Collector

# Regional batches avoid attempting a planet-scale PBF on a GitHub runner.
REGIONS = {
    "europe": ["europe/germany", "europe/france", "europe/united-kingdom", "europe/italy", "europe/spain", "europe/switzerland"],
    "asia": ["asia/south-korea", "asia/japan", "asia/taiwan", "asia/thailand", "asia/singapore", "asia/malaysia"],
    "americas": ["north-america/us/new-york", "north-america/us/california", "north-america/canada/ontario", "south-america/brazil/sudeste", "south-america/argentina"],
    "africa-oceania": ["africa/south-africa", "africa/egypt", "australia-oceania/australia/new-south-wales", "australia-oceania/australia/victoria", "australia-oceania/new-zealand"],
}
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--region",choices=["all",*REGIONS],default="all")
    args=parser.parse_args()
    target=pathlib.Path("data/hotels.json")
    existing=json.loads(target.read_text(encoding="utf-8"))
    by_id={h["id"]:h for h in existing["hotels"]}
    regions=REGIONS if args.region=="all" else {args.region:REGIONS[args.region]}
    succeeded=0
    for region,extracts in regions.items():
        for name in extracts:
            url=f"https://download.geofabrik.de/{name}-latest.osm.pbf"
            print(f"Importing {name}",flush=True)
            try:
                with tempfile.TemporaryDirectory() as tmp:
                    pbf=pathlib.Path(tmp)/"extract.osm.pbf"
                    subprocess.run(["curl","--fail","--location","--retry","2","--max-time","600","--silent","--show-error","--output",str(pbf),url],check=True,timeout=650)
                    collector=Collector(200000)
                    collector.apply_file(str(pbf),locations=True)
                    for h in collector.hotels:
                        if not h["country"]: h["country"]=name.split("/")[-1].replace("-"," ").title()
                        by_id[h["id"]]=h
                    print(f"  Found {len(collector.hotels)} candidates",flush=True)
                    succeeded+=1
            except Exception as exc:
                print(f"  Skipped {name}: {exc}",flush=True)
    if succeeded==0: raise SystemExit("No extracts imported successfully")
    target.write_text(json.dumps({"updated_at":datetime.datetime.now(datetime.timezone.utc).date().isoformat(),"source":"OpenStreetMap (ODbL)","hotels":sorted(by_id.values(),key=lambda h:(h["group"],h["name"],h["id"]))},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Imported {succeeded} extracts, total {len(by_id)} hotel candidates",flush=True)
if __name__=="__main__": main()
