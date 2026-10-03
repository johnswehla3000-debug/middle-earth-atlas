# Middle-earth · An Interactive Atlas of the Third Age

An unofficial, fan-made 3D atlas of Middle-earth that runs in any modern browser (phone or desktop).

*Unofficial fan-made atlas. Middle-earth created by J.R.R. Tolkien.* This project is not affiliated with the Tolkien Estate, its publishers or any film studio.

## What's in it
- A stylised 3D landscape: mountains, rivers, forests, seas and lakes, laid out from hand-placed approximate coordinates and generated procedurally. No published or fan map was copied or traced.
- 60 places you can tap, each with a short history written for this project.
- Seven journeys drawn as glowing lines (Bilbo, Frodo & Sam, the Fellowship, Aragorn/Legolas/Gimli, Merry & Pippin, Gandalf, Boromir), with a summary and a "Play journey" animation.
- Touch: drag to pan, pinch to zoom, two fingers to rotate and tilt. Mouse: drag to pan, right-drag to rotate/tilt, scroll to zoom.

## Project layout
- `index.html`, `css/`, `js/`: the app (`js/geo.js` geography, `js/places.js` locations, `js/journeys.js` routes, `js/main.js` the renderer and UI)
- `vendor/three.bundle.min.js`: Three.js r186 with MapControls, bundled locally (MIT, see `vendor/THREE-LICENSE.txt`)
- `fonts/`: Cinzel and EB Garamond (SIL Open Font License)
- `assets/`: baked heightmap (`height.png`, 16-bit packed in R/G) and terrain texture (`terrain.jpg`)
- `tools/`: `bake.mjs` regenerates `assets/` from `js/geo.js` using headless Chromium (Playwright); `shoot.mjs` takes test screenshots

Rebake after editing the geography: `node tools/bake.mjs` (needs the `playwright` package).
