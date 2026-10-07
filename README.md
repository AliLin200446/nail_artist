# Nail Study

Standalone WebGL nail-painting prototype. Serve `dist/` over HTTP; no build required.

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
