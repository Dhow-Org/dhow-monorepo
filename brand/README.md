# Dhow — brand assets

The **Seal** mark (a lateen sail set in a brass coin) is the Dhow logo. It rhymes
with the underwriting stamp in the product and with the stablecoin itself.

## Files
| File | Use |
|---|---|
| `seal.svg` | The mark, mono (`currentColor`) — set colour via CSS `color` |
| `seal-brass.svg` | The mark in brass on transparent |
| `app-icon.svg` | Brass seal on an ink rounded square — app icon / favicon source |
| `banner.svg` | X header, 1500×500, fonts embedded (renders anywhere) |
| `banner.png` | X header raster, 1500×500 — upload this to X |
| `banner@2x.png` | X header raster, 3000×1000 (crisp on hi-dpi) |

In the app the mark lives at `packages/web/src/ui/Logo.tsx`; the favicon at
`packages/web/public/favicon.svg`.

## Palette
`abyss #06181B` · `ink #0A262B` · `panel #0F3138` · `brass #D7A23B` · `canvas #F2ECDD` · `foam #56D6B6`

## Type
Fraunces (display) · Hanken Grotesk (UI) · IBM Plex Mono (figures & labels)

## Regenerating the banner PNG
The SVG is the source. Any SVG→PNG renderer that can load the Fraunces + IBM Plex
Mono fonts (or the embedded `banner.svg`) reproduces the raster at 1500×500.
