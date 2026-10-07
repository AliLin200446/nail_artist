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
Three.js is vendored in `dist/vendor/`. A generated photographic hand composition backs ten individually fitted curved nail meshes. Each nail owns 512 × 512 paint and finish textures plus its action history. Painting stamps into the textures; hand geometry is never rebuilt while drawing. Pointer pressure or velocity controls application. The shader gives newly painted areas a settling highlight over 2.3 seconds, with distinct metallic and clear behavior. UI and optional WebMCP tools share the same application state.

## Prototype boundaries
The reference photograph mentioned in the brief was not attached. This prototype uses a generated substitute. Hands are a fixed photographic composition with WebGL nail surfaces, not fully rigged 3D hands. Selection subtly raises/emphasizes the nail surface; full finger articulation and a separate presentation hand pose require a rigged hand asset. Presentation mode reframes the same photograph. Wet overlap is a restrained opacity blend, not fluid simulation. Clear coating adds sheen. Erasing reveals the natural nail rather than selectively removing only the last layer. Device-local saves do not sync between the local preview and hosted URL. Keyboard users can operate tools and undo; freehand painting requires a pointer.

No templates, random designs, accounts, social features, or AI generation are present in the website.

# nail_artist
