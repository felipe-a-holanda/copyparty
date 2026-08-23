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
> against exactly one viewport — 390 × 844, the handoff's own frame
> (`design-handoff/extracted/design_handoff_nu_mobile/README.md:79`) — because the
> design handoff is a phone design and says so. This spec is the **other axis**: it
> makes width a first-class variable in `nu`, builds the wide layout the handoff never
> drew, and — because most of the surfaces it would affect do not exist yet — writes
> down the **contract** every card of 0001 must honor so those surfaces are born at both
> widths instead of being retrofitted at one.

- **Status:** planejado — spec only.
- **Hardened:** 2026-08-23 against `deca3c68`

What exists in the tree today is a phone layout with a single defensive breakpoint:
`copyparty/web/nu.css:518` is the only `@media` rule in the file besides the dark
palette (`:46`). It centers the column at `max-width: 760px` above 700px and re-parks
the bottom sheet, under a comment that says exactly what it is ("the design is a phone
design; keep it readable when it is not a phone"). There is no second layout, no docked
tree, no column grid, no hover state, no pointer-capability gate. `render_list()`
(`copyparty/web/nu.js:261`) concatenates the row's meta into one string, so there is
nothing for columns to line up. `/planc` mirrors this number.

---

## The thesis

0001's D1 is the load-bearing decision of the whole `nu` effort: **the classic UI is
scaffolding and is meant to die once `nu` reaches parity.** That decision is sound, and
this spec does not reopen it — it removes the hole under it.

Parity in 0001 is measured against the handoff's coverage matrix
(`design-handoff/extracted/design_handoff_nu_mobile/cobertura de features.dc.html`),
which scores 38 classic-UI functions: 9 `ok`, 9 `half`, 11 `todo`, 9 `out`. **Every one
of those scores was taken on a phone**, and for the desktop functions the matrix did
not leave a hole — it recorded a **substitution**:

| matrix row | score | the matrix's own gloss |
|---|---|---|
| `Colunas nome/tamanho/tipo/data` | `ok` | "Viraram nome + linha secundária; tipo virou o chip da esquerda." |
| `Ordenação por coluna` | `ok` | "Sheet de ordenação com Nome, Data, Tamanho, Tipo e Itens, com direção." |
| `Árvore de pastas` | `half` | the sheet covers it; `parpane` / `dyntree` / 🎯 are named as the missing part |
| `Seleção múltipla` | `half` | |
| `Menu de contexto completo` | `half` | "a UI clássica tem 18 itens; o swipe entrega 2." |
| `Atalhos de teclado` | `out` | "Irrelevante no celular, mas **some junto se a UI virar uma só**." |

So the danger is not a gap the designer forgot. It is sharper than that: **the
substitutions were made for a 390px screen, and they stop paying at 1024px.** A
secondary line under the name is a better use of 390px than four columns; it is a worse
use of 1600px, where the columns fit and the eye wants to scan one field down the page.
The matrix's note on keyboard shortcuts says the quiet part out loud — a score taken
under "the classic UI stays" becomes a regression the moment the classic UI goes.

This spec therefore **does not reverse the handoff's decision** — it scopes it to the
width it was made for. Below 1024px the row keeps the chip and the secondary line,
character for character (see Verification). Above it, the same fields line up as
columns. Where the matrix scored `out` and `half` — the keyboard map, the docked tree,
range selection, the context menu — the wide band is simply the first place those have
somewhere to live.

Concretely, what a user on a 27" monitor would trade the classic UI for today is a
760px column of 42px chips (`.nu_type`, `copyparty/web/nu.css:318-330`), with no
navpane (`#tree`, `copyparty/web/browser.html:80`, driven by `treectl`,
`copyparty/web/browser.js:6953`), no sortable table header
(`copyparty/web/browser.html:92`), no range selection (`msel.seltgl`,
`copyparty/web/browser.js:8827`) and one keybinding. This spec exists so parity means
parity at both widths, and it lands **before** the seven mobile surfaces, so they are
built knowing a second width exists.

The cheap-half claim of 0001 holds here too, and for the same reason: this spec adds
**no route, no parameter, no response field**. The docked tree is `?tree=` (`tx_tree`,
`copyparty/httpcli.py:6062`), the same endpoint the classic navpane consumes
(`copyparty/web/browser.js:7229`). Columns are the data `?ls` already returns.
Everything else is CSS and event handling.

## The decisions

### D1 — Three widths, one markup

The layout is a function of width in three bands, and **one markup serves all three**:

| band | what it is | why |
|---|---|---|
| `< 700px` | the handoff, unchanged | the design is hi-fi and final at this width |
| `700–1023px` | today's centered column | tablets and half-screen windows; already correct |
| `>= 1024px` | two columns: docked tree + a row grid with a column header | the width this spec exists for |

**Breakpoints are written in `em`, not `px`.** The responsive rules elsewhere in the
repo are `em` — `copyparty/web/ui.css:302` (`40em`), `copyparty/web/md.css:274`
(`66em`), and the rest of `copyparty/web/browser.css`'s media block — while
`copyparty/web/nu.css:518`'s `700px` is an outlier. The bands above are named in px
because that is how they read; the CSS
spells them
`44em` and `64em`, which track the user's font size instead of fighting it, and which
sidestep the fractional-width dead zone that `max-width: 1023px` opens under browser
zoom.

**The middle band does not exist yet — it has to be created out of the rule that is
there.** `copyparty/web/nu.css:518` is `@media (min-width: 700px)`, *unbounded*: it
applies at 1600px too, and it pins `max-width: 760px` on `#nu_top`, `#nu_main` and
`#nu_foot` (`:519-525`) plus a centered 460px sort sheet (`:527-533`). So the first
piece of work is to give that rule an upper edge, by re-scoping it rather than by
overriding its declarations one by one at `>= 1024px`. An unbounded rule that a later
rule has to undo is how a 760px cap survives into a layout that was supposed to be
1600px wide.

**One markup, two layouts** — the wide band is reached by CSS over the same DOM the
narrow band renders, never by a second render function. This is the rule that keeps the
cost linear: every surface 0001 adds writes its nodes once and gets its wide behavior
from a rule, not from a branch. A resize from 1200px to 380px must therefore reflow
without re-rendering and without refetching the listing, and without losing sort,
filter or scroll — which is also the cheapest possible test that the rule was followed.

The one deliberate exception is 0001's grid view, which is a genuinely different
renderer over the same `filtered()` output (0001 D7) — it stays that way and simply
gets a wide tile size.

**Where the second column lives.** `#nu_top`, `#nu_main` and `#nu_foot` are direct
children of `<body>` (`copyparty/web/nu.html:17,42,57`), and `#nu_top` is
`position: sticky; top: 0` (`copyparty/web/nu.css:135-136`). Turning `<body>` itself
into the two-column grid breaks that stick: a grid item's containing block is its grid
area, and a header row exactly as tall as the header has no travel left. So the shell is
a **new wrapper element in `nu.html`** holding the tree dock and `#nu_main` side by
side, with the header and footer left in page flow spanning the full width. That
wrapper, the tree's node, and the `cgv1` binding of D2 are the whole template change;
`nu.html` gains elements, not a second template.

Two sub-decisions that only matter at `>= 1024px`:

- **The content column caps at 1600px.** An unbounded row on an ultrawide monitor puts
  the name and the date a hand-span apart. The tree docks outside that cap, flush left.
- **The wide band defaults to the compact row** (`9px 16px`, the density the handoff
  specifies at `design-handoff/extracted/design_handoff_nu_mobile/copyparty mobile.dc.html:496`)
  rather than the touch row (`14px 16px`, which is what `.nu_row` ships today,
  `copyparty/web/nu.css:307`). 44px touch targets are a finger constraint; a mouse pays
  for them in rows-per-screen. The settings toggle (0001 card 2, where 0001's plan
  already pins it) still overrides, and the narrow bands keep the touch default.

### D2 — Capability decides interaction; width decides layout

Width and input are different questions and must be gated by different queries. Layout
keys off `min-width`. **Interaction keys off `pointer` and `hover`**, because a 1024px
touch tablet and a 1024px desktop window are the same layout and emphatically not the
same input.

- Gestures — long-press, horizontal swipe, pull-to-refresh (0001 cards 5–7) — are
  attached only under `(pointer: coarse)`. They are not removed at width; they are
  never installed for a mouse. A long-press with a mouse is an interaction nobody
  expects, and a swipe with a mouse is worse.
- **The row stays a link, and a plain click still navigates.** `.nu_row` is an
  `<a href>` (`copyparty/web/nu.js:284`, and the back row at `:267`), and for folders
  the chevron is the only other affordance (`.nu_go`, emitted for dirs only, `:291`).
  Click-to-select would mean `preventDefault()` on every row and would leave folder
  navigation without a door. This also matches the classic UI, whose modifier-driven
  selection is an **opt-in** toggle scoped to grid view — `ct_csel` reads "use CTRL and
  SHIFT for file selection in grid-view" (`copyparty/web/browser.js:237`), defaulting
  from the `gsel` volflag (`copyparty/authsrv.py:3315`).
- **Selection is the checkbox's job, and the checkbox column is permanent at
  `>= 1024px`** — not revealed on hover. Classic's is a real column too
  (`<th name="lead">`, `copyparty/web/browser.html:95`). Hover may *emphasize* the
  checkbox; it must never be what makes it exist, because of the no-hover-only rule
  below.
- **Shift-click and ctrl/cmd-click act on the checkbox**, extending and toggling the
  range — which is exactly where the classic implementation lives (`msel.seltgl`,
  `copyparty/web/browser.js:8827-8858`), not on the row.
- **Right-click opens a context menu** carrying the actions the swipe reveals on touch,
  under `(hover: hover) and (pointer: fine)`.
- A hybrid device gets both models, which is correct: the queries are not exclusive, and
  nothing here depends on being the only input model present.
- **Nothing may be hover-only.** Every action reachable by hover must also be reachable
  by a visible control, because a hybrid laptop can be driven by finger at 1400px. This
  is what makes the context menu an *accelerator* for the row's actions, never their
  only door — and it is why the checkbox column is permanent rather than hover-revealed.
- The capability queries are read in **JS, not only CSS** — `matchMedia("(pointer: coarse)")`
  decides whether a handler is installed at all. A CSS-only gate hides the affordance
  while leaving the listener attached, which is the bug this decision exists to prevent.
  **The query is also re-read on change**, via `mq.onchange`, the way
  `copyparty/web/util.js:586-594` already re-reads `prefers-reduced-motion`; a
  capability latched once at boot is wrong
  on every device that changes input mode.
- **This deliberately does not reuse the repo's `TOUCH`.** `copyparty/web/util.js:32-33`
  defines `TOUCH = 'ontouchstart' in window` and `MOBILE = TOUCH`, which is what the
  classic UI branches on (`copyparty/web/browser.js:1162`, `:2427`, `:2603`). It is a
  device fact, not an input fact: it is true on every hybrid laptop, which is precisely
  the machine this decision exists for. `nu` also never loads `util.js` — `nu.html`
  pulls in `nu.js` and, optionally, the volume's own `js` hook (`:74`, `:76`) — so there
  is nothing to inherit. The media queries are both the better test and the only one
  available.

**The admin's existing switches must be honored, and `nu` cannot see them today.**
copyparty already ships `--ui-notree` ("hide navpane in the UI", volflag `ui_notree`,
`copyparty/__main__.py:2026`), `--ui-noctxb` ("hide context-buttons", `:2029`), `--rcm`
(`:1973`) and `--gsel` (`:1969`). The first two land in `js_htm`
(`copyparty/authsrv.py:3338-3341`), which httpcli hands the template as `cgv1`
(`copyparty/httpcli.py:7333`) — but `nu.html` binds `cfg`, `perms`, `acct`, `vpnodes`
and `ls0`, and **not `cgv1`** (`copyparty/web/nu.html:61-73`). So the tree dock and the
context menu are the first two `nu` surfaces an admin has already been able to switch
off for six years. Binding `cgv1` is part of this spec; gating the dock on `ui_notree`
and the context menu on `ui_noctxb` is part of it too.

### D3 — The tree widget is born here; 0001 wraps it in a sheet

This is the one place where 0002 builds a surface 0001 also lists, and the split is
deliberate: **the tree widget is width-agnostic, its container is not.** The reader,
the lazy expansion, the node render and the current-path highlight are one piece of
code; docking it in a left column is this spec, and wrapping it in a bottom sheet is
0001's card 4. Building it twice is how two UIs for one thing get out of sync.

The widget reads `?tree=<top>` one level at a time, exactly as the endpoint is shaped
(`gen_tree`, `copyparty/httpcli.py:6088-6169`) and exactly as 0001 D4 already decided —
no recursive prefetch. It fetches when the dock first becomes visible, not on page load:
a phone that never widens must not pay a `?tree=` roundtrip, and the one request a
1200px-wide resize triggers is the correct price (see Verification, which scopes the
"no refetch" gate to the listing).

**The reply is not a list of display names, and every one of these is a bug if
missed.** The shapes below are what the endpoint actually puts on the wire:

- The reply is `{"a": [names...]}` plus a `k<name>` key per **already-expanded**
  ancestor of the current path (`ret["k" + quotep(excl)]`, `copyparty/httpcli.py:6094`),
  so the first call paints the path to `vpath` open. The key is percent-encoded exactly
  like the names.
- **The expanded child is missing from `a`.** `gen_tree` sets `excl` to the next path
  component and then filters it out of the sibling list — `[x for x in dirs if x != excl]`
  (`copyparty/httpcli.py:6144`, and `:6138` on the dirkey path). So `a` and the `k*` keys
  must be **merged** to get a node's children; a reader that treats `a` as the whole
  child list silently drops the folder the user is currently inside.
- **Every name is percent-encoded** — `quotep` (`copyparty/util.py:2634`) is applied at
  `copyparty/httpcli.py:6141` and `:6144`. A folder called `my vol` arrives as
  `"my%20vol"`. Decode for display, re-encode for the href; rendering the raw string
  puts `%20` on screen.
- With dirkeys enabled (the `dk` volflag), the key is **appended to the name**, inside
  the same string: `"my%20vol?k=kF73qdt_"` (`copyparty/httpcli.py:6141`). Split at the
  `?` before decoding, and carry the key into the href — without it the folder is
  unreachable. It must not be stripped as query junk.
- A **sub-volume the server cannot reach** — its backing path fails `bos.stat`, or the
  user holds none of read/write/html on it (`copyparty/httpcli.py:6152-6158`) — is
  marked by a `"\n"` appended to its name (`:6160`). That byte is then **quoted with
  everything else** (`:6161`), so what arrives on the wire is `"gone%0A"`, *not* a
  trailing newline. **Decode first, then test the trailing `\n`.** The classic reader
  tests the still-encoded string (`parsetree`, `copyparty/web/browser.js:7901`,
  `ded = ks.endsWith('\n')`) and therefore does not match at all — copy its structure,
  not that line. Render the marked node disabled, never as a name with a line break.
- The marker is **not** the "forbidden" case. A sub-volume the user has no access to is
  filtered out before that check runs and simply does not appear — so the disabled node
  means *unreachable*, and "I can see it but not open it" is not a state the tree
  renders.
- **Under `-R`, the initial blank form is wrapped.** When `is_vproxied` and the `tree`
  param is empty, the reply is nested once per component of `args.R`:
  `ret = {"k%s" % parent: ret, "a": []}` (`copyparty/httpcli.py:6077-6082`). A reader
  that takes the top-level object as the root paints an empty tree on every
  reverse-proxied deployment. The widget always sends a non-empty `tree=` and never
  relies on the blank form.
- `dots` is **not** one preference with two readers, however much it should be. The tree
  honors only the query param, ANDed with a permission —
  `self.uname in vn.axs.udot and "dots" in self.uparam` (`copyparty/httpcli.py:6114`) —
  while the listing also honors a cookie on non-`ls` renders (`:7434-7436`), which is
  exactly the first-paint path `nu` uses (`ls0`). So the widget sends `&dots` from the
  client's own preference on **every** `?tree=`, and never assumes the server's cookie
  applies. For a user without `udot` the toggle is a documented no-op on the tree.
- The **request** carries state too: the classic client sends
  `?tree=<top>[&dots][&k=<key>]` (`copyparty/web/browser.js:7229`), and the server reads
  that `k` (`copyparty/httpcli.py:6076`). Under a dirkey volume, a tree request without
  `&k=` gets a different answer than one with it.

Deliberately **not** built here: `treesz` (the classic UI's width control — stepped ±2
buttons, `scaletree`, `copyparty/web/browser.js:7942-7951`, clamped 2–120 and written in
`em`, not a drag handle), `parpane` — which is not the dock itself but a toggle that
pins the *parent folders* into a second pane above the tree (`#treepar`,
`copyparty/web/browser.js:1091,1097`, tooltip at `:283`) — and `dyntree`. The dock is a
fixed width in this spec; see Open questions.

### D4 — Columns are the row, revealed — so the row must stop concatenating

Today the row's meta is one string built in `render_list()`
(`copyparty/web/nu.js:280-282`), and it is **not the same string for both kinds of
row**: a file gets `humansize(f.sz) + " · " + dt_short(f)`, a folder gets its item count
plus the date and no size at all. A string cannot be a column. So the render emits
**separate fields** — name, size, type, date — always, at every width, and the layout
decides what to do with them:

- wide: a CSS grid whose tracks are the columns, with a header row above it;
- narrow: the same fields regrouped into the handoff's exact meta line, with the `·`
  separators supplied by CSS (`::before`), not by the JS.

Six consequences that are not optional:

- **`.nu_meat` has to stop nesting.** Name and sub live inside a `flex: 1` wrapper
  (`copyparty/web/nu.css:341-344`), so they are not siblings at row level and a grid on
  `.nu_row` cannot address them as tracks. Either the fields become direct children of
  the row, or `.nu_meat` takes `display: contents` in the wide band. Pick one in the
  plan; do not discover it at implementation time.
- **A folder's size cell is not `f.sz`.** The server sets `sz = inf.st_size` for every
  entry including directories (`copyparty/httpcli.py:7506`) — roughly 4096 — and only
  overwrites it with the recursive size when the volume is indexed and `nodirsz` is
  unset (`:7628-7637`). So a naive "Size" column reads `4.0 KB` for every folder on an
  unindexed volume, and today's `sz` sort already orders folders by that number
  (`r = (a.sz || 0) - (b.sz || 0)`, `copyparty/web/nu.js:197-198`). The rule: show the
  recursive size when `cfg.idx` says the
  volume is indexed, and the item count otherwise — which is what the phone row already
  shows, and what `SORTS`' `n` key already sorts by (`copyparty/web/nu.js:136`).
- **A "Date" column cannot reuse `dt_short()`.** It returns day plus month with no year
  (`copyparty/web/nu.js:64-71`), which is right for a phone subline and wrong for a
  table that has to tell 12 jun 2019 from 12 jun 2026 — and `f.dt`, the full timestamp,
  is stripped from the `?ls` JSON (`copyparty/httpcli.py:6982`) so it cannot be
  recovered after the first navigation. The wide cell formats from `f.ts` directly;
  classic has a real Date column (`<th name="ts">`, `copyparty/web/browser.html:106`)
  fed by the server's full `YYYY-MM-DD HH:MM:SS` (`copyparty/httpcli.py:7508`).
- **Not every child of `#nu_list` is a data row.** The back row carries the literal
  subline "parent folder" (`copyparty/web/nu.js:265-272`), which must not land under
  Size; the empty state is a bare `<p class="nu_empty">` (`:294-297`) that needs
  `grid-column: 1 / -1`; and `.nu_go` is emitted for directories only (`:291`), so file
  rows and folder rows do not have the same child count. The grid template must be
  declared against named areas or explicit placement, not against child order.
- **The column header does not go inside `#nu_list`.** That node carries
  `aria-live="polite"` (`copyparty/web/nu.html:44`), so a header placed inside it would
  be re-announced on every sort and every keystroke in the filter. It belongs to
  `#nu_main` or `#nu_top`.
- **The header's arrow is state, and it is repainted through `draw()`.** `pick_sort()`
  today repaints two places — the sheet (`render_sheet()`) and the status-line label
  (via `draw()` → `render_stat()`, `copyparty/web/nu.js:350-361`, `:253-258`). Rendering
  the column header from inside the draw cycle keeps that at two; bolting a third call
  into `pick_sort()` is how the header and the sheet drift out of agreement.

This is the concrete form D1's "one markup" takes, and — alongside D1's shell wrapper —
it is the only change this spec makes to the shape of code that already exists.

The column header is the wide band's sort control, and it is **not a new sort
implementation**: a click calls the existing `pick_sort(k)`
(`copyparty/web/nu.js:350`) with the same keys `SORTS` already declares (`:131-137`),
including its natural-direction rule. The sort sheet and its status-line button stay
reachable at every width — two doors, one state, one comparator (`sorted()`, `:181`).

### D5 — 0002 owns the width, not the surfaces

The rule that keeps this spec from swallowing 0001: **where a surface already exists,
this spec reshapes it; where it does not, this spec writes the contract and stops.**
The tree (D3) is the single, stated exception.

What this spec **builds**: the three-band contract, the wide two-column shell, the
column grid and its header, the tree widget and its dock, and the desktop input model
on the surfaces that exist today — row hover, focus rings, arrow/Enter/Escape traversal
of the list, and the context-menu scaffold. It does **not** build selection: `nu` has no
selection state, so D2's checkbox and modifier reading is a contract on 0001's card 5,
not code that lands here.

**Every string this spec adds must go through 0001 card 1's i18n helper.** That card is
"The shell: i18n, bottom bar, and the ⋯ router"
(`docs/plans/0001-nu-the-rest-of-the-mobile-design.md:101`), and its reason for being
first is that the classic loader resolves `L` as a whole object
(`Ls[lang] || Ls.eng`, `copyparty/web/browser.js:716`) with no per-key fallback, so a
key absent from `copyparty/web/tl/*.js` renders `undefined` in every language but
English. This spec adds column headers, context-menu labels and tree chrome — the exact
kind of retrofit 0001 put i18n first to avoid. Since 0002 lands *before* card 1, its
commits either land the `t(k)` helper themselves or keep every added string in one
table that card 1 lifts wholesale. `/planc` picks which; it may not skip the question.

What this spec **contracts** — each of these is a clause 0001's re-planned cards must
satisfy, not code that lands here. The card numbers are the cards in
`docs/plans/0001-nu-the-rest-of-the-mobile-design.md`:

| 0001 card | what it owes the wide band |
|---|---|
| 1 — shell: i18n, bottom bar, `⋯` router | the action bar is one component with two placements: fixed bottom (narrow) and a toolbar row in the header (wide). Not two bars. The i18n keys are placement-blind, and absorb whatever string table 0002 left behind. |
| 2 — preferences + settings | the settings screen is a centered panel at `>= 1024px`, not a full-bleed sheet; the density toggle honors D1's wide default. |
| 3 — grid + thumbnails | a wide tile size (the 114px tile is a phone tile); tiles fill the capped content column. |
| 4 — tree sheet | consumes D3's widget; builds the sheet wrapper only, and only for narrow. |
| 5 — selection | the checkbox column is a permanent column at `>= 1024px`, never a hover reveal (D2); long-press is `pointer: coarse` only. Shift/ctrl on the checkbox is the wide entry point. |
| 6 — swipe + pull-to-refresh | both are `pointer: coarse` only; the wide equivalent of the swipe's actions is D2's context menu. |
| 7 — image viewer | the wide viewer is not a full-bleed phone overlay: bounded image, actions in a bar, prev/next reachable by the arrow keys. |
| 8 — recursive search | no width dependency; listed so the table is exhaustive. |

**Consequence, stated plainly:** `docs/plans/0001-nu-the-rest-of-the-mobile-design.md`
is written against a single width: its rule for every card is a manual check "at
390×844" (`:98`), and no card in it names any other viewport. It must be re-planned
(`/planc`) after this spec lands. Card 4 in particular currently builds the tree reader
itself, which D3 moves here. That is the cost the ordering was chosen to pay once,
instead of paying it eight times as retrofit.

The collision is also mechanical: 0001's plan is a single lane because every card edits
`nu.js`, `nu.css` and `nu.html`. This spec's commits edit the same three files, so
0002 and 0001 cannot be executed in parallel — 0002 lands first, then 0001 is re-planned
against the tree 0002 leaves.

## What is genuinely new, versus what is merely reused

**Genuinely new:**

- **The tree widget** — a `?tree=` reader, an `expanded{}` state, lazy per-node
  expansion, and the wire quirks of D3. `nu` has no equivalent today.
- **The responsive contract itself** — the band tokens, the capability queries, and the
  discipline that keeps a second renderer from appearing. Cheap in bytes, and the whole
  point of the spec.
- **The column grid and its header** — plus the row's field split (D4), which is a
  small change to `render_list()` with a large blast radius, since every later surface
  renders through it.
- **Desktop input** — hover, focus rings, arrow-key traversal, and the context-menu
  scaffold. `nu.js` today attaches exactly one keyboard handler (`Escape`,
  `copyparty/web/nu.js:445-448`).
- **A hover token and a focus-visible style.** `--sel` (`copyparty/web/nu.css:20`) is
  the `:active`/selected fill (`.nu_row:active`, `:314-316`), not a hover fill, and
  nothing in `nu.css` defines `:focus-visible` — the search input sets `outline: none`
  (`:229`). Both are geometry's companions, and both are new.
- **A wrapper element, a tree node and the `cgv1` binding in `nu.html`** — the only
  template change, and the reason the sticky header keeps working (D1).

**Reused, not rebuilt:**

- `?tree=` (`copyparty/httpcli.py:6062`) — the same endpoint the classic navpane already
  drives, with the same `&dots` / `&k=` request shape.
- `cgv1` / `js_htm` (`copyparty/httpcli.py:7333`, `copyparty/authsrv.py:3338-3341`) —
  the admin's `ui_notree` / `ui_noctxb` switches already exist; `nu` only has to read
  them.
- `pick_sort()` / `sorted()` / `SORTS` (`copyparty/web/nu.js:350`, `:181`, `:131`) — the
  column header is a second trigger for the existing sort, not a second sort.
- `filtered()` / `draw()` / `take()` (`:209`, `:302`, `:365`) — the load-and-render
  cycle is untouched; width never enters it.
- `nm()` / `humansize()` / `nfiles()` (`:33`, `:75`, `:58`) — the field split feeds the
  same readers into separate cells instead of one string. `dt_short()` (`:64`) keeps the
  narrow bands only; see D4.
- **The `prefers-reduced-motion` convention** — `copyparty/web/ui.css:641`,
  `copyparty/web/browser.css:3326`, and the JS mirror with its `onchange` re-bind at
  `copyparty/web/util.js:586-594`. `nu.css` has unguarded `.26s` transitions (`:410`,
  `:430`) and D2 adds hover, focus and menu motion on top; the wide band adopts the
  house guard rather than inventing one.
- **`ahotkeys`' typing guard** (`copyparty/web/browser.js:6237-6238`) — arrow-key
  traversal must ignore keys aimed at an input, or it fights `#nu_q`. The pattern is
  copied; the key map is not (see Out of scope).
- The token layer in `copyparty/web/nu.css:5-42`, and its dark re-tint at `:46` — the
  wide band adds no palette beyond the hover and focus tokens named above.
- `keep()` / `unpin()` (`:156`, `:163`) — the `?nu` mode plumbing is width-blind, and
  every link the tree emits goes through `keep()` or lands in the classic UI.

## What the server must provide

Nothing. No new endpoint, no new query parameter, no new response field, no new config
flag, and **no new file under `web/`** — so neither the `RES` allowlist
(`copyparty/__init__.py:101-103`) nor `scripts/sfx.ls:105-107` is touched, and neither
is the `jn` template list (`copyparty/httpsrv.py:188-196`, where `nu` is already
registered). `nu.html` itself is edited (D1, D2); that is a template change, not a
server change, and the values it newly binds (`cgv1`) are already computed and already
passed. If a commit finds itself editing `httpcli.py`, that is the signal to stop and
reopen this spec.

## Out of scope (named, deferred)

- **The full keyboard map.** `ahotkeys` (`copyparty/web/browser.js:6228`) is a large
  surface — a single global `document.onkeydown` (`:3552`) with its own help overlay
  (`hkhelp`, `:6160`). This spec builds arrow/Enter/Escape traversal of the list — the
  minimum that makes a mouse-and-keyboard session not feel broken — and leaves the map
  to its own spec, where the shortcut *table* can be designed rather than transcribed.
  The matrix scores this one `out` and flags the risk itself.
- **Drag & drop upload.** It is the desktop's native upload gesture, and it belongs to
  the upload spec that 0001 D2 defers it to — building the drop target before the
  uploader exists would produce a target that swallows files.
- **The 18-item context menu.** The classic menu is `#rcm`
  (`copyparty/web/browser.html:135`, filled at `copyparty/web/browser.js:1109`); the
  handoff counts its 18 entries against the swipe's 2. D2 builds the menu with the
  actions `nu` has; the classic UI's full file manager (rename, cut/paste, share with
  password and expiry) is undesigned in 0001 too, and lands with those flows.
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
  the classic UI already learned it wants a width control (`treesz`). Left unpinned:
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
- **Does the wide band keep the type chip?** The handoff made the chip the substitute
  for the type column; with a real Type column back, the chip is either redundant or the
  column's glyph. Cheap to decide with both on screen, and it does not block the plan.

