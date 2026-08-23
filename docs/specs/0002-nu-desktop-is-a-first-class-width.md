---
number: 0002
type: spec
slug: nu-desktop-is-a-first-class-width
title: "Desktop is a first-class width: the responsive contract for nu"
status: planejado
created: 2026-08-23
headline: On a large screen the new UI stops being a phone layout stretched to 760px — a docked folder tree, sortable columns and click-to-select make it something a mouse can actually drive.
tags: [spec, status/planejado]
par: "[[plans/0002-nu-desktop-is-a-first-class-width|plan]]"
---

# 0002 — Desktop is a first-class width: the responsive contract for nu

> `nu` is the second filebrowser UI, living beside the classic one (`docs/nu-ui.md`).
> Its base layer landed in `0affcaee`; [0001](0001-nu-the-rest-of-the-mobile-design.md)
> specs the seven mobile surfaces still missing. Both were drawn, scored and planned
> against exactly one viewport — 390 × 844 — because the design handoff is a phone
> design and says so. This spec is the **other axis**: it makes width a first-class
> variable in `nu`, builds the wide layout the handoff never drew, and — because most
> of the surfaces it would affect do not exist yet — writes down the **contract** every
> card of 0001 must honor so those surfaces are born at both widths instead of being
> retrofitted at one.

**Status:** planejado — spec only. What exists in the tree today is a phone layout with
a single defensive breakpoint: `nu.css:518` centers the column at `max-width: 760px`
above 700px and re-parks the bottom sheet, under a comment that says exactly what it is
("the design is a phone design; keep it readable when it is not a phone"). There is no
second layout, no docked tree, no column grid, no hover state, no pointer-capability
gate. `render_list()` (`web/nu.js:261`) concatenates size and date into one meta string,
so there is nothing for columns to line up. `/planc` mirrors this number.

---

## The thesis

0001's D1 is the load-bearing decision of the whole `nu` effort: **the classic UI is
scaffolding and is meant to die once `nu` reaches parity.** That decision is sound, and
this spec does not reopen it — it removes the hole under it.

Parity in 0001 is measured against a coverage matrix that scores 38 classic-UI
functions. Every one of those scores was taken **on a phone**. The functions that make
the classic UI worth using on a 27" monitor — the docked navpane (`parpane`,
`browser.js:1091`), the multi-column table with sortable headers (`browser.html:93`),
range selection with shift/ctrl (`browser.js:5706`), the keyboard map
(`ahotkeys`, `browser.js:6228`) — are either scored `não migrado` or never appear in
the matrix at all, because a phone has no place to put them.

So the danger is precise: **if the classic UI is retired on a matrix that only measured
one width, the desktop regresses.** A user on a large screen would trade a table, a
tree and a keyboard for a 760px column of 42px chips. This spec exists so parity means
parity at both widths, and it lands **before** the seven mobile surfaces, so they are
built knowing a second width exists.

The cheap-half claim of 0001 holds here too, and for the same reason: this spec adds
**no route, no parameter, no response field**. The docked tree is `?tree=` (`tx_tree`,
`httpcli.py:6062`), the same endpoint the classic navpane consumes (`browser.js:7229`).
Columns are the data `?ls` already returns. Everything else is CSS and event handling.

## The decisions

### D1 — Three widths, one markup

The layout is a function of width in three bands, and **one markup serves all three**:

| band | what it is | why |
|---|---|---|
| `< 700px` | the handoff, unchanged | the design is hi-fi and final at this width |
| `700–1023px` | today's centered column (`nu.css:518`) | tablets and half-screen windows; already correct |
| `>= 1024px` | two columns: docked tree + a row grid with a column header | the width this spec exists for |

**One markup, two layouts** — the wide band is reached by CSS over the same DOM the
narrow band renders, never by a second render function. This is the rule that keeps the
cost linear: every surface 0001 adds writes its nodes once and gets its wide behavior
from a rule, not from a branch. A resize from 1200px to 380px must therefore reflow
without re-rendering, without refetching and without losing sort, filter or scroll —
which is also the cheapest possible test that the rule was followed.

The one deliberate exception is 0001's grid view, which is a genuinely different
renderer over the same `filtered()` output (0001 D7) — it stays that way and simply
gets a wide tile size.

Two sub-decisions that only matter at `>= 1024px`:

- **The content column caps at 1600px.** An unbounded row on an ultrawide monitor puts
  the name and the date a hand-span apart. The tree docks outside that cap, flush left.
