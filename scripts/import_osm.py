#!/usr/bin/env python3
"""Convert a locally supplied OSM PBF extract into a conservative hotel catalog.

Install: pip install osmium
Usage: python scripts/import_osm.py /path/to/region.osm.pbf --output data/hotels.json
No public API calls are made. Only explicitly tagged chain properties are accepted.
"""
import argparse
import datetime
import json
import pathlib
import re
import osmium

GROUPS = {
    "marriott": ["marriott", "jw marriott", "ritz-carlton", "st. regis", "sheraton", "westin", "w hotels", "le méridien", "renaissance", "courtyard", "fairfield", "aloft", "moxy", "residence inn", "autograph collection", "luxury collection", "tribute portfolio"],
    "hilton": ["hilton", "waldorf astoria", "conrad", "doubletree", "hampton", "curio collection", "canopy by hilton", "embassy suites", "lxr hotels"],
    "hyatt": ["hyatt", "andaz", "alila", "thompson hotels"],
    "ihg": ["intercontinental", "holiday inn", "crowne plaza", "hotel indigo", "kimpton", "regent", "six senses", "voco", "staybridge suites"],
    "accor": ["accor", "raffles", "fairmont", "sofitel", "pullman", "swissôtel", "movenpick", "mövenpick", "novotel", "mercure", "ibis"]
}
def normalize(value):
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()
def classify(tags):
    # Brand/operator tags are stronger evidence than the hotel name.
    evidence=" ".join(tags.get(k,"") for k in ("brand","brand:wikidata","operator","operator:wikidata"))
    if not evidence.strip(): return None
    normalized=normalize(evidence)
    found=[]
    for group, terms in GROUPS.items():
        if any(re.search(r"(?<!\w)"+re.escape(normalize(t))+r"(?!\w)",normalized) for t in terms):
            found.append(group)
    return found[0] if len(found)==1 else None
class Collector(osmium.SimpleHandler):
    def __init__(self,limit):
        super().__init__();self.hotels=[];self.limit=limit;self.seen=set()
    def add(self,obj,kind,lat,lon):
        if len(self.hotels)>=self.limit:return
        tags=dict(obj.tags)
        if tags.get("tourism")!="hotel" or not tags.get("name"):return
        group=classify(tags)
        if not group:return
        if not (-90<=lat<=90 and -180<=lon<=180):return
        key=f"{kind}/{obj.id}"
        if key in self.seen:return
        self.seen.add(key)
        self.hotels.append({"id":key,"name":tags["name"],"brand":tags.get("brand",""),"group":group,"city":tags.get("addr:city",""),"country":tags.get("addr:country",""),"lat":round(lat,6),"lon":round(lon,6),"osm_url":f"https://www.openstreetmap.org/{kind}/{obj.id}"})
    def node(self,obj):
        if obj.location.valid():self.add(obj,"node",obj.location.lat,obj.location.lon)
    def way(self,obj):
        if obj.nodes and obj.nodes[0].location.valid():self.add(obj,"way",obj.nodes[0].location.lat,obj.nodes[0].location.lon)
    def relation(self,obj):
        pass # Relation geometries need a dedicated area pipeline.
def main():
    p=argparse.ArgumentParser();p.add_argument("pbf");p.add_argument("--output",default="data/hotels.json");p.add_argument("--limit",type=int,default=20000);a=p.parse_args()
    collector=Collector(a.limit);collector.apply_file(a.pbf,locations=True)
    out=pathlib.Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
    payload={"updated_at":datetime.datetime.now(datetime.timezone.utc).date().isoformat(),"source":"OpenStreetMap (ODbL)","hotels":sorted(collector.hotels,key=lambda h:(h["group"],h["name"],h["id"]))}
    out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Exported {len(collector.hotels)} candidates to {out}")
if __name__=="__main__":main()