## Commit sketch (NOT session cards — `/planc` expands these)

Dependency-ordered. 1 and 2 are the contract and the structural change every later item
depends on; 3–5 are largely independent.

1. **The three-band contract.** Re-scope the existing `min-width: 700px` rule so it
   stops at the wide band, add the `>= 1024px` band with the two-column shell — the new
   wrapper in `nu.html`, header and footer left spanning — the 1600px content cap and
   the wide compact density, all in `em` (D1), plus the capability queries of D2 and the
   `prefers-reduced-motion` guard declared with nothing yet attached to them. Plus
   `docs/nu-ui.md`: the contract is written down there, and its "design" section stops
   implying the handoff is the whole design.
2. **The row stops concatenating.** `render_list()` emits name/size/type/date as
   separate fields; `.nu_meat` stops hiding them from the grid; the folder size rule and
   the wide date format of D4; narrow regroups the fields into the handoff's meta line
   via CSS; wide lines them up as a grid — header outside `#nu_list`, back row and empty
   state given explicit placement — wired to the existing `pick_sort()` and repainted
   from `draw()`. One markup, two layouts, proven by the first surface to use it.
3. **The tree widget.** `?tree=` reader with lazy expansion on first dock-visible,
   `a`-plus-`k*` merging, percent-decoding, dirkey preservation on both the request and
   the href, the unreachable marker read *after* decoding, the `-R` wrapping, and
   `&dots` sent from the client's own preference (D3). Docked as the left column at
   `>= 1024px`, gated on `ui_notree` via the new `cgv1` binding; no sheet wrapper —
   that is 0001's card 4.
