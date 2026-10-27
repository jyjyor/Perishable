# Perishable

A single-file web prototype. An anti-recipe app: it does not answer
"what can I cook," it answers "what am I about to lose."

## The thesis

The designer's photographic practice documents discarded objects, labour
traces, and everyday decay. This project is the interventionist version of
that work — it tries to act before the discarding happens. Every design
decision should be legible as part of that body of work, not as a
consumer food app.

## Non-negotiable constraints

- Single self-contained HTML file. No build step, no framework, no npm.
- No backend, no accounts, no database.
- Shelf-life values follow USDA FoodKeeper refrigerator guidance. Do not
  round them up to be friendlier. Raw chicken is 2 days.

## Visual system — derived, not decorative

Colours are the actual decay sequence of produce. Do not add colours
outside this set. Do not introduce a "brand" colour.

  --paper:#E6EAE8   cold fridge-interior white, fluorescent-lit
  --panel:#DCE1DF
  --panel-2:#D2D8D6
  --line:#B5BFBB
  --ink:#141817
  --ink-2:#5C6664
  --ink-3:#8B9491
  --fresh:#5F7350   chlorophyll olive
  --turn:#A8842A    oxidised ochre
  --crit:#6E3448    bruise plum
  --gone:#2B2320
  --paper:#E6EAE8

Type: Archivo variable (width axis carries the personality — 125 wdth
uppercase for display, 100 for body) plus DM Mono for all dates, counts,
labels, and buttons. No third family.

Signature element: the fridge view, then the decay line. The decay line
showed the dates but didn't make you feel what you were about to lose —
the fridge is the answer to that, so it opens the page: closest-to-expiring
sits large and lit at the front, safe things recede smaller and dimmer,
the way looking into a real fridge does before you've read a single
number. The decay line follows directly after, a 21-day horizon on a
square-root scale, every item pinned at its expiry — it still carries the
dates, now that the fridge carries the feeling. Both read from the same
shelf-life math (leftAt, pos) and must never disagree with each other.

## Voice

Sentence case. Plain verbs. No exclamation marks. Never cheerful about
waste. An empty state is an instruction, not an apology. Buttons say
exactly what happens: "Cook this," not "Get started."

## Never add

- Gamification of any kind: badges, streaks, scores, levels, "Fridge
  Warrior," weekly wrapped stats.
- Emoji as UI. Emoji in food data is also out.
- Star ratings, review counts, social features, sharing.
- Rounded cards with drop shadows. Warm/appetising palettes.
- Stock food photography.
- A cheerful mascot, illustration style, or "friendly" microcopy.

If a request seems to call for one of these, say so and propose something
that carries the same function without the vocabulary.

## Working agreement

- Change one thing at a time. Do not refactor unrelated code.
- Do not restructure the file unless asked.
- After each change, state what you changed and why in one paragraph.
