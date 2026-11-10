# Drawings report — branch `drawings`

Every FOODS entry was audited with a blind recognition test. The ones that
failed were redrawn one category at a time, retested blind, and redrawn
again up to three tries. Anything that still failed is flagged below.
Fallback (FoodKeeper-only) items keep their category's generic shape. The
hand-tuned drawings were not touched: mushroom, potato, apple, banana,
tomato, lemon, lime, mango, watermelon, kiwi, guava, milk, eggs, hard
cheese, butter, tofu and the leftovers.

One commit per category: leafy greens, vegetables, fruit, protein, dairy,
cooked and deli, condiments, drinks, frozen. The drawing spec is in
CLAUDE.md under "Drawing spec". Main was never merged or pushed.

## Sheets (tools/screenshots/, gitignored)

| What | Where |
|---|---|
| Before, per category (main's index.html) | `before/sheet-<category>.png` |
| After, per category | `after/sheet-<category>.png` |
| Everything flagged | `flagged/sheet-<category>.png` |
| Every place each food is drawn (shelf, door bin, used some, cling film, freezer burn, dish) | `drawings/contexts-<category>.png` |
| Final unlabelled sheets, to run the test with people | `blind-final/sheet-{fresh,decayed,phone}-N.png`, `blind-final/pairs/`, answers in `blind-final/key.json` |

`node tools/drawings-study.js sheet <out> [key,key…]` renders a labelled
sheet; given keys, it renders only those foods (that is how the flagged
sheet is made). `blind <name>` renders the unlabelled sets.

## Blind test, before and after

The test was run by separate subagents that never saw the code or the
names. Each drawing was shown alone and unlabelled, and the question was
open-ended: what food is this? A reasonable name counted as correct. Each
drawing was shown three ways: fresh at large size, at 100% decay, and at
phone shelf size. Confusable pairs were also shown side by side, with
"which is which?". Each round used four fresh agents.

"All" counts drawings that passed every way and every pair they're in.
"Pairs" counts pair checks: each pair is counted once for each of its two
foods. The "after" column is the round that was kept.

| Category | n | Before: fresh / 100% / phone / pairs / **all** | After: fresh / 100% / phone / pairs / **all** | Rounds (all) |
|---|---|---|---|---|
| Leafy greens | 18 | 0 / 1 / 1 / 0/18 / **0** | 15 / 9 / 13 / 18/18 / **7** | 5, 8, 7 (kept 3) |
| Vegetables | 32 | 8 / 7 / 8 / 11/21 / **4** | 32 / 29 / 32 / 20/20 / **29** | 24, 25, 29 |
| Fruit | 32 | 31 / 16 / 30 / 17/17 / **15** | 32 / 21 / 32 / 16/16 / **21** | 21 |
| Protein | 10 | 4 / 1 / 4 / 6/12 / **1** | 9 / 8 / 9 / 10/12 / **6** | 6, 9, 6 |
| Dairy | 13 | 4 / 5 / 4 / 2/12 / **2** | 11 / 12 / 10 / 12/12 / **9** | 7, 8, 9 |
| Cooked & deli | 9 | 4 / 4 / 3 / 5/5 / **3** | 9 / 8 / 9 / 4/4 / **8** | 7, 8, 7 (kept 2) |
| Condiments | 19 | 6 / 9 / 5 / 5/11 / **3** | 15 / 16 / 16 / 8/10 / **14** | 12, 13, 14 |
| Drinks | 24 | 14 / 11 / 12 / 4/8 / **9** | 19 / 21 / 16 / 6/8 / **15** | 13, 15, 14 (kept 2) |
| Frozen | 6 | 3 / 1 / 3 / 4/4 / **1** | 5 / 6 / 5 / 4/4 / **5** | 4, 5, 4 (kept 2) |
| **Total** | **163** | **74 / 55 / 70 / — / 38** | **147 / 130 / 142 / — / 114** | |

The pair sets changed a little between rounds as new confusables turned
up, so the pair denominators are not always the same before and after.

Where a later try scored worse, the better earlier try was kept: leafy
round 3, cooked try 2, drinks try 2, frozen try 2. Protein ships round
3's drawings. They differ from round 2's (9/10 all-pass) only in ground
turkey's colour, and turkey failed both rounds. Round 3's lower score
comes from the chicken breast/thigh pair (a coin flip) and one beef miss
at decay, on drawings that didn't change. (The protein commit message
says "best of three: 9/10"; that was round 2's score, not the shipped
round's.)

## Flagged (still failing after three tries, or noted)

Leafy greens. Every flag below is a single miss, mostly at 100% decay,
when all the greens have browned:
- celery read as asparagus
- napa cabbage read as romaine hearts (also at phone size)
- gai lan read as basil
- water spinach read as tarragon
- cabbage read as iceberg lettuce
- choy sum read as Thai basil
- cilantro read as watercress
- basil read as mint (decayed and phone)
- kale fresh and phone read as perilla or collards
- romaine fresh read as yu choy once (it passed rounds 1–2)
- garlic chives at phone size read as garlic scapes

Vegetables, at decay only:
- baby carrots read as fava beans
- winter melon read as papaya or chayote
- daikon read as parsnip

Fruit, at decay only: avocado, honeydew, guava, coconut, mandarin,
grapefruit, fig, orange, persimmon, blackberry and raspberry. These are
mostly approved drawings. At 100% every fruit browns toward the same
hue, so the shape is all that's left (see the recommendation below).

Protein:
- ground turkey reads as ground pork (turkey was the second guess)
- beef at decay read as ground pork once
- the chicken breast / chicken thigh pair is only a guess

Dairy:
- heavy cream: a blank gable carton is told from milk only by its size
  and band colour; it read as eggnog once
- cottage cheese at phone size reads as yogurt with granola
- cream cheese at phone size read as butter, and as tofu at decay; it
  never failed the same way twice
- milk (unchanged) read as buttermilk once

Cooked and deli:
- fresh salsa at 100% decay reads as diced fruit, because every colour
  browns together
- hummus at decay read as coffee once

Condiments:
- tahini reads as peanut butter or hummus
- oyster sauce reads as soy or Worcestershire; in real life dark sauces
  are told apart by their labels
- teriyaki read as sesame dressing or Worcestershire in round 3
- soy sauce read as Worcestershire once
- jarred salsa at phone size reads as marinara

Drinks:
- hard cider reads as lager beer every way
- tequila reads as white wine, grappa or white rum
- vermouth reads as rosé or orange wine
- rum reads as whisky; the darker try read as soy sauce
- baijiu reads as red wine or sake
- gin, cream liqueur and mezcal fail only at phone size

Frozen:
- ice cream: a blank pint reads as yogurt or milk; the cold mist read as
  steam
- frozen dumplings (unchanged) read as cookie dough once

The pattern behind most of the rest: without lettering, a bottle or carton
is told apart only by its form and colour. Real people tell oyster sauce
from soy sauce, or cider from lager, by reading the label.

## Notes and recommendations

- **Decay hue (HUE_TRACE).** Most of the remaining misses happen at 100%
  decay. natureColor pulls every food toward the same brown, so a fruit or
  green keeps only its silhouette. I'd suggest keeping a trace of each
  food's own hue at 100% (a fraction of the fresh hue mixed into the decay
  brown). It is not done here because it would recolour approved drawings.
- **The suite is 95 of 96 on every commit, as on main.** The one failure,
  migrationScenario ("ledger lost in migration"), fails on main too and is
  unrelated to drawings.
- **Test bias.** Each category was retested with only its own foods in the
  set, so the agents may have guessed the category. The before test
  covered every food at once, which makes it slightly harder. The after
  numbers are optimistic by that much.
- **Grader.** The answer patterns for frozen berries and frozen
  vegetables were widened to accept "mixed berries" and "mixed
  vegetables". Regrading the before test with them changed nothing.
- **Agent variance.** A drawing that wasn't changed sometimes failed once
  (milk, frozen dumplings, hummus). Single misses like these are noted
  but weren't redrawn.
- **References.** tools/fetch-references.js puts Wikimedia Commons photos
  in tools/references/web/. That folder is gitignored and nothing in it
  was committed.
