# fishes10 — IchthyoMorph

Photo-measured procedural fish anatomy generator (React + Vite + Tailwind + Three.js).

## Layout note: split files

Every file in this repo is kept at or below 30,000 bytes. Four source files
exceed that as single files, so they are stored as numbered parts and
reassembled automatically before dev/build:

| Generated file | Parts |
| --- | --- |
| `src/data/species1.ts` (40,057 B) | `src/data/parts/species1.part01.txt` (28,987 B), `species1.part02.txt` (11,070 B) |
| `src/data/species2.ts` (33,657 B) | `src/data/parts/species2.part01.txt` (28,857 B), `species2.part02.txt` (4,800 B) |
| `src/data/species3.ts` (36,478 B) | `src/data/parts/species3.part01.txt` (28,916 B), `species3.part02.txt` (7,562 B) |
| `src/engine/build.ts` (34,435 B) | `src/engine/parts/build.part01.txt` (28,998 B), `build.part02.txt` (5,437 B) |

Concatenating each part set in order reproduces the original file byte for
byte. `tools/reassemble.mjs` does this and refuses to build if any part
exceeds 30,000 bytes; it runs via the `predev` / `prebuild` / `prepreview`
npm hooks, or manually with `npm run reassemble`. The generated files are
gitignored. Edit the parts, not the generated files.

## Run

```sh
npm install
npm run dev     # or: npm run build
```

`package-lock.json` is not committed; `npm install` regenerates it.