4. **Desktop input on what exists.** Row hover and focus rings on the new tokens,
   arrow/Enter/Escape traversal with `ahotkeys`' typing guard, and the right-click
   context menu scaffold carrying the actions `nu` has today, gated on `ui_noctxb` — all
   through `matchMedia` with an `onchange` re-bind rather than CSS alone (D2). **No
   selection state is created here**; click / shift-click / ctrl-click are specified in
   D2 and land with 0001's card 5.
5. **The header at width.** Search, chips and the status line reflow into the wide
   header; the sort control gains the column header as a second door (the sheet and its
   button stay at every width); the `⋯` and action-bar slots are declared for 0001's
   card 1 to fill.

---

## Verification (how to prove it, when it lands)

There is no JS test harness in this repo, so the Python suite proves only that nothing
regressed server-side. Every commit carries a **named, falsifiable manual check** as
well — the pattern `docs/plans/0001-nu-the-rest-of-the-mobile-design.md:97` already
establishes.

- **One markup, not two.** `grep -c 'nu_list").innerHTML' copyparty/web/nu.js` is `2`:
  `render_list()`'s write (`:299`) and `fetch_ls()`'s error message (`:458`). No third
  writer, and no second row renderer. A resize from 1200px to 380px and back — without a
  reload — keeps the sort, the filter, the search text and the scroll position, and
  issues no `?ls` request. (Widening may issue one `?tree=`, by D3; narrowing issues
  nothing.)
