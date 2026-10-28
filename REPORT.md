# Real fridge — autonomous session report

Branch: `real-fridge`. Not pushed, not merged into `main`. The existing
line-art fridge view and every file outside this project were left alone.

## What I built

A new `.rf` section (`#rf`) in `index.html`, directly above the existing
`<section class="fridgeview">`, which I did not touch — both currently
show the same real `fridge` data side by side, as asked, so you can
compare them before deciding which stays.

**The illustration.** A literal fridge, flat-filled line art in the
page's existing cold palette: rounded-corner body, a freezer compartment
with vent lines near the top, a door seam, a rubber-gasket outline inset
on the door face, two hinges on the body's right edge, a handle with top
and bottom mounting brackets, a vent grille and two feet at the bottom,
and a flat (not blurred) shadow ellipse underneath. Inside: a back wall
that visibly lightens when the door opens, a light-fixture rectangle that
does the same, two glass shelves with side rail marks, a crisper drawer
at the bottom, and three door bins on the door's inside face. No
gradients anywhere, no metal texture, nothing cute — flat fills and thin
ink strokes throughout, same as the food.

**The door.** A real CSS 3D transform (`rotateY` around the hinge edge,
`transform-style: preserve-3d`, two `backface-visibility: hidden` faces
for the front and the inside) rather than a slide or fade standing in for
a hinge. It opens once on page load, closed on the very first paint, then
animates open — so you see it shut before you see it decided to open,
not a jump cut. Clicking the handle (a real `<button>`, focusable,
`aria-pressed`/`aria-label` kept in sync) toggles it either way, and also
dismisses any open item popover, since a popover pointing at a now-hidden
item looked broken. Under `prefers-reduced-motion: reduce`, it's open
within one frame of load with no visible swing — I didn't write a
separate media-query path for this; the page already had a global
`*{transition:none!important}` rule under that same media query, so my
JS only needed to skip its own 500ms delay before flipping the class, and
the existing CSS infrastructure does the rest.

