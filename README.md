# Hotel Atlas

Independent global hotel-brand and loyalty discovery project.

## Current status
This repository contains a deployable **static MVP**, not a complete hotel database. It has a searchable starter catalog of five hotel groups and links to their official loyalty programs. No real-time rates, hotel-specific benefits, or verified property inventory are currently available.

## Netlify
1. Netlify → Add new project → Import an existing project → GitHub.
2. Select `iskkang/hotel-atlas`.
3. Build command: `echo 'Static Hotel Atlas site ready'`
4. Publish directory: `.`
5. Deploy. Netlify reads `netlify.toml` automatically.

## Roadmap
1. Validate hotel-group/brand master against official directories.
2. Import licensed OpenStreetMap-derived hotel data, with attribution and ODbL compliance.
3. Resolve hotel identities and duplicate candidates.
4. Add evidence-backed benefits and promotions (source URL, last checked, confidence, exceptions).
5. Schedule permitted data refreshes via GitHub Actions; never bypass site access restrictions.
6. Add a real database and server-side search when property data warrants it.

## Security
Never commit API tokens, credentials, or secrets. Use Netlify environment variables and GitHub Actions secrets. Do not scrape hotel sites contrary to their terms.

## Data note
Brand names and loyalty program names belong to their respective owners. Starter brand catalog is illustrative and not guaranteed complete.
