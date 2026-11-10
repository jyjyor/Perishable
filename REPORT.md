# Drawings report — branch `drawings`

Every FOODS entry was audited with a blind recognition test. The ones that
failed were redrawn one category at a time and retested, up to three
tries each. After that, three changes went in:
- The 100% decay colour keeps each food's own hue.
- Package labels print the food's plain name.
- The migration test was brought up to date.

Then all 163 foods were tested again, mixed together. Fallback
(FoodKeeper-only) items keep their category's generic shape. Apart from
the shared decay colour, the hand-tuned drawings were not touched: mushroom,
potato, apple, banana, tomato, lemon, lime, mango, watermelon, kiwi,
guava, milk, eggs, hard cheese, butter, tofu and the leftovers. Their
shapes are exactly as they were.

The work is in one commit per category, plus one commit each for the
decay colour, the labels and the migration test. The drawing spec is in
CLAUDE.md under "Drawing spec". Nothing was merged into main and nothing
was pushed.

**Suite: 96 of 96 scenarios passed** (it was 95 of 96 before the
migration test was updated; see below).

## The result: all 163 foods, mixed

The final test showed all 163 foods together, not grouped by category, so
the category gave nothing away. It was run by four fresh subagents that
never saw the code or the names, one per condition:
- each drawing alone and unlabelled, fresh at large size
- each drawing at 100% decay
- each drawing at phone shelf size
- the 54 confusable pairs side by side, "which is which?"

The question was open-ended: what food is this? A reasonable name counted
as correct. The prompts were the same, word for word, as in the before
test, which was also all 163 mixed. So this table compares like with like.

"All" counts drawings that passed every way and every pair they're in.
"Pairs" counts pair checks: each pair is counted once for each of its two
foods.

| Category | n | Before: fresh / 100% / phone / pairs / **all** | Now: fresh / 100% / phone / pairs / **all** |
|---|---|---|---|
| Leafy greens | 18 | 0 / 1 / 1 / 0/18 / **0** | 15 / 12 / 15 / 18/18 / **11** |
| Vegetables | 32 | 8 / 7 / 8 / 11/21 / **4** | 31 / 27 / 32 / 21/21 / **26** |
| Fruit | 32 | 31 / 16 / 30 / 17/17 / **15** | 32 / 29 / 32 / 17/17 / **29** |
| Protein | 10 | 4 / 1 / 4 / 6/12 / **1** | 9 / 7 / 8 / 12/12 / **6** |
| Dairy | 13 | 4 / 5 / 4 / 2/12 / **2** | 13 / 12 / 13 / 12/12 / **12** |
| Cooked, deli & leftovers | 9 | 4 / 4 / 3 / 5/5 / **3** | 9 / 6 / 9 / 5/5 / **6** |
| Condiments | 19 | 6 / 9 / 5 / 5/11 / **3** | 19 / 19 / 19 / 11/11 / **19** |
| Drinks | 24 | 14 / 11 / 12 / 4/8 / **9** | 24 / 24 / 23 / 8/8 / **23** |
| Frozen | 6 | 3 / 1 / 3 / 4/4 / **1** | 6 / 6 / 6 / 4/4 / **6** |
| **Total** | **163** | **74 / 55 / 70 / 27 of 54 pairs / 38** | **158 / 142 / 157 / 54 of 54 pairs / 138** |