**Food placement.** Items come from the real `fridge` array via the real
`leftAt`/`decayFraction`/`natureColor`/`foodShapeMarkupLine`/
`fridgeCatOf`/`fridgeShapeOf` — no parallel rendering path. Items with
days-left ≥ 0 are sorted soonest-first; the most urgent (up to three) go
on the eye-level shelf, the single most urgent one enlarged and placed in
the middle of that row; the rest recede onto the lower shelf, shrinking
slightly with each step down the urgency order. Already-past-date items
go into the crisper drawer with the same `Toss` action the old fridge
view uses (`useItem(id, true)`), not a reimplementation. Tapping any item
— never the door — opens a popover with its name, bought date, status
(the same `state()`/`COLOR` bucket the rest of the page already uses),
and days left; it closes on an outside click, Escape, or the door handle.
The closed door shows one plain line: an item count using `state()`'s own
turn/crit bucket (not fresh, not yet gone) as "at risk" — see the color
decision below for why that line isn't colored. Empty fridge: a short
instruction ("Add what you bought and it will show up on these
shelves."), not an apology.

## Test results

`node tools/scenarios.js`: **17/17 pass, exit 0** — the original 12
(untouched, still pass unmodified) plus 5 new ones for this feature:
door-opens-on-load, handle-toggle (both directions, aria state), reduced
motion, the closed-door count, and item tap (popover content, door
untouched by the tap, dismissal on outside click). Full output and every
screenshot path below are reproducible by running that file.

## Screenshots

All under `tools/screenshots/` (gitignored, so listed here by path, not
committed):

- `real-fridge-7item-desktop-closed.png` / `-midswing.png` / `-open.png`
- `real-fridge-7item-phone-closed.png` / `-midswing.png` / `-open.png`
- `real-fridge-empty-desktop-open.png` / `real-fridge-empty-phone-open.png`
- `real-fridge-25item-desktop-open.png` / `real-fridge-25item-phone-open.png`
- `real-fridge-7item-desktop-popover.png`
- `real-fridge-7item-desktop-closed-by-handle.png`
- `scn-realfridge-closedcount.png`, `scn-realfridge-popover.png` (from
  the scenario suite itself, in page context with the header)

Regenerate any of these with `node tools/real-fridge-study.js` (the
permanent design-review script for this section) or `node
tools/scenarios.js`.

## Design decisions I made without asking, and why

1. **Urgency colour stays off the closed door.** CLAUDE.md allows
   urgency colour in exactly four places, one of which is "the label on
   each fridge-view item." I treated the item popover's status line as
   that same place, just in a new presentation (it *is* the item's
   label, shown on tap instead of always-on) — not a fifth place. The
   closed door's count line is different: it's a door-level summary, not
   an item label, so I kept it plain ink rather than stretch the
   four-places rule to cover it. If this section replaces the old one,
   CLAUDE.md's "exactly four places" line should probably be reworded to
   name the popover explicitly rather than "the label on each item,"
   since there's no longer an always-visible per-item label out here.

2. **Door hinge on the right, opening left, camera shifted left.** The
   spec didn't say which side. Straight-on, perspective-centered, an
   open door reads as a useless foreshortened sliver — that's correct
   physics, not a bug, but it's a bad illustration. I shifted
   `perspective-origin` toward the side the door swings its face toward
   (left, since it's right-hinged) instead of fighting the geometry with
   a smaller open angle, which just made the door cover *more* of the
   opening. Final resting angle is 70°, chosen by rendering and looking,
   not computed.

3. **"Front and center" means centered in the visible two-thirds, not
   the full shelf.** At that resting angle and camera position, the
   hinge-side third of each shelf sits partly behind the door's own
   retreating edge — true to how a real open fridge looks from the
   front, where the side nearest the hinge is the hardest to see into.
   I biased the centered group left (asymmetric shelf padding) rather
   than true-centering it across the whole width, so the hero item is
   never partly hidden by the door that's supposedly already open for
   you.

4. **Eye-level shelf caps at 3 items, not more.** With 4, the group was
   wide enough to spill into that same hinge-side occlusion zone at
   smaller item sizes. 3 keeps the hero item and its two closest
   neighbors unambiguously clear at every population size I tested
   (empty through 25).

5. **Crisper and lower shelf overflow by clipping/scrolling, not by
   paginating.** At 25 items the lower shelf and crisper both run wider
   than the visible opening; `overflow-x: auto` lets a real user scroll
   the crisper, and the lower shelf simply recedes behind the door edge
   the same way the hinge-side items do at any population — which reads
   as "there's more, further back," consistent with the fridge metaphor,
   rather than a broken layout. I did not build a "+N more" affordance;
   see Next steps.

6. **Freezer compartment is decorative, not a second working door.** The
   brief asked for a freezer compartment as a visual element; it didn't
   ask for a second hinge-and-swing interaction, and building one would
   have meant a second everything (shelves, items, a second urgency
   question — does freezer food decay the same way?) with no spec to
   build it against. It's a static compartment with its own seam and
   vent lines.

7. **Handle closes the popover.** Not asked explicitly, but leaving a
   popover floating over a door that just closed looked like a bug the
   moment I saw it in a screenshot (see Errors below) — fixed it rather
   than leaving it for review.

## Errors caught and fixed during the build (via the screenshot loop)

- `.rf-shelfitems{bottom:2.6%}` was 2.6% of the *shelf's own* 2.6%-tall
  box, not the cavity — effectively zero, so items sat at the shelf's
  bottom edge instead of resting on top of it, overlapping whatever was
  below. Fixed to `bottom:100%` (flush with the shelf's own top edge).
- `.rf-emptycavity[hidden]` wasn't hiding anything: the class's own
  `display:flex` and the `[hidden]` attribute selector tie at (0,1,0)
  specificity, and the class rule came later in the sheet, so it won —
  the empty-state text rendered even with 10 items in the fridge. Added
  an explicit `.rf-emptycavity[hidden]{display:none}` override.
- Food labels had a fixed `max-width:50px` independent of their icon's
  actual column width, so a name like "Chicken breast" forced its flex
  item wider than its declared size, pushing the whole shelf row past
  the frame on the right. Changed to `max-width:100%` (tied to the
  button's own width) plus `overflow-wrap:anywhere`.
- `rfBuildCrisperItem` had a mismatched closing tag (`</span>` where
  `</button>` was opened) — caught by a `null` popover-element exception
  on first run, which was actually a *different* bug (see next line) that
  happened to surface while this one was also present; fixed both.
- `document.getElementById('rfPopover')` was null on first run — I'd
  written the CSS and all the JS for the popover and never added the
  `<div id="rfPopover">` to the HTML.

## What I'd do next

- A "+N more" chip on the lower shelf and crisper at high item counts,
  instead of letting excess items recede behind the door edge or rely on
  drag-scrolling in the crisper — works, but isn't discoverable.
- Decide (with you) whether the real fridge replaces the line-art one,
  both stay, or the line-art one goes in the drawer area instead; update
  CLAUDE.md's "exactly four places" wording once that's settled.
- The freezer compartment is purely decorative; if it should hold
  anything (frozen goods get their own shelf-life category?), that's a
  new food-data question, not a layout one.
- Door-bin interiors are blank rectangles right now — I didn't invent
  contents for them since nothing in `fridge` maps to "door items"
  specifically (condiments, etc. aren't tracked separately from shelf
  items in this app's data model).
- I didn't add a sound or haptic on toggle — out of scope for a
  single-file web prototype, flagging only because some fridge UIs do.
