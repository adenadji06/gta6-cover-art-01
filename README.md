# Vice Nights — GTA 6-style Cover Art Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/adenadji06/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/adenadji06/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

[Bounty: gta6-cover-art-01 on make.fun](https://make.fun/bounty/gta6-cover-art-01)

Turn your own photo and a caption into GTA 6 poster-style cover art — a
multi-panel collage under a Vice City sunset, with bold outlined lettering
and a neon grade — and export it as a PNG ready to post.

## How it works (3 steps)

1. **Add photos** — drop in your own photos (they never leave your machine)
   or load the built-in samples.
2. **Pick a layout & grade** — Hero, Triple split, Duo or Four grid; Vice
   Sunset, Neon Nights, Palm Dusk or Mono Noir. Click any panel in the live
   preview to select it, then crop it with the zoom / pan sliders and edit
   the title, tagline and footer.
3. **Export PNG** — one click, in 1080×1080, 1080×1350 or 1920×1080.

## Run it

Serve `app/` with any static server and open `index.html` in desktop Chrome.
It works fully offline: every script, style and sample image is a file under
`app/`, and photos are read locally, never uploaded.

```sh
cd app && python3 -m http.server 8080
# open http://localhost:8080
```

## Files

- `main.ts` — entry program: copies `app/` + `screenshots/` to the output
  directory and writes `dossier.json` with `buildDossier`. Run it twice;
  both runs write byte-identical output.
- `app/index.html`, `app/style.css`, `app/src/app.js` — the whole app.
- `app/samples/` — three sample photos, drawn procedurally for this entry
  (sunset boulevard, pier, beach portrait silhouette). Free to use.
- `screenshots/` — the cover and the editor at work.
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.

## Originality

All art is drawn by hand on canvas (sunset gradient, striped sun, palm and
skyline silhouettes, panel frames, lettering). No Rockstar Games logo,
wordmark, official artwork, character or font is used anywhere; lettering
uses system fonts only.

## Verify locally

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
mkdir -p out2 && MAKEFUN_OUTPUT_DIR=out2 node main.ts
diff -r out out2   # no output: both runs are byte-identical
```

## License

MIT — see [LICENSE](LICENSE).