**Read this honestly.** The packaged categories now carry their name on
the label: dairy, condiments, drinks, frozen, and some of cooked. The
agents said so ("the bottles, jars and packages with labels were easy to
name"). Their jump, from 15 to 60 of 62 all-pass, is mostly the label
being read, not the drawing being recognised. The drawing-only result is
the fresh food, which has no label:

| | Before | Now |
|---|---|---|
| Leafy greens, vegetables, fruit and protein: no labels (92 foods) | 20 | 72 |
| Packaged categories (62 foods) | 15 | 60 |

Even with labels, two packages fail: baijiu at phone size (its word is
unreadable on a red label at 40 px, so it read as kefir) and fresh salsa
at decay. Packages with no label in life stay unlettered: the egg carton,
the meat trays, the cheese wedge and wheel, and string cheese.

**The decay colour shows in the 100% column.** Fruit at 100% went from 21
of 32 in the category retests to 29 now. Leafy greens went from 9 to 12.
Those categories carry no labels, so this gain is the colour.

### Still failing (25 of 163)

Most of these are a single miss at 100% decay.

At decay only:
- **Vegetables:**
  - baby carrots read as dates
  - daikon read as parsnip
  - sweet potato read as sausages
  - winter melon read as zucchini
  - shiitake read as portobello
- **Leafy greens:**
  - basil read as mint
  - choy sum read as oregano
  - gai lan read as basil
  - scallion read as lemongrass
- **Fruit:**
  - grapefruit read as orange
  - honeydew read as lime
  - mandarin read as figs
- **Protein:**
  - beef read as brownies
  - chicken thighs read as potatoes (thighs was the second guess)
- **Cooked:**
  - cooked rice read as oatmeal
  - corn tortillas read as "tortillas (pita bread)"
  - fresh salsa read as chili
  - soft cheese read as "cheese wheel (gouda)"

More than one way:
- cilantro reads as watercress every way
- water spinach reads as lemongrass fresh and at phone size, and as garlic
  scapes at decay
- kale reads as perilla or mustard greens fresh and at phone size (it
  passes at decay)
- ground turkey reads as ground pork every way, with turkey as the second
  guess

Fresh or phone only:
- cherry tomatoes read as "tomatoes on the vine" (strict grading: they
  are on the vine)
- pork chops at phone size read as chicken breasts
- baijiu at phone size read as kefir

The grading is strict. "Tortillas", "cheese wheel" and "tomatoes on the
vine" are arguably right and are still counted as misses. The flagged
sheet shows these 25 foods.

## The three follow-up changes

### 1. Migration: no real data was at risk; the test was out of date

`migrationScenario` builds saved data on `origin/main`, which is what the
phone runs, and loads it into the working tree. It was written when
`origin/main` was pre-bin. Since the bin was pushed (21305e5), a toss on
`origin/main` goes into `tossLog` and shows in this month's bin as an
item. The test still expected it in the "Earlier, before the bin kept
each item" total, which is why it failed.

I checked the real transitions the phone went through, using real saved
states built by each version's own code:
- **Pre-bin (7b00e88) → current:**
  - the ledger came through unchanged (600 g · $6.20 thrown away · 1125 g
    rescued in the check)
  - the "earlier" line shows exactly those totals
  - every fridge item and usual came through
  - `tossLog` starts empty, because pre-bin tosses had no item, date or
    decay to keep. That is by design, not a loss.
- **Pre-bin, then used and re-saved:** `logStart` survives the re-save,
  the earlier line doesn't change, and new tosses go into the bin.
- **Bin (21305e5) → current:** the ledger, `logStart` and `tossLog`
  came through byte for byte, and the bin draws each saved toss.

So the phone would lose nothing: not the thrown-away or rescued totals,
and not the toss log. The test now checks both shapes:
- When `origin/main`'s data has a `tossLog`, it must come through exactly,
  and so must `logStart`. The bin must draw each saved toss with its
  weight, and the earlier line shows only for a pre-bin total.
- The pre-bin check is kept as its own leg. The same data without
  `tossLog`/`logStart` must still show its whole totals as the earlier
  line, with no invented bin items.

This is stricter than before, not weaker. The fix is on branch
`migration-test` (one commit off main, not merged) and cherry-picked onto
`drawings`.

### 2. 100% decay keeps each food's own hue

Before, every food closed out to one shared brown at 85% and a near-black
rot at 100%. Now each food has its own end colour (`decayEndsOf`):
- its own hue, turned a fifth of the way toward brown
- chroma cut to about 60%
- lightness pulled down and squeezed (0.2 + 0.4 L), so a pale part stays
  lighter than a dark part and identity cues still show

A rotten tomato reads dark brick red, a lime dark olive green, a
blueberry dark slate violet. It never reads as an urgency colour: an end
within 0.085 (OKLab) of one moves only its lightness until it clears
them all. The old browns came as close as 0.048. Foods are twice as far
apart at 100% (mean pairwise distance 0.046 → 0.111). This applies to the
approved drawings too, but only their colour changed; no shape did.

### 3. Package labels print the food's plain name

Each package's plain label carries the food's generic name in tiny
capitals, lettered like the leftovers tape: SOY, OYSTER, CIDER, TAHINI,
CREAM, ICE CREAM, MAYO, BBQ, RANCH, HALF & HALF. There are no brands and
no logos. The word is never larger than the tape's lettering and fades
with the label. It appears on bottles, jars, tubs, cartons, bags, the
ice-cream pint, the pops and the pizza.

## Sheets (tools/screenshots/, gitignored)

| What | Where |
|---|---|
| Before, per category (main's index.html) | `before/sheet-<category>.png` |
| After, per category (current) | `after/sheet-<category>.png` |
| Still failing (the 25 above) | `flagged/sheet-<category>.png` |
| Every place each food is drawn (shelf, door bin, used some, cling film, freezer burn, dish) | `drawings/contexts-<category>.png` |
| Final unlabelled sheets, to run the test with people | `blind-final/sheet-{fresh,decayed,phone}-N.png`, `blind-final/pairs/`, answers in `blind-final/key.json` |

`node tools/drawings-study.js sheet <out> [key,key…]` renders a labelled
sheet; given keys, it renders only those foods. `blind <name>` renders
the unlabelled sets.

## History: the per-category retests

While redrawing, each category was retested on its own, with only its
own foods in the set, up to three rounds. These numbers are optimistic,
because the agents could guess the category. The mixed test above
replaces them. Where a later try scored worse, the earlier one was kept
(leafy round 3, cooked try 2, drinks try 2, frozen try 2).

| Category | Rounds, all-pass |
|---|---|
| Leafy greens (18) | 5, 8, 7 |
| Vegetables (32) | 24, 25, 29 |
| Fruit (32) | 21 |
| Protein (10) | 6, 9, 6 |
| Dairy (13) | 7, 8, 9 |
| Cooked, deli & leftovers (9) | 7, 8, 7 |
| Condiments (19) | 12, 13, 14 |
| Drinks (24) | 13, 15, 14 |
| Frozen (6) | 4, 5, 4 |

**Protein's score, corrected.** The protein commit message (ba667cd) says
"best of three rounds: all-pass 9/10". That was round 2's score. The
drawings that shipped are round 3's, which scored **6 of 10** all-pass;
in the mixed test protein is also **6 of 10**. Round 3 differs from
round 2 only in ground turkey's colour, and turkey failed both rounds. The
commit message can't be changed without rewriting history, so this
report is the correct record.

## Notes

- **Grader.** The answer patterns for frozen berries and frozen
  vegetables accept "mixed berries" and "mixed vegetables". Regrading the
  before test with them changed nothing.
- **Agent variance.** A drawing that wasn't changed sometimes fails once.
  A single miss at decay (beef, chicken thighs, cooked rice) may not
  repeat.
- **Ice cream** still has its cold mist, which an agent read as steam. The
  label now says ICE CREAM, so it passed anyway.
- **References.** tools/fetch-references.js puts Wikimedia Commons photos
  in tools/references/web/. That folder is gitignored and nothing in it
  was committed.
