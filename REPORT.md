# Drawings report — branch `drawings`

Every FOODS entry was audited with a blind recognition test. The ones that
failed were redrawn one category at a time and retested, up to three
tries each. Then came two rounds of follow-up changes:
- **First round:** the 100% decay colour keeps each food's own hue,
  package labels print the food's plain name, and the migration test was
  brought up to date.
- **Last round:** meat trays carry a printed sticker, and cilantro, kale
  and water spinach got one more try each.

All 163 foods were tested mixed together after each round. Fallback
(FoodKeeper-only) items keep their category's generic shape. Apart from
the shared decay colour, the hand-tuned drawings were not touched: mushroom,
potato, apple, banana, tomato, lemon, lime, mango, watermelon, kiwi,
guava, milk, eggs, hard cheese, butter, tofu and the leftovers. Their
shapes are exactly as they were.

The work is in one commit per category, plus one per follow-up change.
The drawing spec is in CLAUDE.md under "Drawing spec". `drawings` is
merged into main.

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
test, which was also all 163 mixed. So the columns compare like with
like.

"All" counts drawings that passed every way and every pair they're in.
"Pairs" counts pair checks: each pair is counted once for each of its two
foods. A pair answered correctly but rated only a "guess" counts as a
miss, as it has from the start. "Mixed 1" is the test after the first
follow-up round; "Final" is after the last.

| Category | n | Before: fresh / 100% / phone / pairs / **all** | Mixed 1: **all** | Final: fresh / 100% / phone / pairs / **all** |
|---|---|---|---|---|
| Leafy greens | 18 | 0 / 1 / 1 / 0/18 / **0** | **11** | 15 / 16 / 15 / 16/18 / **12** |
| Vegetables | 32 | 8 / 7 / 8 / 11/21 / **4** | **26** | 32 / 31 / 31 / 21/21 / **30** |
| Fruit | 32 | 31 / 16 / 30 / 17/17 / **15** | **29** | 32 / 28 / 32 / 17/17 / **28** |
| Protein | 10 | 4 / 1 / 4 / 6/12 / **1** | **6** | 10 / 10 / 10 / 12/12 / **10** |
| Dairy | 13 | 4 / 5 / 4 / 2/12 / **2** | **12** | 13 / 13 / 13 / 12/12 / **13** |
| Cooked, deli & leftovers | 9 | 4 / 4 / 3 / 5/5 / **3** | **6** | 9 / 7 / 9 / 3/5 / **6** |
| Condiments | 19 | 6 / 9 / 5 / 5/11 / **3** | **19** | 19 / 19 / 19 / 11/11 / **19** |
| Drinks | 24 | 14 / 11 / 12 / 4/8 / **9** | **23** | 24 / 24 / 24 / 8/8 / **24** |
| Frozen | 6 | 3 / 1 / 3 / 4/4 / **1** | **6** | 6 / 6 / 6 / 4/4 / **6** |
| **Total** | **163** | **74 / 55 / 70 / 27 of 54 pairs / 38** | **138** | **160 / 154 / 159 / 52 of 54 pairs / 148** |

