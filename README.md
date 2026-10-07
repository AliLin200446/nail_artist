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
Three.js is vendored in `dist/vendor/`. Original vector hand contours are drawn into a high-resolution transparent canvas. Ten independent nail meshes share anchored blush bases and warm-brown outlines. Natural nails preserve the illustrated appearance; extensions add curved geometry and subtle gel reflections. Each nail uses a 512 × 1536 paint, finish and detail surface: original artwork stays in its original rows while extension adds drawable space. Painting, layering, erasing, undo, sound, close-up, presentation and local persistence use the existing interaction system.

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

## Transfer stamper

The seventh physical tool is a silicone nail stamper. Select it and press a designed nail to load its surface imprint, then press other nails to transfer it repeatedly. The miniature design stays visible in the tool head. Matching left/right fingers mirror automatically; other transfers preserve orientation. `M`, or another tap on the active loaded stamper, flips that default. Select CLEAN and tap the loaded stamper to wipe it; tapping the now-empty stamper selects it for a new capture.

Each press takes 260 ms, with contact at 43% of the motion and an 8% head compression. A transfer adds one shared-undo action at contact; capture adds none. Charms are independent objects and are never included. Overview presses center the full-nail composition; close-up offset presses shift it by at most 24% of UV space. DONE hides the stamp with the existing tools.

`dist/transfer.js` stores immutable surface recipes shared by transferred layers, including references to earlier stamps when recapturing a stamped nail. `dist/materials.js` replays recipes in normalized nail coordinates with footprint aspect correction, then composites an isolated coat. Initial brush/fan coats are treated as the base; subsequent drawing remains decorative. Existing recipient bases are preserved, while erased bases can receive a fresh one. Source erasures only cut the isolated imprint, never the recipient's artwork. A 0.35-texture-pixel blur gives wet transfers a slight edge softness. Compiled imprints are cached for rapid repetition. Version 4 saves retain the loaded tool and only the recipes still needed by the set; older saves remain readable.

### Stamp verification

- `node --test tests/*.test.mjs`: saved-state compatibility, mirror defaults/override, immutable capture, base policy, offsets, dependency ordering and invalid recipe rejection.
- Serve the repository over local HTTP and open `tests/transfer-render.html`: ten real-canvas assertions cover mirrored pixels, base preservation, isolated erasure, cleaned-base detection, recaptured transfers, cache reuse, offsets and undo replay. This test page is outside the deployed `dist/` directory.
- Browser workflow: cream base, red wave and three black dots on left index → mirrored right index → left pinky → independent pinky edit → unique pearl → undo. Also checked M override, tap-to-flip, CLEAN reset, reload persistence, seven-tool layout at 390 × 844, and DONE. No browser errors were reported. Physical touch hardware was not available for testing.

## Physical extension

Select EXTEND, then select a nail. Drag its tip outward or inward to continuously lengthen or shorten the free edge. The tiny side marks sculpt tip width horizontally and taper/roundness vertically, with gentle shape assistance. Double-tap the tip to cycle square → almond → coffin → stiletto without changing length. Double-tap the nail bed for an automatically fitted close-up.

Shift-double-click another nail to copy the selected form, or tap the faint ghost tip on the opposite finger. Painting, liner, dots, materials, stamps and physical objects all use the added surface. Existing artwork remains anchored and a new extension starts clear. Shortening previews the removed area, trims paint and affected charms on release, and joins the shared undo history.

`dist/nail-form.js` defines the anchored silhouette, continuous dimensions and curvature. `dist/extend.js` creates curved meshes, gel lighting, physical controls and trim/matching gestures. Version 5 saves retain natural bounds, length, width, taper, roundness, shape assistance and surface geometry alongside artwork, objects and undo snapshots. Previous save versions remain readable.

### Extension verification

- `node --test tests/*.test.mjs`: 14 passing model and compatibility checks.
- `tests/extension-render.html`: nine passing real-canvas checks for added surface, anchored artwork, clipping, trim/regrow, undo and stamping between natural and extended nails. Existing ten transfer canvas checks also pass.
- Browser checks: continuous length, shape cycling, fitted close-up, liner and pearl on the extension, trim removal and complete undo restoration, opposite-hand matching, mirrored transfer and refresh persistence.
- All eight tools render at a 390 × 844 iframe size. Physical touch gestures and device performance still require hardware testing.

## Workstation: color, gems, view and curing

The table now has three zones: polish/material at left, options for the active tool at center, and larger illustrated tools at right. Brush and liner expose size/opacity; dot exposes size/spacing; fan exposes size/density; clean exposes size. PICK reveals gem shapes, colors and size. The original pearl/chain/object dish is available through the secondary “pearls, chains & objects” control. Mobile uses horizontal scrolling for bottles, materials, gems and tools.

**Custom color:** `+ custom` opens a compact native visual/hue picker and six-digit HEX field. A new illustrated bottle joins the collection. The five most recent custom colors persist; every paint action carries its own immutable pigment, so evicting an old bottle never recolors existing artwork or stamped recipes.

**Gems:** round, oval, square, diamond, heart, star, teardrop and pearl shapes use generated vector silhouettes, restrained facets and a contact shadow. Pick a shape and curated/custom color, then place it. Drag a placed gem to move; its small floating controls resize, rotate or delete it. `[ / ]`, `+ / −` and Delete are also supported. Two pointers on a lifted object scale and rotate it. Alt+wheel rotates the selected object; Alt+Shift+wheel resizes. Ordinary wheel input always belongs to the canvas view.

**View:** wheel or trackpad pinch zooms between 65% and 400% around the pointer. Horizontal/Shift scrolling and Space+drag pan. Two fingers on the canvas pan and zoom around their midpoint; starting a canvas pinch cancels the tentative paint stroke. Object gestures take precedence when lifting a gem. Double-tap a nail is a 250% framing shortcut; repeat or FIT returns to the full composition. Brush dimensions remain in nail coordinates, independent of camera zoom. View targets are device-local saves.

**Finish:** DONE fades editing objects away over 550–650 ms and brings in an illustrated lamp. READY TO CURE allows returning to making. CURE choreographs the hand group into the lamp with an occlusion plane, runs the three-second 03/02/01 countdown, switches the UV light off, waits 300 ms and withdraws the hands before the final reveal. Material reactions and sound are restrained; the hum respects sound off. KEEP exports a PNG. SHARE uses native file sharing when supported and otherwise downloads the image. START AGAIN clears the working set as one undoable action, including across refresh. Painting actions and gem data are never changed by curing.

`dist/workstation.js` owns contextual UI and colors; `dist/view.js` owns focal zoom/pan and gesture arbitration; `dist/cure.js` owns the ritual state machine. The existing paint/charm/stamp/extension engines remain the rendering and history owners. Version 6 saves include custom colors, recent bottles, contextual settings, gem records and view, while versions 1–5 remain readable.

### Workstation verification

- 18 Node tests: previous geometry/transfer compatibility plus color normalization/history limits, custom gem validation, focal zoom invariance and v6/custom-pigment validation.
- 13 real-browser checks in `tests/workstation-render.html`: exact custom-blue pixels, opacity/replay, mandatory curing stages, countdown, physical transforms, unchanged design, final export availability and reset.
- Existing 10 stamp and 9 extension canvas regressions pass.
- Manual browser flows: #6F83C8 bottle and paint; ruby heart placement/move/scale/rotation; 100% → 300% pointer-focused zoom; jelly + liner + gem alignment; delete/undo; refresh persistence; curing and reveal. Responsive layout inspected at 390 × 844.
- Physical multitouch hardware and native OS share sheets remain untested.
