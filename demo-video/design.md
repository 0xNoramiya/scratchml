# ScratchML — "Toy-Lab" (video edition)

The demo video inherits the product's design system. Footage IS the brand; HTML scenes must look like the app grew a film crew.

## Colors

| Token | Hex | Use |
|---|---|---|
| paper | `#fff6e9` | canvas background |
| paper-2 | `#fdeecf` | panels |
| card | `#fffdf8` | cards |
| line | `#ecdcc0` | borders/grid dots |
| ink | `#2b2233` | headlines, outlines |
| ink-soft | `#7a6c84` | secondary text |
| ev green | `#54c265` / edge `#379a47` / text `#15401d` | GO/hat |
| cam blue | `#37a8f0` / `#1d82c8` / `#00345c` | camera |
| skb teal | `#2ec4b6` / `#1f9e92` / `#0c3b36` | sketchpad |
| cls pink | `#ff6fa3` / `#df4e85` / `#6b0031` | classes |
| trn orange | `#ff9f45` / `#ec7c22` / `#6b3300` | training |
| prd purple | `#a674f2` / `#864fdf` / `#2e1359` | predict / brand accent |
| go yellow | `#ffce3a` / edge `#e7a90f` | CTA |
| good | `#2fbf71`, bad `#ff5d5d` | feedback |

## Type

- Display: **Fredoka** 600/700 (`fonts/fredoka-*.woff2`) — headlines, captions, buttons
- Body: **Nunito** 700/800 (`fonts/nunito-*.woff2`) — labels, small copy
- Video scale: headlines 80–150px, captions 54–64px, chips/labels 24–30px

## Texture & motifs

- Dotted graph-paper grid (radial-gradient dots, `#ecdcc0`, 22px)
- Soft pastel blobs (blurred radials: `#ffd2a8`, `#ffc2dd`, `#bfe0ff`)
- Chunky "toy-block" cards: 2.5px ink-edge border, 16px radius, hard bottom shadow `0 5px 0 0 <edge>`
- Crayon stickers (`assets/sticker-*.png`), robot art (`assets/og.png` family)
- Confetti dots in candy palette

## Motion personality

Bouncy and snappy: `back.out(1.6–2)`, `elastic.out(1, 0.5)` for hero pops, `power3.out` for slides. Captions scale-pop. Nothing slower than 0.7s except holds.

## Don'ts

- No dark scenes — this brand is daylight
- No gradients-on-white text, no thin strokes (<2px)
- Don't cover the footage's stage area (right third) with captions