**Read this honestly.** The packaged categories carry their name on the
label: dairy, condiments, drinks, frozen, some of cooked, and now the meat
trays. The agents said so ("most packaged items had their name printed on
the label, so I used that name"). Their scores are mostly the label being
read, not the drawing being recognised. Protein's jump to 10 of 10 is the
new tray sticker: ground turkey, which read as ground pork every way in
every earlier test, now passes because the sticker says GROUND TURKEY. The
drawing-only result is the fresh food, which has no label:

| | Before | Mixed 1 | Final |
|---|---|---|---|
| Leafy greens, vegetables and fruit: no labels (82 foods) | 19 | 66 | 70 |
| Packaged categories, including meat trays (72 foods) | 16 | 66 | 72 |

**Agent variance is real, and it shows here.** Six foods passed Mixed 1
and miss now, though their drawings didn't change in the last round:
- napa cabbage and romaine read as bok choy or choy sum, fresh
- parsley read as broccolini, fresh and at phone size
- coconut read as celery root at decay
- dragon fruit read as pomegranate at decay
- the flour/corn tortilla pair was right but only a guess

Meanwhile other unchanged foods that missed in Mixed 1 pass now: baby
carrots, daikon, honeydew, basil, gai lan, scallion, shiitake, cooked
rice, cherry tomatoes, soft cheese and baijiu. (Beef, chicken thighs and
pork chops pass now too, but they did change: they gained the tray
sticker.) A single run moves
a few foods each way. The totals are steadier than any one food.

### The four in the last round

- **Cilantro**, redrawn on its real feature (small flat, broadly
  three-lobed, toothed leaflets on long bare stems, not watercress's
  small round ones): now named cilantro fresh, at 100% and at phone size
  (it read as watercress every way before). The cilantro/parsley pair was
  answered correctly, but only as a "guess", so by the grading rule it
  still counts as a miss.
- **Kale**, redrawn with deeply ruffled curly edges, frilled curls along
  both sides of the blade, and a thick pale centre rib: **passes every
  way** (it read as perilla or mustard greens before).
- **Water spinach**, redrawn with hollow stems (open cut ends) and narrow
  arrowhead leaves whose lobes point back past the stalk: now **named
  water spinach fresh**. At 100% and at phone size it still reads as basil.
  This one is left as it is, as asked.
- **Ground turkey**: passes every way, thanks to the tray sticker.

### Still failing (15 of 163), left as they are

- **Water spinach:** basil at decay and at phone size (fresh passes).
- **Cilantro:** passes all three ways; the parsley pair was right but
  only a guess.
- **Parsley:** broccolini, fresh and at phone size. The parsley pair
  was also only a guess.
- **Napa cabbage:** bok choy, fresh.
- **Romaine:** yu choy / choy sum, fresh and at phone size.
- **Choy sum:** broccoli rabe at decay.
- **Winter melon:** cucumber at decay.
- **Sweet potato:** almonds at phone size.
- **Grapefruit:** orange at decay.
- **Mandarins:** potatoes at decay.
- **Coconut:** celery root at decay.
- **Dragon fruit:** pomegranate at decay.
- **Fresh salsa:** kimchi at decay.
- **Corn tortillas:** pita at decay; the tortilla pair was only a guess.
- **Flour tortillas:** the tortilla pair was only a guess.

The flagged sheet shows these 15.

## The follow-up changes

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

This is stricter than before, not weaker. The fix was made on its own
branch off main, cherry-picked onto `drawings`, and reached main with the
merge; that branch is deleted.

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

### 4. Meat trays carry a printed sticker

Every protein tray has a small white sticker on its film, in the corner
away from the peel, with the plain name in the same tiny capitals:
GROUND TURKEY, GROUND BEEF, CHICKEN THIGHS, PORK CHOPS, STEAK, SALMON. It
has no brand and no price. It stays when the film is peeled back and goes
with the tray in a dish.

### 5. Cilantro, kale, water spinach: one more try each

Each was redrawn from the reference photos (tools/references/web/) on
the feature people tell it apart by. The results are above.

## Sheets (tools/screenshots/, gitignored)

| What | Where |
|---|---|
| Before, per category (main's index.html) | `before/sheet-<category>.png` |
| After, per category (current) | `after/sheet-<category>.png` |
| Still failing (the 15 above) | `flagged/sheet-<category>.png` |
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
in the first mixed test protein was also **6 of 10**; it is 10 of 10
only since the tray sticker. Round 3 differs from
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
- **Ice cream** still has its cold mist, which agents read as steam. The
  label says ICE CREAM, so it passes anyway.
- **References.** tools/fetch-references.js puts Wikimedia Commons photos
  in tools/references/web/. That folder is gitignored and nothing in it
  was committed.
