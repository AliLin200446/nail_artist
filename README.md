# Nail Study

Standalone WebGL nail-painting prototype. Serve `dist/` over HTTP; no build required.

## Production deployment

Production runs at https://nailartist.alilinlab.com on the existing Vercel project `nail_artist` (scope `alilins-projects`). The Vercel Root Directory is the repository root (`.`). Root-level `vercel.json` selects the Other framework preset and publishes `dist/`, whose tracked `index.html` is the homepage. The static files are authored directly: no package installation, compilation, or production environment variables are required. Empty install and build commands intentionally skip those steps.

To validate and deploy with an authenticated Vercel CLI:

```sh
vercel link --yes --project nail_artist --scope alilins-projects
vercel pull --yes --environment=production --scope alilins-projects
vercel build --prod
vercel deploy --prebuilt --prod --scope alilins-projects
```

The build packages the site under `.vercel/output/static/`. Serve that directory over HTTP for local production checks. All application asset paths are relative to the homepage. There are no client-side URL routes, so no SPA catch-all rewrite is needed; unknown paths should return 404. Keep `.vercel/` local and untracked.

## Interaction
- Pick a bottle, then drag on any of ten independently masked nails.
- Brush, liner, dotting tool and cotton swab share the same polish palette.
- Double-click/tap a nail to zoom. Tap the table or press Escape to return.
- Undo with the curved arrow or Command/Ctrl+Z.
- Done clears peripheral tools; Back returns to painting.
- Designs and tools are saved to localStorage on this browser/device.

## Architecture
Three.js is vendored in `dist/vendor/`. Original vector hand contours are drawn into a high-resolution transparent canvas. Ten independent flat nail meshes share the same positions as their blush bases and warm-brown outlines. The pigment shader adds quiet print variation and one small drawn highlight, with no photographic assets, realistic lighting, or curved gloss. Each nail retains its 512 × 512 paint and finish textures and action history. Painting, layering, erasing, undo, sound, close-up, presentation and local persistence use the existing interaction system.

Nail IDs, normalized drawing coordinates and the storage key remain unchanged so existing saved sets survive the visual update. Four illustrated bottles are visible in the tray; the existing additional colors remain accessible by sliding it.

## Prototype boundaries
Hands are a fixed illustrated composition, not articulated anatomy. Selection subtly emphasizes the nail silhouette. Device-local saves do not sync between preview and hosted origins. Painting requires a pointer; keyboard users can select tools and undo. Erasing reveals the natural nail beneath all paint layers.

No templates, random designs, accounts, social features, or AI generation are present in the website.

# nail_artist

## Material lab

Color, material and tool are independent. Ten pigments combine with cream, jelly, pearl, chrome, glitter, magnetic, matte and gloss. A fan brush lays down soft low-opacity pigment; the pick repositions physical objects from the ceramic tray. Existing flat decorations from earlier saved sets remain intact.

`dist/materials.js` owns replayable actions and per-gesture layers. Jelly applies one translucent coat per gesture, rather than saturating from overlapping stamps inside the same gesture. Glitter uses a saved random seed to deposit distinct flakes, so reload and undo recreate exactly the same deposits. Each nail has pigment, region material ID, and detail textures. Lightweight per-nail shader branches produce silk-like pearl, graphic chrome, an interpolated magnetic band, matte pigment and a curved gloss highlight. No environment maps or full-screen material shaders are used.

Saved v1 artwork is migrated into v2 with original pigment values and legacy stroke accumulation. Material, decoration choice, action history, particle seeds, and magnet positions are saved locally. Clean erases pigment and details; undo replays deterministic actions. Browser WebMCP actions use the same layer engine as pointer painting.

### Verification, 2026-10-07

- Oxblood × jelly × brush: the same path increased mean pigment coverage 0.0584 → 0.0983 → 0.1255 across three coats (measurement over the whole 512px texture).
- Silver × chrome × brush: shader compiled without errors; dark/light graphic band visible.
- Moss × magnetic × brush: band position interpolated from -0.0845 toward -1.0, then accepted the opposite target.
- Cream × glitter × fan: repeated deposits accumulated 68 → 136 → 204 flakes. A second sequence using independent seeds accumulated 60 → 120 → 180.
- Tomato × cream × liner: thin path recorded and rendered inside nail geometry.
- Pick × star: one placed decoration; clean removed it; undo restored it.
- Clean on glitter: 204 → 117 retained flakes; undo restored 204.
- Reload restored the same coverage, action counts, glitter and decorations.
- Pearl, matte and gloss rendered without shader errors; invalid nail input rejected before mutation.
- At a 390 × 844 iframe viewport, color, all six tools and all eight material controls fit; exactly one color and one material remained selected.

Mobile layout was checked in a narrow iframe; physical touch-device latency was not benchmarked.

## Physical objects

The lower-edge ceramic dish contains sixteen small objects: three pearls, three studs, two rhinestones, two irregular beads, a star, heart, ring, chain, flower and metal fragment. Tap or drag one onto a nail, then continue placing copies. Escape ends repeat mode; selecting PICK lets you lift an existing object, move it on its nail, or drag it outside to remove it. A chain takes two placements on the same nail. Double-tap a nail to work close up.

With an object selected, wheel or `[` / `]` rotates it. Shift + wheel or `+` / `-` scales it between 0.7× and 1.4×. Two pointers on a lifted object support pinch and twist. DONE hides the dish along with the existing tools and gently increases object lighting.

`dist/charms.js` owns real Three.js geometry, shared materials and geometry, an offscreen-generated reflection environment, instanced chain links, contact shadows, and spring settling. All objects attach to nail mesh coordinates (`nailId`, `u`, `v`, `rotation`, `scale`, `zOffset`, `type`, `material`); chains also store their second endpoint. They render above the paint without changing the illustrated hand artwork or pigment shader. Pearl/gem attraction operates within a three-screen-pixel band. No external charm assets or physics library are used.

All placements and edits join the existing global undo sequence. Version 3 device saves retain both painted actions and physical objects; versions 1 and 2 remain readable. Sets support up to 400 physical objects. The tray reuses the same object meshes, and only rerenders when its hover state or size changes.

### Charm verification

Run `node --test tests/charms.test.mjs` for saved-state validation and v1/v2/v3 compatibility, then `vercel build --prod`. Browser checks covered repeat placement; nail-local transforms across reload and close-up; move, rotate, resize, remove and undo; chain endpoints; a rhinestone inside a ring; paint/object interleaving; and 390 × 844 layout. Pearl spacing snapped to 4.692 world units (the sum of radii plus a 2% gap). Real multitouch hardware has not been benchmarked.
