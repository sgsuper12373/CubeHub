# Hero cube assets

Drop the landing-page cube animation here. `src/components/marketing/hero-cube.tsx`
reads these exact filenames.

| File | Required | Used for |
|---|---|---|
| `cube-solve.webm` | preferred | The solve animation. Tried first. |
| `cube-solve.mp4` | recommended | Fallback — Safari does not play VP9 WebM everywhere. |
| `cube-still.png` | yes | Poster frame, and the resting cube on mobile / reduced-motion. |

**Nothing breaks while these are missing.** The hero hands off on schedule and simply
shows no cube — decoration must never gate the page, which is the whole reason this
stopped being a live cubing.js player. Add them whenever they are ready.

## Spec

- **Square.** It renders at 260 × 260 CSS px; author at **720 × 720** so it stays sharp
  on a 2× display.
- **Length ≈ 1.9 s.** `HERO_SOLVE_MS` in `hero-cube.tsx` drives the hand-off, so a
  longer clip gets cut off mid-air and a shorter one rests early. Change the constant
  if you want a different length — do not rely on the file's duration, which is
  deliberately not read.
- **Ends solved and holds.** There is no `loop`; the last frame is the resting state
  the hand-off springs into. Make the final frame the pose you want to live with.
- **Background:** simplest is to record on the page background, `#0F172A`. Transparency
  also works if you export VP9 WebM *with an alpha channel* — but then supply the MP4
  too, since MP4 has no usable alpha, and it will show a solid backdrop on Safari.
- **No audio track.** It is muted anyway; an audio stream is wasted bytes.
- **Budget:** aim under ~500 KB for the WebM. Above ~1 MB you have given back most of
  what moving off the live engine bought.

## Recording it

The old live version is still in git — `git show 49c46a0:src/components/marketing/hero-cube-inner.tsx`
— so the original animation can be replayed and captured rather than recreated:
a 3×3 running the inverse of `R U R' U' F' U F R2 U' R' U R U' R' F R F'` at
`tempoScale: 3`, `hintFacelets: "none"`, `background: "none"`.

Encoding, once you have a source recording:

```sh
# WebM (VP9), no audio
ffmpeg -i source.mov -an -c:v libvpx-vp9 -b:v 0 -crf 34 -vf scale=720:720 cube-solve.webm

# MP4 (H.264) fallback
ffmpeg -i source.mov -an -c:v libx264 -crf 24 -pix_fmt yuv420p -vf scale=720:720 cube-solve.mp4

# Poster from the final frame
ffmpeg -sseof -0.1 -i cube-solve.mp4 -frames:v 1 cube-still.png
```
