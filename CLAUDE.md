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
- Shelf-life values come only from USDA FoodKeeper (tools/data/
  foodkeeper.json, unmodified; tools/data/README.md says where it came
  from). Every FOODS entry carries its FoodKeeper id as fk. The rule:
  1. Column: refrigerator, counted from purchase -- DOP_Refrigerate, else
     Refrigerate. Never the after-thawing values except for Thaw (see
     The freezer, below -- a deliberate exception), and never the
     after-opening ones except for wine: entry asks "Opened" or
     "Unopened" (the last choice per wine the default), and an opened
     bottle counts Refrigerate_After_Opening from purchase (FOODS[key].
     opens, it.opened). Unopened wine has no refrigerator figure, only a
     pantry one, and counts by that (red #462 5 years, white #463 2).
     Sparkling wine, rosé and vermouth ask it too (see rule 5), and so
     does every condiment FoodKeeper gives an after-opening figure
     (Refrigerate_After_Opening): ketchup #348, mayonnaise #350, mustard
     #351, soy and teriyaki sauce #360, oyster sauce #434, hoisin #435,
     salad dressing #356, creamy dressing #623, vinaigrette #625, jam and
     jelly #347, barbecue sauce #340, pickles #353, jarred salsa #357,
     tahini #416, horseradish #346, pesto #354. Unopened, a condiment
     counts its pantry figure (DOP_Pantry; pantryFig -- FoodKeeper gives
     none for the refrigerator unopened, as for wine), except horseradish
     and pesto, which have a refrigerator one (DOP_Refrigerate). Hot sauce
     #559 (sriracha under it; pantry 6 months), relish #500 and butter #1
     have no after-opening figure and ask nothing. Nothing else has an
     "opened" state.
  2. Foods usually kept out of the fridge use the pantry value instead
     (DOP_Pantry, else Pantry): bananas, potatoes, sweet potatoes, whole
     onions, garlic, tomatoes, winter squash, whole spaghetti squash,
     pumpkins, avocados, bread and bagels, whole coconuts, cantaloupe and
     honeydew (FoodKeeper ids 251, 297, 422, 294, 285, 306, 303, 596,
     298, 250, 195, 460, 461, 574, 449, 258, 496, 497). If the
     pantry value is "When Ripe", use the refrigerator number.
  3. Ranges: the upper end. Do not go past it to be friendlier -- raw
     chicken is 2 days.
  4. Units: days x1, weeks x7, months x30, years x365. Hours give no value.
  5. No number:
     - Package use-by date (milk and similar): ask for the date printed on
       the package at entry, and ask it on its receipt line (pkgDate).
     - No printed date and no FoodKeeper number (tomato, and the
       vegetables FoodKeeper doesn't list): keep the current number,
       marked estimated:true, with a note saying why.
     - A food FoodKeeper doesn't list can be added to FOODS as estimated
       only with a cited source -- a university extension service's own
       storage figure, upper end of its range -- named in a comment above
       it and in its note (figs, persimmons, Asian pears). With no
       credible source it stays out.
     - Anything that matches nothing needs a date before it can be saved.
       There is no default shelf life. Beer, canned beer, hard cider and
       hard seltzer are in FOODS for their drawings and placement, but
       FoodKeeper lists none of them (#662 Apple cider is fresh juice),
       so they have no fk and always ask for the printed date (pkgDate).
       Cream liqueur is #540 (unopened, pantry 8 months, nothing asked).
       Sparkling wine (champagne, prosecco, cava), rosé, vermouth, sake
       and soju have no FoodKeeper entry. The first three are estimated
       from Iowa State University Extension's "Not All Alcohol Gets
       Better with Age" (2020), which gives opened bottles only:
       sparkling 3 days, rosé 7, fortified wines (vermouth) 4 weeks.
       Entry asks "Opened" or "Unopened"; opened counts that figure from
       purchase (opens), unopened asks for the printed date (pkgDate) --
       its receipt line asks the date only for an unopened one.
       No extension service gives a figure for sake or soju: printed
       date only. All five are refrigerated (door bins).
     - No spoilage limit at all (FoodKeeper "Indefinitely": #539 Hard
       liquors -- vodka, gin, rum, tequila, mezcal, baijiu, whiskey,
       bourbon, scotch, brandy, cognac, plain liquor/spirits): keeps:true. No countdown and no decay; left out of
       the headline, the decay line and every at-risk count (counted()),
       but in All items ("keeps", plain ink) with Used and Tossed, and in
       the waste ledger. A Use by set in the popover starts a countdown.
     - A refrigerator number FoodKeeper says "applies to ripe fruit"
       counts from ripeness, not purchase (avocados, bananas, peaches,
       pears, plums, kiwi, apricots...; ripens:true). At entry the
       person picks "Ripe" (clock starts at purchase) or "Not ripe yet"
       (no countdown, no decay, labelled ripening, until "It's ripe"
       starts the clock that day); their last choice per food is the
       default. Pineapple is the exception: sold ripe, it counts from
       purchase (FROM_PURCHASE in the import script).
  Changing a FOODS number moves the expiry of items already saved under
  it (records store the purchase day). A date the person gives -- a
  package date at entry, or one set later in the popover -- is stored on the record and never recomputed. Bought
  can be corrected in the popover too: Use by moves with it by the
  item's shelf life unless the person set Use by. Bought can't be in the
  future or after Use by. Editing either date is a correction: it never
  touches the waste ledger or the restock count. Nothing counts as waste unless the person tosses
  it: a past-date item stays in the drawer until they act on it.
  6. Matches: the same food, or the same species under a generic
     FoodKeeper entry. A different species or variety is not a match.
  7. The freezer. Freezer value: DOP_Freeze, else Freeze, upper end, same
     units; "Not Recommended" means it can't be frozen (lettuce,
     cucumber, eggs in shell, citrus, avocado...); "Indefinitely" means
     no freezer limit. After thawing: Refrigerate_After_Thawing, upper
     end -- only #134 chicken nuggets (2 days), #641 frozen edamame (7)
     and #657 frozen polenta (5) have one. Both come from FK_FREEZE,
     generated by the import script beside FK_TABLE. An item only ever
     kept frozen (no refrigerator or pantry figure, a freezer value, and
     "Food Purchased Frozen" or an after-thawing figure: ice cream,
     frozen edamame, chicken nuggets) is in FK_TABLE as store 'F' with no
     days, and goes in frozen at entry. FOODS has five bought-frozen
     entries (keptFrozen, no shelf): ice cream #317, ice pops #318
     ("popsicles"), frozen berries #315, frozen vegetables #331, frozen
     pizza #571 -- #331's and #571's refrigerator figures are "for storage
     after cooking", not for the frozen product, so they have none.
     Frozen dumplings (potstickers, gyoza, wontons, bao) are #330
     "Frozen entrees (prepared meals)", 12 months: frozen prepared foods
     cooked from frozen, the freezer value quality only.
  8. Leftovers: #173 (with meat, fish, poultry or egg) and #174
     (without), 4 days refrigerated, freezer 90 and 60. After Cook this,
     the board asks "Any leftovers?" (leftoversAsk); Yes puts a container
     named for the dish (it.name) in the fridge, #173 if the dish used
     meat, fish, poultry or egg, else #174 (leftoversOf), with Undo; No
     drops the question. Typed, "leftovers" or "takeout" asks which, and
     keeps the typed word as the name (named). Leftovers are never a
     usual (noUsual) and behave like any item: decay, Used, Tossed,
     Freeze.
     - Freeze (popover) only for a food with a freezer value, not past
       date: into the freezer (it.frozen), the clock restarted today
       (it.clockFrom) on the freezer value; a date set before no longer
       applies. A spirit can go in too, its clock untouched.
     - Thaw (popover, or the frozen item's row in All items): back to the
       fridge (it.thawed), the clock restarted today on the after-thawing
       value -- the one exception to "never the after-thawing values",
       made on purpose so a thawed item counts honestly. With no
       FoodKeeper after-thawing value, raw poultry, ground meat (fresh raw
       sausage too: Italian, fresh chorizo, fresh bratwurst, uncooked
       links), stew meat (and cubes) and raw seafood take 2 days and red meat cuts (steaks,
       chops, roasts) 5, from the thaw date: USDA FSIS "The Big Thaw", as
       cited by MSU Extension E3259 "Thawing Foods Safely" -- thawed in
       the refrigerator they keep an additional 1-2 days, red meat cuts
       3-5; upper end (THAW_BIG, by FoodKeeper id). The popover names that
       source before and after thawing. Anything else (vegetables, cooked
       fish and shellfish, variety meats, smoked or precooked sausage) asks for a
       use-by date first; from the row, Thaw opens the popover on that
       date. A spirit has "Take out" instead, no clock change.
     - Frozen food never spoils. USDA FSIS "Freezing and Food Safety":
       food kept at 0 °F is always safe, freezer storage times are for
       quality only, and freezer burn doesn't make food unsafe. So a
       frozen item never becomes past date and never goes to the crisper,
       Toss all or the gone count. When its freezer time runs out the
       popover reads "Best quality passed" (its date is "Best by", not
       "Use by") and the freezer burn is at its heaviest; it stays in the
       freezer until the person thaws, uses or tosses it.
     - Freezing pauses decay, it doesn't undo it: the item keeps the
       decay it had when frozen (it.decayFrom), drawn under the frost.
       After Thaw it carries on from that level and reaches its last-day
       level at the thawed use-by date (decayFraction); it never jumps
       back to fresh.
     - Entering frozen food: "frozen" in a typed or scanned name ("frozen
       shrimp"; a receipt line printed or expanded with it) puts it in the
       freezer, its freezer value counted from purchase; its receipt line
       carries a "freeze" toggle (the last choice per food is remembered
       for restock). A frozen entry whose plain
       match has no freezer value takes the kept-frozen FoodKeeper item of
       the same name if there is one (frozen edamame -> #641); otherwise
       it asks for a date, which governs in the freezer. A food FoodKeeper
       says not to freeze has no toggle; typed with "frozen", it stops on
       the receipt and says it goes in the fridge.
     - Frozen items have no countdown (leftAt is Infinity, as for keeps):
       out of the headline, the decay line, every at-risk count
       (counted()), the Kitchen and Tonight's dish; in All items as
       "frozen" in plain ink. Freezing records nothing in the ledger; Used
       and Tossed count as usual. Saved data from before the freezer
       loads with nothing frozen.
  Foods not in FOODS fall back to FK_TABLE in index.html, generated by
  tools/import-foodkeeper.js under this same rule -- never edit it by
  hand; change the script and run it again. Names match whole (FOODS,
  then a FoodKeeper name, then a FoodKeeper keyword), never by one word
  of several: "apple juice" is not Apple. Equal matches ask.
- English only. Typed entry, autocomplete, receipt scanning and every
  placeholder work in English; FOODS carries
  no other-language synonyms. The single exception is LEGACY_ZH in
  index.html, a frozen table that migrateLegacyNames() uses once to move
  saved Chinese-named custom items onto their English FOODS keys (schema
  2). Nothing else reads it; do not extend it or use it for lookup.

## Visual system — derived, not decorative

Two colour roles, kept apart on purpose. Urgency — how soon something
turns — is told only by the decay-sequence palette below, and it appears
in exactly five places: the line-art row's labels (name and days left),
the fridge's popover, the decay line, its legend, and the Kitchen tab's
count of counter food within 72 hours ("Kitchen · 2", --crit). Do not
add colours outside this set for urgency, and do not let urgency colour
migrate anywhere else.

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

The rest of the page stays in the cold fridge palette above. Food bodies
are the one deliberate exception: they are told by what they actually
look like decaying, not by urgency, and that means drawing them in clear
natural colour on purpose — a lemon-straw banana, a true orange-red
tomato, a true red apple, a golden tan potato, leaf greens for spinach
and its relatives — so that losing that colour to decay reads as a loss,
not as a shift between two already-muted tones. Every FOODS entry
carries its own base colour (FOODS[key].base in index.html), including
the ones still on generic shapes, like a hand-tinted botanical plate
rather than a photo. A mustard mushroom turning bruise-plum read as a
dye, not a mushroom: urgency and decay are different questions, and one
fill trying to answer both was the mistake this corrects.

Distinctness from the three urgency colours is by hue, never by greying
a food's colour down — muting was tried and it pushed apple toward mauve,
close enough to the plum label to read as the same signal. Reds lean
orange, away from the plum's purple side. Yellows lean lemon, away from
the ochre's dull side. Greens lean leaf, away from the olive's dull side.
Hue is what keeps a body from ever being misread as an urgency colour;
lightness and saturation are free to follow the real food.

natureColor(base, fraction) blends that base colour toward a shared decay
brown as fraction climbs, but slowly: a food keeps its own hue clearly
recognisable through roughly 60% decayed (discoloration spots appear on
top of it well before that), and only closes out to brown by around 85%.
Past that it goes darker still, but never to black — 100% decayed lands
on a deep brown that still carries a trace of the food's own hue, so a
rotten tomato reads dark red-brown, a rotten potato dark earth brown, a
rotten banana dark brown with a trace of its own warmth, never the same
black lump every food collapses into. This applies to the gone drawer
too, at fraction 1 through the same function — shrinking, collapse, and
mold are what carry "gone," not blackness. Colour draining away is
itself part of decay, not an early cue that fires before anything else
does, and not the thing that erases a food's identity at the end. These
tones sit outside the decay-sequence set above deliberately — they are
not a second brand palette, and nothing else on the page should start
using them.

The real fridge's body is the second exception, for the same reason:
it is an illustrated object like the food, not page UI, so it is drawn
in a muted cream (the cream body option, chosen over a cool white-blue
one) with its own two or three flat shade tones, scoped to that drawing.
Its interior stays a pale cold blue. The page, the type, the tags and
every control stay in the cold fridge palette above; the cream never
leaves the fridge body. The kitchen counter is the third exception, on
the same terms: a pale cold stone top, a bleached cutting board and a
grey glazed bowl, a few flat tones scoped to .kc-unit. The grocery bag
is the fourth: a muted kraft front, side and mouth (--bag-1, --bag-2,
--bag-3, --bag-in) and an off-white thermal receipt (--receipt), scoped
to .bag; the kraft never leaves the bag.

Food bodies are line-drawn, not flat fills: a thin ink outline over the
natural-tone wash, identity from a few interior lines (mushroom has a
real cap-and-stem with gills; the other categories carry a basic version
of the same language — a few creases — not yet bespoke per category;
every fruit has its own outline and one identity cue, FRUIT_OUTLINES and
FRUIT_CUES: a pineapple's crown and crosshatch, a strawberry's seeds and
calyx, a lemon's pointed ends, a pair of cherries on joined stalks; a
few carry a second natural tone, FRUIT_WASH -- a mango's blush, a
watermelon's bands, a cut kiwi's face -- that decays through natureColor
with the body), and
decay drawn in line as much as in colour — wrinkles that multiply,
brown discoloration that appears before mold does, an outline that
shrivels inward as it shrinks rather than stretching or twisting. A
field-guide specimen plate, not a cartoon or an illustration style.
Packaging is the exception (PACKAGED_SHAPES: the dairy tub, the deli
container, the sealed packet, the carton): the food is out of sight, so
the package keeps its own colour and rigid outline, and decay shows only
in small signs on it -- a bulging lid, a little mold at the seam, a
label that fades. Bottles and cans (the drinks category) are packages
too, drawn from a few shared forms (BOTTLE_PROFILES: long-neck, can,
still wine, sparkling with foil and wire cage, tall spirit, short square
whiskey, small green, sake), told apart by glass and drink colour
(BOTTLES): the glass never changes, a blank plain label fades, and an
opened wine (red, white, rosé, vermouth, sparkling) shows its wine
darkening toward brown through the glass. Sparkling wine uses the
sparkling form, rosé and vermouth the still wine form in clear glass,
sake the sake form, soju the small green bottle. No
brands, no lettering. Their square is drawn larger in the illustrated
fridge (BOTTLE_BOX), since a bottle is a narrow sliver of it.
Frozen food doesn't rot: it is drawn at the decay it had when frozen
(it.decayFrom; fresh if it went in fresh) and shows freezer
burn as its freezer time runs out (freezerBurnMarkup, burnFraction) -- a
pale frost rim inside the outline that thickens, a fine broken line of
crystals along it, and pale dry patches spreading across the surface,
over any drawing, food, package or bottle. A spirit keeps: only the thin
rim. tools/freezer-burn-study.js shows it at 0/50/100%. Refrigerated
drinks live in the door bins (toDoorBin) unless urgency puts them at eye
level; room-temperature ones stand on the kitchen counter (see Kitchen).
Condiments live in the door bins too, and butter (the door's butter
compartment); past nine, the bins share them evenly so none goes
undrawn. In the bins size doesn't tell urgency: each item stands about
one and a half times the bin front's height (binItemU; a wine bottle a
little more, a jar, a can or butter less), its width from its own form,
and the bin's front and solid lip are drawn over its lower part, so it
stands inside the bin. On a phone the door opens only to square and its
bins can't be seen: these stand on the upper shelf, sized by urgency. They are packages drawn from three more shared bottle forms
(squeeze bottle, glass jar, narrow sauce bottle; CONDIMENT_LOOKS) and
the butter block: the contents show through clear plastic or glass in
their natural colour, the blank label fades, and an opened one is used
down a little, its contents darkening toward brown as its time runs
out. Frozen packages and leftovers are vessels (VESSELS): an ice cream
tub, a freezer bag with its pieces showing (berries, vegetables,
dumplings), a flat
box (pizza, ice pops), and a clear lidded container whose food browns
and molds, with a strip of tape carrying the dish's name -- the one
place a drawing has lettering, because a real one would.
tools/fridge-contents-study.js shows them all.

Type: Caslonian (caslonian-std-l) for the wordmark, the headline, dish
names, and body text — regular and bold only, the two weights the family
has; nothing is synthetically bolded or italicised beyond what it ships.
Tonos Mono (tonos-mono-vf) for all dates, counts, labels, and buttons.
No third family. Section titles are Caslonian at about 22px, sentence
case; the small mono caps stay only on data labels, axis ticks, legends,
chips and buttons, so a title never reads as data. Food names keep their
own capitals wherever they appear ("Chinese broccoli", never lowercased
mid-list).

The page is three parts, in this order, about three times as far apart
as anything within one, with rules only between parts: Fridge / Kitchen
(the tabs are its title; the grocery bag is inside the Fridge panel;
All items under the swipe area); What's turning (the headline, its subline, and
the decay line under its own small title); and So far (the ledger). All
items, What's turning and So far are full width, below and outside the
swipe area. There is no voice entry. Both come from an Adobe Fonts web project tied to a
Creative Cloud subscription (use.typekit.net/han2bam.css), not a public
CDN — fallbacks are Georgia/serif for Caslonian and ui-monospace for
Tonos Mono, so the page still holds together if that stops being served.

Signature element: the fridge, then the decay line. The decay line
showed the dates but didn't make you feel what you were about to lose —
the fridge is the answer to that, so it opens the page: closest-to-expiring
sits large at eye level, front and centre, safe things recede smaller,
the way looking into a real fridge does before you've read a single
number. The decay line follows, a 21-day horizon on a square-root scale,
every item pinned at its expiry — it carries the dates, now that the
fridge carries the feeling. One baseline, no gridlines: Today, 72 h,
1 week, 3 weeks marked under it, past-date items on a short dashed stub
left of Today, Today to 72 h drawn heavier in plum. One label per day up
to a week ("2 days · Strawberries, salmon"), in that day's urgency
colour, never crossing the line or each other; further out is a dot
only. Both read from the same shelf-life math (leftAt, pos) and must
never disagree with each other.

Fridge and Kitchen are two panels side by side in one horizontal swipe
area on every screen size, desktop included (native scroll snapping,
scroll-snap-type: x mandatory, each panel the area's full width,
overscroll-behavior-x: contain so a swipe never triggers back/forward),
with tabs above ("Fridge", "Kitchen · 2") in Caslonian, the active one
underlined, in sync both ways (initRooms): a swipe moves the underline,
a tab or an arrow key scrolls to its panel, instantly under
prefers-reduced-motion. The page always opens on Fridge; the area is as
tall as the active panel; on a phone about 16 px of the other panel
shows at the edge. Food and the fridge door are touch-action: pan-y, so a
tap there never starts a swipe. showRoom(i) switches panels from outside
the tabs. Nothing scrolls the area vertically: jumpToAdd scrolls the
window, never scrollIntoView, which would scroll the area itself.

Every action on the page is a physical object drawn in the fridge's
line-and-wash: the fridge is for looking, a paper grocery bag is for
putting things away, a plate (to come) for using things up, a bin (to
come) for what's thrown away. Everything drawn is real data; no
decorative props.

The Fridge panel, on desktop, is the fridge (its column exactly the unit
plus the open door's room) and, beside the open door, the grocery bag's
column, 330 to 380px -- narrower than the Add column it replaced; width
the fridge can't use under its height cap is left at the right. On a
phone the bag stands under the fridge in the same panel. There is no
"Add food" heading. The bag stands on the fridge's floor line (its foot
line; on desktop the bag's column runs from the fridge's top to that
line and never makes the row taller -- the receipt's lines scroll inside
it when there are many). Top to bottom:
- The receipt (pendingItems), a strip of thermal paper rising out of the
  bag's mouth, its tail behind the usuals and the bag's front. Its top
  line is Scan receipt (under it, while scanning, "Reading the
  receipt…", an error with Retry, or the scanned receipt's date with
  "Discard scan", which takes only scanned lines off). Then its lines,
  in Tonos Mono: the name on the left (editable; renaming re-matches),
  on the right the days it keeps ("7 days", "frozen · 540 days",
  "keeps", "ripening") or the question it still needs answered ("date?",
  "which?", "ripe?", "opened?"), a small "freeze" text toggle for
  anything that can go in the freezer (none for what FoodKeeper says not
  to freeze, none while a choice between matches is open), and × to take
  it off (a scanned line is voided instead, struck through, + restores
  it). The line never says where its numbers come from or that weight
  and price are estimated: the item's popover says that once it's put
  away. When the food matched is a different name from what was typed
  or scanned (store words cleaned off; normName, so plurals and capitals
  don't count), it shows inline after the name, "juice → Apple juice",
  so a wrong match is easy to catch. Under the name, only the questions
  -- pick a match, Ripe / Not ripe yet, Opened / Unopened, and the date:
  "printed date" for a package-date food (no sentence asking for it),
  "use by" for one that matched nothing. A
  first-time ripe or opened choice is left unanswered ("ripe?",
  "opened?"); unanswered, Put away counts the default (Ripe, Unopened),
  and a remembered choice is the default and shows its days. The
  receipt's next line is the entry field itself (a real text input,
  placeholder "what did you buy?"; suggestions in the flow under it, as
  the receipt's next lines; "2d" after an item still dates it two days
  back). Enter prints the field as lines; nothing reaches the fridge
  until Put away.
- Usuals: the six most-bought peek out of the bag's mouth, drawn with the
  same food drawings (fresh, decay 0), the bottom of each behind the
  bag's front, a small name label on the front under each. Tapping one
  prints it on the receipt (a restock line: Put away refreshes a fresh
  one already in the fridge, as restock always has). "+N more" (the real
  count) is a small text control on the bag's front; it opens the rest as
  the same small drawings, heaped over the mouth in wrapping rows, never
  sideways, and "Show fewer" closes them; Edit (tap a drawing to remove
  it from the usuals) lives in the open state or whenever all of them
  already show. Open or closed is remembered per device (localStorage
  perishable.usualsOpen, in try/catch).
- Put away (#addbtn; interface text only), on the bag's front, with what
  it waits for under it ("1 needs a date or a match first"). It prints
  anything left in the field first; a line just printed that asks a
  question stops there so it can be answered. Otherwise every line goes
  in at once (commitItems), to its automatic place: fridge, freezer or
  kitchen bowl. Each then flies from the bag's mouth to its own drawing,
  one after another (flyPutAway: 240 ms apart, 620 ms each, the drawing
  hidden until it lands; the freezer opens for frozen food, a shut
  fridge door for fridge food, and bowl food flies to the Kitchen tab);
  reduced motion skips the flight. One toast ("5 put away", any restock
  note after it) with Undo covers the whole batch: new records out,
  restocked ones and the usuals as they were, the lines back on the
  receipt.
The top bar's Add switches to the Fridge panel first, then scrolls to the
bag and focuses the receipt's field. Tonight stays reachable from the
Fridge panel: under the bag, one line "Tonight <dish> →" that switches
to the Kitchen panel, and in the fridge the items tonight's dish uses get
a thin ink line traced around their own outline (rfTonightRing, an SVG
filter, not a box; no urgency colour). With no dish (tonightDish null),
no line and no outline. On a phone the usuals, the receipt's field, its
× and questions, Scan receipt, "+N more" and Put away are 44px tap
targets, and the receipt grows as long as it needs.

Kitchen is a small counter drawn in the fridge's line-and-wash: a counter
top, a cutting board and a bowl, nothing else. The board carries
Tonight's dish: its owned ingredients drawn with the same food drawings
and decay, the dish name, "Saves about 0.9 kg · $11.20" under it (the
at-risk ingredients, what Cook this credits), the "uses up" line, Cook
this and Show another. Tomorrow and The day after follow as text under
the counter. The bowl holds what's kept out of the fridge (onCounter:
store:'pantry' foods -- potatoes, onions, garlic, bread, whole melons,
coconut -- plus bananas) and anything marked "Not ripe yet"; those leave
the fridge shelves. A ripe avocado goes in the fridge; only an unripe one
is in the bowl. Drinks never go in the bowl: one counted by a pantry
figure (store:'pantry' -- spirits, unopened wine, cream liqueur;
drinkOnCounter) stands upright at the back of the counter behind the
bowl; one counted in the refrigerator (beer, cans, an opened wine) goes
in the fridge's door bins, or the upper shelf on a phone. Counter food that tonight's dish uses is on the board,
not also in the bowl. More than three in the bowl (two on a phone) heap
in two rows, drawn larger on a phone. On a phone the peek beside the
fridge is the counter's edge: the kitchen's text is hidden (opacity)
until its panel is active. Past
date, they go to the crisper with everything else past date, so Toss all
stays one place. Counter food is never out of the count: the headline,
the decay line and All items include everything.

Two fridge views, one after the other, from the same `fridge` array.

The illustrated fridge opens the page: a literal drawing of a fridge
(door, shelves, crisper, door bins, and the freezer compartment at the
top). On desktop it keeps its aspect ratio (360:640, never stretched)
and scales to fit its column (the unit plus the open door's room, 1.86 x
--rf-w), capped at about 90% of the window height -- a cap, not a fixed
height -- and lower on a short screen, so the whole fridge, freezer to
crisper, is inside the window under the bar and the tabs, which are
compact on desktop for it (about 96px above the fridge). On desktop the
door swings fully open, to about 180 degrees: its inside, with the door
bins, faces the viewer front-on beside the fridge, in the same flat
front view as the interior, not at an angle (an angled door was the one
part of the drawing in another perspective). The load animation swings
it from closed to fully open; the freezer door opens the same way. On a
phone the door turns only to square. At 1280 x 800 the unit is 386 px
wide, at 1440 x 900 also 386 (443 before, when the door opened to 116
degrees and took 1.5 x). The freezer has its own door on the same right-hand hinge, closed
on every load, opened and closed by its handle (or its inside face once
open); the door front carries a small count ("3 inside", "empty"),
which opens it too when tapped.
Inside, one wire shelf and frost on the walls, in the same line-and-wash,
with its own one-point perspective (FZ, fzP); every frozen item stands
on that shelf at one size (bottles taller), since nothing frozen is
urgent. See REPORT.md for how it was first
built. It tells urgency by position, size and decay only: no tags or
labels under its items. Every item is a button (pointer, a slight lift
on hover, a focus ring) that opens the popover: name, status, Bought and
Use by (both editable), shelf-life source, Est. weight, It's ripe for a
ripening item, Freeze or Thaw (rule 7), Used and Tossed, and a quiet Remove link for an item
logged by mistake (removeFridgeItem: out of the fridge, not waste, its
restock count undone; the toast offers Undo, as for Used and Tossed).
Dragging moves food between places, never to a spot: position stays
automatic by urgency (rfInitDrag, Pointer Events, no library). A fridge
item dropped on the freezer, door open or closed, is frozen (freezeItem);
a frozen one dropped on the fridge is thawed (thawItem), with the Thaw
button's rules and its date prompt; once it's thawed, a closed fridge
door opens so it can be seen where it landed, as the freezer's door does
on a freeze (a spirit taken out to the counter leaves it shut). While dragging, the valid zone gets
a quiet outline, and a closed freezer door opens a little while food is
held over it; something FoodKeeper says doesn't freeze well, or past
date, gets no outline and goes back with a one-line note. Every drop
shows the Undo toast, and the item flies to its automatic spot (no fly
under reduced motion). Mouse: press and drag. Touch: hold about 400 ms to
pick up, so a tap still opens the popover and a swipe still scrolls or
switches Fridge / Kitchen. Freeze and Thaw in the popover stay for the
keyboard and screen readers. Placement follows days left: the crisper
holds only items below 0 days. An item on its last day (0 days left,
"today" on the decay line) is the most urgent food still worth saving and
goes front and centre on the eye-level shelf, drawn visibly short of gone
(decayFraction reaches LAST_DAY_DECAY, 0.75, on the last day and 1 only
once the date has passed). Past-date items sit in the crisper, whose drawer
front reads "N past date · Toss all"; Toss all asks right there ("Toss N
past date? Toss N · Cancel") before anything counts as waste.

The line-art row follows, collapsed under an "All items (N)" toggle that
is closed on every load (a <details>, so it opens from the keyboard).
While it's closed, the illustrated fridge's popover is the way to act on
an item, and the crisper's Toss all still works. Opened, it does the job
the list used to: every item drawn by the same food drawings (foodShapeMarkupLine,
natureColor, fridgeCatOf/fridgeShapeOf), on shelves by urgency, with its
name and days left in its urgency colour, and Used and Tossed as small
text buttons under each. Tapping a drawing opens the same popover. On
desktop a shelf holds at most nine items, each in an equal column at
least a label wide, so every label sits in one row under its shelf; a
tenth starts the next shelf down, still in urgency order. On a
phone each button is a full 44px tap target, and each item gets a slot at
least as wide as its label, so a row wraps to a new shelf rather than
letting labels or buttons collide. There is no separate list.

Used and Tossed, from the row or the popover, both run useItem: the same
ledger change, and the toast with Undo for a few seconds, never a
confirmation dialog or anything celebratory. Undo puts the same record
back and takes the same amounts off the ledger.

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

## Testing

The scenario suite is tools/scenarios.js (setup once: cd tools && npm
install). The full suite always runs with the standard command, from the
repo root:

  node tools/scenarios.js

never as a loop over ONLY= (ONLY=someScenario is for debugging one
scenario while working, not for reporting). Every summary of a test run
states that exact command and the runner's own count line, "N of N
scenarios passed" -- if it says fewer than all, say which failed. Every
script in tools/ must run; a study that breaks when the app changes gets
fixed or deleted in the same change.

## Working agreement

- Change one thing at a time. Do not refactor unrelated code.
- Do not restructure the file unless asked.
- After each change, state what you changed and why in one paragraph.