- **The wide band defaults to the compact row** (`9px 16px`, the density the handoff
  already specifies) rather than the touch row (`14px 16px`). 44px touch targets are a
  finger constraint; a mouse pays for them in rows-per-screen. The settings toggle
  (0001 card 2) still overrides, and the narrow bands keep the touch default.

### D2 — Capability decides interaction; width decides layout

Width and input are different questions and must be gated by different queries. Layout
keys off `min-width`. **Interaction keys off `pointer` and `hover`**, because a 1024px
touch tablet and a 1024px desktop window are the same layout and emphatically not the
same input.

- Gestures — long-press, horizontal swipe, pull-to-refresh (0001 cards 5–7) — are
  attached only under `(pointer: coarse)`. They are not removed at width; they are
  never installed for a mouse. A long-press with a mouse is an interaction nobody
  expects, and a swipe with a mouse is worse.
- The desktop model, under `(hover: hover) and (pointer: fine)`, is the one the classic
  UI already uses and users already know: **the checkbox appears on row hover**, a
  **click selects, shift-click extends the range, ctrl/cmd-click toggles** (the classic
  UI's own reading of the same modifiers, `browser.js:5706`), and **right-click opens a
  context menu** carrying the actions the swipe reveals on touch.
- A hybrid device gets both, which is correct: the queries are not exclusive, and
  nothing here depends on being the only input model present.
- **Nothing may be hover-only.** Every action reachable by hover must also be reachable
  by a visible control, because a hybrid laptop can be driven by finger at 1400px. This
  is what makes the context menu an *accelerator* for the row's actions, never their
  only door.

### D3 — The tree widget is born here; 0001 wraps it in a sheet

This is the one place where 0002 builds a surface 0001 also lists, and the split is
deliberate: **the tree widget is width-agnostic, its container is not.** The reader,
the lazy expansion, the node render and the current-path highlight are one piece of
code; docking it in a left column is this spec, and wrapping it in a bottom sheet is
0001's card 4. Building it twice is how two UIs for one thing get out of sync.

The widget reads `?tree=<top>` one level at a time, exactly as the endpoint is shaped
(`gen_tree`, `httpcli.py:6088`) and exactly as 0001 D4 already decided — no recursive
prefetch. Three details of that response are not obvious and each one is a bug if
missed:

- The reply is `{"a": [names...]}` plus a `k<name>` key per **already-expanded**
  ancestor of the current path, so the first call paints the path to `vpath` open.
- With dirkeys enabled, names arrive as `name?k=<hash>` (`httpcli.py:6141`). The key is
  part of the href or the folder is unreachable — it must not be stripped as query junk.
- A volume the user cannot enter arrives with a **trailing `\n`** appended to its name
  (`httpcli.py:6160`). That byte is a marker, not part of the name: render it as a
  disabled node, never as a name with a line break in it.
- `dots` rides the query string here too (`"dots" in self.uparam`, `httpcli.py:6114`),
  which is the same plumbing 0001 D3 builds for `?ls` — one preference, both readers.

Deliberately **not** built here: `treesz` (the classic UI's draggable width,
`browser.js:7944`), `parpane` pin/unpin, and `dyntree`. The dock is a fixed width in
this spec; see Open questions.

### D4 — Columns are the row, revealed — so the row must stop concatenating

Today the row's meta is one string built in `render_list()`: `humansize(f.sz) + " · " +
dt_short(f)` (`web/nu.js:280-282`). A string cannot be a column. So the render emits
**separate fields** — name, size, type, date — always, at every width, and the layout
decides what to do with them:

- wide: a CSS grid whose tracks are the columns, with a header row above it;
- narrow: the same fields regrouped into the handoff's exact meta line, with the `·`
  separators supplied by CSS (`::before`), not by the JS.

This is the concrete form D1's "one markup" takes, and it is the only structural change
this spec makes to code that already exists.

The column header is the wide band's sort control, and it is **not a new sort
implementation**: a click calls the existing `pick_sort(k)` (`web/nu.js:350`) with the
same keys `SORTS` already declares (`:131`), including its natural-direction rule. The
sort sheet stays exactly as it is for the narrow bands. Two doors, one state, one
comparator (`sorted()`, `:181`).

### D5 — 0002 owns the width, not the surfaces

The rule that keeps this spec from swallowing 0001: **where a surface already exists,
this spec reshapes it; where it does not, this spec writes the contract and stops.**
The tree (D3) is the single, stated exception.

What this spec **builds**: the three-band contract, the wide two-column shell, the
column grid and its header, the tree widget and its dock, the desktop input model on
the surfaces that exist today (rows, header, sort), and row hover / focus / keyboard
traversal of the list.

What this spec **contracts** — each of these is a clause 0001's re-planned cards must
satisfy, not code that lands here:

| 0001 card | what it owes the wide band |
|---|---|
| 1 — bottom bar + `⋯` router | the action bar is one component with two placements: fixed bottom (narrow) and a toolbar row in the header (wide). Not two bars. |
| 2 — preferences + settings | the settings screen is a centered panel at `>= 1024px`, not a full-bleed sheet; the density toggle honors D1's wide default. |
| 3 — grid + thumbnails | a wide tile size (the 114px tile is a phone tile); tiles fill the capped content column. |
| 4 — tree sheet | consumes D3's widget; builds the sheet wrapper only, and only for narrow. |
| 5 — selection | the checkbox column is permanent-on-hover at fine pointers; long-press is `pointer: coarse` only (D2). Range selection with shift is the wide entry point. |
| 6 — swipe + pull-to-refresh | both are `pointer: coarse` only; the wide equivalent of the swipe's actions is D2's context menu. |
| 7 — image viewer | the wide viewer is not a full-bleed phone overlay: bounded image, actions in a bar, prev/next reachable by the arrow keys. |
| 8 — recursive search | no width dependency; listed so the table is exhaustive. |

**Consequence, stated plainly:** the existing `docs/plans/0001-...` is written against a
single width and must be re-planned (`/planc`) after this spec lands. That is the cost
the ordering was chosen to pay once, instead of paying it eight times as retrofit.

## What is genuinely new, versus what is merely reused

**Genuinely new:**

- **The tree widget** — a `?tree=` reader, an `expanded{}` state, lazy per-node
  expansion, and the three response quirks of D3. `nu` has no equivalent today.
- **The responsive contract itself** — the band tokens, the capability queries, and the
  discipline that keeps a second renderer from appearing. Cheap in bytes, and the whole
  point of the spec.
- **The column grid and its header** — plus the row's field split (D4), which is a
  small change to `render_list()` with a large blast radius, since every later surface
  renders through it.
- **Desktop input** — hover, focus rings, arrow-key traversal, and the context-menu
  scaffold. `nu.js` today attaches exactly one keyboard handler (`Escape`, `:446`).

**Reused, not rebuilt:**

- `?tree=` (`httpcli.py:6062`) — the same endpoint the classic navpane already drives.
- `pick_sort()` / `sorted()` / `SORTS` (`web/nu.js:350`, `:181`, `:131`) — the column
  header is a second trigger for the existing sort, not a second sort.
- `filtered()` / `draw()` / `take()` (`:209`, `:302`, `:365`) — the load-and-render
  cycle is untouched; width never enters it.
- `nm()` / `dt_short()` / `humansize()` (`:33`, `:64`, `:75`) — the field split feeds
  the same readers into separate cells instead of one string.
- The token layer in `nu.css:5-41` — the wide band adds no palette, only geometry.
- `keep()` / `unpin()` (`:156`, `:163`) — the `?nu` mode plumbing is width-blind.

## What the server must provide

Nothing. No new endpoint, no new query parameter, no new response field, no config
flag, no new file under `web/` (so neither `RES` in `copyparty/__init__.py` nor
`scripts/sfx.ls` is touched). If a commit finds itself editing `httpcli.py`, that is
the signal to stop and reopen this spec.

## Out of scope (named, deferred)

- **The full keyboard map.** `ahotkeys` (`browser.js:6228`) is a large surface with a
  help overlay and a konami branch. This spec builds arrow/Enter/Escape traversal of the
  list — the minimum that makes a mouse-and-keyboard session not feel broken — and
  leaves the map to its own spec, where the shortcut *table* can be designed rather than
  transcribed.
- **Drag & drop upload.** It is the desktop's native upload gesture, and it belongs to
  the upload spec (0001 D2) — building the drop target before the uploader exists would
  produce a target that swallows files.
- **The 18-item context menu.** D2 builds the menu with the actions `nu` has; the
  classic UI's full file manager (rename, cut/paste, share with password and expiry) is
  undesigned in 0001 too, and lands with those flows, not with this one.
- **mtp tag columns.** Artist/album/duration/bpm are exactly what a wide table is for,
  and 0001 lists them as an open question. The column machinery this spec builds is
  what makes them possible; choosing which tags show, and how the user hides them
  (`hcols` in the classic UI), is a separate decision.
- **Tree width, pinning and auto-expand** (`treesz`, `parpane`, `dyntree`) — see D3.
- **The ten classic themes and the admin/control panel** — deferred by 0001 D1, docked
  behind the `⋯` router when they come; unaffected by width.

## Open questions

- **Does the tree dock persist per-user, and can it collapse?** A fixed dock is right
  for a first cut, but a 1024px window with a deep tree wants a collapse toggle, and
  the classic UI already learned it wants a resize handle (`treesz`). Left unpinned:
  the shape of the dock's chrome is easier to judge once the widget is on screen.
- **Where the wide action bar actually sits.** D5 says the action bar has a header
  placement at width; whether it is a row inside the sticky header or a slim strip
  above the list is a layout call 0001's card 1 makes, with this contract as its
  constraint.
- **Does the wide band want the filter chips at all?** At 1024px+ a type column plus a
  sortable header covers most of what the chips answer on a phone. Keeping both is
  harmless; dropping them may be cleaner. Decide with the columns on screen.
- **Column set and its minimum width.** Name/size/type/date is the obvious four, but
  the `1024–1280px` window is tight once the tree takes its dock. Which column sheds
  first is an implementation judgement `/planc` can pin.

## Commit sketch (NOT session cards — `/planc` expands these)

Dependency-ordered. 1 and 2 are the contract and the structural change every later item
depends on; 3–5 are largely independent.

1. **The three-band contract.** Band tokens and the `>= 1024px` two-column shell in
   `nu.css`, the capability queries of D2 declared with nothing yet attached to them,
   the 1600px content cap and the wide compact density (D1). Plus `docs/nu-ui.md`:
   this is where the contract is written down for whoever reads the repo next.
2. **The row stops concatenating.** `render_list()` emits name/size/type/date as
   separate fields; narrow regroups them into the handoff's meta line via CSS; wide
   lines them up as a grid with a column header wired to the existing `pick_sort()`
   (D4). One markup, two layouts, proven by the first surface to use it.
3. **The tree widget.** `?tree=` reader with lazy expansion, dirkey preservation, the
   unreadable-volume marker and `dots` on the query string (D3). Docked as the left
   column at `>= 1024px`; no sheet wrapper — that is 0001's card 4.
4. **Desktop input on what exists.** Row hover and focus rings, click / shift-click /
   ctrl-click over the list's selection state, the right-click context menu scaffold
   with the actions available today, and arrow/Enter/Escape traversal (D2).
5. **The header at width.** Search, chips and the status line reflow into the wide
   header; the sort control becomes the column header (the sheet stays for narrow); the
   `⋯` and action-bar slots are declared for 0001's card 1 to fill.

---

## Verification (how to prove it, when it lands)

- **One markup, not two.** `grep` finds no second list renderer: `render_list` is still
  the only writer of `#nu_list`. A resize from 1200px to 380px and back — without a
  reload — keeps the sort, the filter, the search text and the scroll position, and
  issues no network request.
- **Capability, not width.** In a desktop browser's device emulation, switching to a
  touch profile at the *same* width installs the coarse-pointer behavior; switching back
  removes it. No gesture handler is attached under `(pointer: fine)`.
- **Nothing is hover-only.** With a finger at 1400px (hybrid laptop), every action
  reachable by hover is still reachable — the context menu is an accelerator, not the
  only door.
- **The tree's three quirks.** On a volume with `--dk`, expanding and navigating a node
  preserves `?k=`; a volume the user cannot enter renders as a disabled node with no
  stray line break; toggling hidden files (once 0001 card 2 lands) changes what the tree
  shows, not just the list.
- **No server drift.** `git diff` over the whole plan touches no `.py` file and adds no
  file under `web/`.
- **Mobile does not regress.** At 390 × 844 the rendered page is pixel-identical to
  `0affcaee`'s output for the same listing, except for the fields the row now emits
  separately — the meta line reads the same.
- **The classic UI is untouched.** `?b` still reaches the basic browser, `?nu0` still
  escapes, and no file under `web/` other than `nu.*` is modified.
- **Suite:** `python3 -m unittest discover -s tests` green (31 tests at `0affcaee`).