- **Capability, not width.** In a `pointer: coarse` emulation profile a row long-presses
  and swipes; in a `pointer: fine` profile at the *same* width neither fires, and the
  context menu does. Switching profiles without reloading flips the behavior, which is
  what proves the `onchange` re-bind exists.
- **Nothing is hover-only.** With a finger at 1400px (hybrid laptop), every action
  reachable by hover is still reachable, and the checkbox column is visible without any
  pointer over the row.
- **The admin's switches reach `nu`.** With `--ui-notree` the dock does not render at
  1600px; with `--ui-noctxb` right-click falls through to the browser menu. Both are
  off-by-default, so the check is a two-run diff.
- **The tree's wire quirks, each with the setup that produces it.**
  - a folder whose name contains a space renders as `my vol`, not `my%20vol`;
  - the folder the user is currently inside appears in the tree exactly once — it comes
    from the `k*` key, not from `a`;
  - behind `-R /pfx`, the first expansion paints a populated tree, not an empty one;
  - on a volume carrying the `dk` volflag, every tree name arrives as `name?k=…`, and
    expanding then navigating a node keeps the `?k=` in the href *and* sends `&k=` on
    the next `?tree=` request;
  - mount a second volume under the first, start the server, then remove its backing
    directory: the name comes back as `…%0A` and must render as one disabled node with
    no stray line break. (A volume the user simply lacks permission for is absent from
    the reply and proves nothing.)
  - toggling hidden files (once 0001 card 2 lands) changes what the tree shows for a
    user with the `udot` permission, and is a documented no-op for a user without it.
- **The columns say something true.** On an unindexed volume a folder's Size cell reads
  its item count, never `4.0 KB`; on an `-e2ds` volume it reads the recursive size. The
  Date column distinguishes two files a year apart to the day.
- **No server drift.** `git diff` over the whole plan touches no `.py` file and adds no
  file under `web/`; the only files it modifies are `copyparty/web/nu.{js,css,html}` and
  `docs/`.
- **Mobile does not regress.** At 390 × 844 the rendered meta line is character-for-
  character what `0affcaee` produced for the same listing — file rows read
  `<size> · <date>`, folder rows `<n> items · <date>`, and on an unindexed volume, where
  `nfiles()` is null, a folder row reads the bare date with **no leading separator**
  (`copyparty/web/nu.js:280-281`) — even though the JS now emits those pieces as
  separate nodes. That last case is what the CSS `::before` separators get wrong if they
  are written without an `:empty` guard.
- **Suite:** `python3 -m unittest discover -s tests` green — 31 tests, as at `deca3c68`.
  A regression guard, not evidence the work is right.
