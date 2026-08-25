---
number: 0002
type: plan
slug: nu-desktop-is-a-first-class-width
title: "Desktop is a first-class width: the responsive contract for nu"
status: pousado
created: 2026-08-23
tags: [plan, status/pousado]
par: "[[specs/0002-nu-desktop-is-a-first-class-width|spec]]"
---

**Hardened:** 2026-08-23 against `b79cc1c8`

> Six sessions that make width a variable in `nu`: three bands over one markup, a
> docked folder tree, a real column grid with a sortable header, and a desktop input
> model. No new route, no new parameter, no new response field, no `.py` diff.

## Context

`nu` is the second filebrowser UI (`docs/nu-ui.md`); its base layer landed in
`0affcaee`. Spec 0002 is the *other axis* from 0001: 0001 lists the seven mobile
surfaces still missing, 0002 makes the **width** a first-class variable and writes the
contract 0001's cards must honor so those surfaces are born at both widths instead of
retrofitted at one.

Read `docs/specs/0002-nu-desktop-is-a-first-class-width.md` for the *why*. This file is
the *how it lands*.

What is in the tree today, verified at `b79cc1c8`:

| fact | anchor |
|---|---|
| exactly one layout `@media` rule, unbounded `min-width: 700px`, capping three ids at 760px | `copyparty/web/nu.css:518-538` (the file's only other `@media` is the dark palette, `:46`) |
| the row's meta is one concatenated string, and a *different* one per row kind | `copyparty/web/nu.js:280-282` |
| name and sub are nested inside a `flex: 1` wrapper, so they are not row-level siblings | `copyparty/web/nu.css:341-344` |
| `#nu_top`, `#nu_main`, `#nu_foot` are direct children of `<body>`; the header is `position: sticky` | `copyparty/web/nu.html:17,42,57`; `nu.css:135-136` |
| one keyboard handler in the whole file (`Escape`) | `copyparty/web/nu.js:445-448` |
| no hover token, no `:focus-visible`, no `pointer`/`hover` query anywhere | `nu.css` (`--sel:20` is the `:active` fill, `:314-316`) |
| `nu.html` binds `cfg`, `perms`, `acct`, `vpnodes`, `ls0` — **not** `cgv1` | `copyparty/web/nu.html:61-73` |

Three files change, and only three: `copyparty/web/nu.js`, `nu.css`, `nu.html`, plus
`docs/`. Any `.py` in the diff is the signal to stop and reopen the spec.

## Decisions pinned here (the spec's open questions `/planc` was asked to settle)

### The i18n question (spec §D5 — "`/planc` picks which; it may not skip the question")

**0002 does not land the i18n wiring. It lands one table and a shim.**

0001's Card 1 commit 1 owns the real wiring, and it is not small: `var Ls = {}`
declared in `nu.html`'s bootstrap (because `Ls` lives in `util.js:310-311` and `nu`
must not load `util.js`), the `tl/{{ lang }}.js` tag **guarded on `lang != "eng"`**
(there is no `web/tl/eng.js`; `copyparty/__init__.py:116-137` lists `chi`..`vie`, and
`--lang` defaults to `eng`, `__main__.py:1974`), and the per-key fallback the classic
UI lacks (`browser.js:716` resolves `Ls[lang]` whole-object). Landing a second copy of
that in 0002 forks ownership of a trap 0001 already mapped.

So 0002 adds `var STR = { ... }` near the top of `nu.js` — one flat table, every string
0002 adds — and `function t(k) { return STR[k] || k; }`. Card 1 of 0001 lifts `STR`
wholesale into `Ls.eng` and replaces the shim's body; that is a two-line diff plus a
rename, not a hunt for literals. **Every string 0002 adds goes through `t()` from its
first commit.** Declared as a pendency against 0001 Card 1 below.

The table stays small on purpose: the column headers **reuse `SORTS`' existing labels**
(`nu.js:131-137` already carries `Name`/`Date`/`Size`/`Type`/`Items`), so the only new
strings are the tree's chrome and the context menu's rows.

### The column set, and which column sheds first

Pinned: **chip · Name · Size · Type · Date · chevron**, with **Type shedding first**,
below `80em`.

- `64em–80em` (1024–1280px, the tight window once the dock takes `16em`): chip, Name,
  Size, Date.
- `>= 80em`: the full set.

Type sheds first because the type **chip stays at every width** (next decision), so the
Type column is the one field with a second representation already on the row. Size and
Date have none.

### The wide band keeps the type chip

Pinned: **keep it.** Dropping it at width would mean the wide row is not the narrow row
with columns revealed — it would be a second row shape, which is exactly what D1
forbids. It also gives the Type column something to shed *into* at `64em–80em`.

### The filter chips survive at width

Pinned: **keep them**, reflowed into the wide header row (Card 6). They are the only
door to the type filter that does not go through the sort sheet, and removing them at a
width would make `#nu_chips` a width-conditional feature — a second markup by another
name.

### The tree dock's shape

Pinned for the first cut, matching the spec's deferral of `treesz` / `parpane` /
`dyntree`: **fixed `16em`, flush left, no collapse toggle, no persistence.** It is
`position: sticky` under the header and scrolls independently. Revisit once it is on
screen; the spec says so and this plan does not pre-empt it.

### `sorted()` is not touched

`sorted()`'s `sz` comparator orders folders by `f.sz` — 4096 on a volume without
recursive dir sizes (`nu.js:197-198`). That is pre-existing behavior shared with the
sort sheet at **every** width, so changing it here would change mobile. Left alone; the
Size *column* still tells the truth (next section). Recorded as a follow-up, not a
commit.

## What the investigation changed about the shape

Five findings that move work or change how a commit is written.

### `cfg.idx` is the wrong gate for a folder's size cell — `nfiles(f)` is the right one

Spec §D4 says to show a folder's recursive size "when `cfg.idx` says the volume is
indexed". That leaks the bug it was written to prevent. `httpcli.py:7628-7637` fills
`fe["sz"]` and `fe["tags"][".files"]` in **one** tuple assignment from **one** query —
`select sz, nf from ds` (`:7631`, unpacked at `:7635`) — and only when
`"nodirsz" not in vf` (`:7628`). So on an `-e2d` volume carrying the `nodirsz` volflag,
`cfg.idx` is `true` and `sz` is still 4096. `idx` is a real `js_ls` cell
(`authsrv.py:3265`); `nodirsz` is not a cell at all (`:3264-3282`), so there is nothing
volume-level to test instead.

But the two values arrive together, per entry, and a miss raises inside the per-entry
`try` and leaves **both** unset (`:7633-7637`, `except: pass` for 404 and mojibake). So
`nfiles(f) !== null` (`nu.js:58-61`) is the predicate "this row's recursive size was
filled" — sharper than any volume-level flag, and already in the file. Its one failure
mode is a closed one: a row whose `nf` column is null loses a size cell it could have
shown, and never shows 4096 as a size. The rule becomes: *a dir's size cell exists only
when `nfiles(f) !== null`*, and then narrow renders the item count and wide renders
`humansize(f.sz)`. When it is null the cell is not emitted at all — which is also what
keeps the narrow meta line free of a leading separator (see below).

### The grid goes on `.nu_row`, not on `#nu_list` — which dissolves two of the spec's cautions and creates two rules

Spec §D4 warns that `.nu_empty` needs `grid-column: 1 / -1` and that row children differ
in count. Both come from assuming `#nu_list` is the grid. It cannot be: rows are `<a>`
elements carrying the background, the bottom border and (now) hover and focus; making
them `display: contents` to expose their children to a parent grid destroys all four.

So **each `.nu_row` is its own grid**, `#nu_list` stays a plain block, and:

- `.nu_empty` is not a grid item at all and needs no placement;
- a missing `.nu_go` (files) or a missing size cell costs nothing, because every cell is
  placed by **name**, not by order.

The price is two rules, both hard.

**No `auto` tracks.** Each row is an independent grid, so columns line up across rows
only if every track is content-independent. `minmax(0, 1fr)` for Name, fixed `em` for
the rest — and the column header uses the *same* declaration, shared through a
`--nu-cols` custom property so there is one definition of the truth. `--nu-cols` is not
the whole truth on its own: `.nu_row` also carries `gap: 14px` and `padding: 14px 16px`
(`nu.css:306-307`), and both move every track. A header that copies the tracks but not
the gap and the inline padding starts 16px off and drifts a further 14px per column.

**The CSS separators have to be switched off in the wide band.** `.nu_sub` going
`display: contents` removes its box, not the selector: `.nu_sub > * + *::before` keeps
matching, so every column after the first would render `· 1.2 GB` inside its own track.
The wide band cancels the rule (`content: none`) in the same block that flips the two
`display: contents`.

### `display: contents` twice, not a flattened render

Spec §D4 offers a choice: fields become direct children of the row, or `.nu_meat` takes
`display: contents` at width. Pinned: **`display: contents`, on `.nu_meat` *and* on
`.nu_sub`** — the sub is a second nesting level the spec's sentence does not mention,
and forgetting it puts three cells in one track.

Flattening the DOM instead would rewrite the narrow row, which is the one thing that
must come out character-for-character identical.

### The resize gate forbids re-formatting in JS, so dual-form cells are not optional

"A resize from 1200px to 380px reflows without re-rendering" (spec §Verification) and
"the wide cell formats from `f.ts` directly, `dt_short()` keeps the narrow bands" (§D4)
are in tension: JS cannot reformat a cell it is not allowed to re-render.

So a cell whose text differs per band carries **both** forms, and CSS picks:
`<span class="nu_n">` (narrow) and `<span class="nu_w">` (wide). Two cells need it — the
date (`12 jun` vs a year-bearing form) and a folder's size (`3 items` vs `1.2 GB`).
`.nu_w { display: none }` is unconditional; the wide band flips both.

The two forms live **inside** the cell, never in its place: the cell stays one element,
`<span class="nu_c_dt"><span class="nu_n">12 jun</span><span class="nu_w">12 jun
2019</span></span>`. Two bare sibling spans would put two boxes in one named track and
would count as two links in the separator chain — one column is one element, always.

### The narrow separator has to survive a hidden Type cell — so Type goes last in the DOM

The separators become `::before` on every non-first child of `.nu_sub`. That is correct
only if a hidden cell is never *between* two visible ones: with order
`size, type, date`, an unindexed folder (no size cell) leaves the hidden Type as first
child and the date as second — which renders `· 12 jun`, the exact regression the spec's
`:empty` warning is about.

Placement is by named line, so **DOM order is free**. `.nu_sub` emits
`size, date, type` — the shedding cell is always the trailing one, and the separator
chain can never see a gap. (`.nu_name` is not in that chain at all: it stays in
`.nu_meat`, above the meta line, exactly where it renders today.) Wide reads the cells
as columns in the human order — Name, Size, Type, Date — because the grid says so, not
because the DOM does.

## The bands, in one place

Three layouts, and one second step **inside** the wide layout — `>= 80em` adds a column
to the wide band, it does not open a fourth layout.

| band | CSS | what it is |
|---|---|---|
| `< 44em` | (no query — the base rules) | the handoff, unchanged |
| `44em–64em` | `@media (min-width: 44em) and (max-width: 63.99em)` | today's centered 760px column |
| `>= 64em` | `@media (min-width: 64em)` | tree dock + column grid |
| `>= 80em` | `@media (min-width: 80em)` | the wide band, plus the Type column |

`44em` is 704px at a 16px root, four pixels off today's `700px`; that drift is accepted
in exchange for tracking the user's font size, and it is the only behavioral change the
re-scoping makes to the middle band. Capability queries — `(pointer: coarse)`,
`(hover: hover) and (pointer: fine)` — never appear in a width query and never gate
layout.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

Single lane: every card edits `copyparty/web/nu.js`, `nu.css` and `nu.html`, so the
touches collide by construction and the cards run in sequence. No `lane:` stamps. (This
is also why 0002 and 0001 cannot run in parallel — 0002 lands first, 0001 is re-planned
after.)

There is no JS test harness in this repo, so each card's gate is the Python suite
(proves nothing regressed) **plus a named, falsifiable manual check** — and unlike 0001,
every check names **two** viewports: 390×844 and 1440×900. Serve a test volume with
`-e2dsa` so indexed-only behavior is exercised.

### Card 1 — The three bands and the wide shell
precondition:  none — first card
read for why:  spec §D1 (why `em`, why a wrapper rather than a grid on `<body>`, why the
               wide band defaults to the compact row) and §D2 (why capability is read in
               JS with an `onchange` re-bind, and why `TOUCH` from `util.js:32-33` is
               deliberately not reused)
commits:
  1. nu: give the phone breakpoint an upper edge, in em
     touches: copyparty/web/nu.css  (only these)
     do:      - rewrite `@media (min-width: 700px)` (`nu.css:518`) as
                `@media (min-width: 44em) and (max-width: 63.99em)`. It is currently
                **unbounded** and pins `max-width: 760px` on `#nu_top`, `#nu_main` and
                `#nu_foot` (`:519-525`); re-scoping is the whole point — an unbounded
                rule a later rule has to undo is how a 760px cap survives into a layout
                that was supposed to be 1600px wide
              - keep the comment, but make it name the band it now owns rather than
                claiming to be the only non-phone rule
              - the centered 460px sort sheet (`:527-533`) keeps the middle band and
                gains an identical form in the `>= 64em` band added next commit — it is
                a modal, and it is centered in both
  2. nu: add the wide shell and the tree dock's column
     touches: copyparty/web/nu.html, copyparty/web/nu.css
     do:      - wrap `<nav id="nu_tree" hidden></nav>` and the existing
                `<main id="nu_main">` in a new `<div id="nu_shell">` (`nu.html:42-44`).
                `#nu_top` and `#nu_foot` stay **direct children of `<body>`** — turning
                `<body>` into the grid would give the sticky header a grid area exactly
                its own height and no travel to stick through (`nu.css:135-136`)
              - `#nu_shell` is an unstyled block below `64em`, so the middle band's
                centering of `#nu_main` is untouched
              - at `>= 64em`: `#nu_shell { display: grid; grid-template-columns:
                minmax(0, 100em); justify-content: start; }` — content flush left,
                capped at `100em` (the spec's 1600px), and the cap on `#nu_top` /
                `#nu_foot` simply absent, so header and footer span
              - the dock's column is **opt-in**, not the default:
                `#nu_shell[data-tree="1"] { grid-template-columns: 16em minmax(0, 100em) }`,
                and Card 4 writes the attribute when it actually renders the dock. A
                template that declared the 16em track unconditionally would leave a
                permanent empty gutter on every `--ui-notree` deployment and on every
                window that widens before the first `?tree=` answers — the dock is
                allowed to be absent, the hole is not
              - `#nu_tree` is `position: sticky; top: var(--head-h); max-height:
                calc(100vh - var(--head-h)); overflow-y: auto`, and stays `hidden` —
                Card 4 fills it. `--head-h` is written from a `ResizeObserver` on
                `#nu_top` (next commit) with a `8.5em` fallback in the token block, or
                the dock's first rows sit under the blurred header
  3. nu: declare the wide density default, the new tokens and the capability queries
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - `.nu_row` takes `padding: var(--row-pad, 14px 16px)` (`nu.css:307`); the
                `>= 64em` band sets `--row-pad: 9px 16px` on `:root` — the compact metric
                the handoff gives at `copyparty mobile.dc.html:496`. A
                `:root[data-dens="touch"]` rule sets it back, and outranks the media
                rule on specificity alone, so 0001 Card 2's toggle only has to write an
                attribute (pendency below)
              - new tokens beside the existing ones (`nu.css:5-42`, dark at `:46` and
                `:78`): `--hov` (a hover fill distinct from `--sel`, which is the
                `:active`/selected fill at `:20`, `:314-316`) and `--ring` for
                `:focus-visible`. Both need a dark value in **both** dark blocks
              - adopt the house `prefers-reduced-motion` guard
                (`ui.css:641`, `browser.css:3326`) around `nu.css`'s unguarded `.26s`
                transitions (`:410`, `:430`) — Card 5 adds hover and menu motion on top
                of them
              - in `nu.js`, one `CAP` object built from `matchMedia`:
                `coarse` = `(pointer: coarse)`, `fine` = `(hover: hover) and
                (pointer: fine)`, `wide` = `(min-width: 64em)`, each **re-read on
                `onchange`** the way `util.js:586-594` re-reads `prefers-reduced-motion`,
                firing a `CAP.on(name, fn)` callback list. Nothing subscribes yet
              - `--head-h` written from a `ResizeObserver` on `#nu_top`, guarded on the
                API existing
  4. docs: write the responsive contract into nu-ui.md
     touches: docs/nu-ui.md
     do:      - `docs/nu-ui.md` presents `nu` as the mobile redesign and the handoff as
                the whole design. Add a `## widths` section carrying the band table
                above, the capability-vs-width split, and the rule that a second
                renderer is a bug — the doc is the only prose a reader meets before the
                code
              - name the one sanctioned exception (0001's grid view, a different
                renderer over the same `filtered()` output)
done when:     `python3 -m unittest discover -s tests` green (31 tests at `b79cc1c8`),
               no `.py` in the diff, and: at 1440×900 the header and footer span the
               full window with no 760px cap, the list starts flush left and `#nu_shell`
               resolves to **one** track (`getComputedStyle(ebi("nu_shell"))
               .gridTemplateColumns` is a single value — no 16em gutter before Card 4
               fills the dock); on a 2000px-wide window that track measures 1600px, not
               2000px; at 800×900 the layout is pixel-identical to `b79cc1c8`; at
               702×900 the phone layout is in force where `b79cc1c8` gave the centered
               column — the accepted 4px drift from `700px` to `44em`, and the only
               behavioral change this card makes to an existing band; at 390×844 nothing
               changed at all; `getPropertyValue("--head-h")` on `documentElement`
               matches `ebi("nu_top").offsetHeight` and **changes** when the header
               reflows (a folder name long enough to wrap `#nu_nav`); and in devtools,
               switching the emulation profile from desktop to a coarse-pointer device
               **without reloading** fires the `CAP` callback (a temporary
               `console.log` is a legitimate way to see it, removed before the commit)

### Card 2 — The row stops concatenating, and mobile does not move
precondition:  Card 1 landed — `t()`/`STR`, the band rules, `.nu_n`/`.nu_w` have a band
               to be picked by
read for why:  spec §D4 (why a string cannot be a column, and the six consequences) and
               this plan's §"What the investigation changed" — the `nfiles()` gate, the
               dual-form cells and why Type is last in the DOM
commits:
  1. nu: emit the row's meta as separate fields
     touches: copyparty/web/nu.js  (only these)
     do:      - in `render_list()` (`nu.js:261-300`), replace the `sub` string
                (`:280-282`) with one element per field. `.nu_name` does **not** move:
                it stays the first child of `.nu_meat` (`nu.js:289`, `nu.css:346-354`),
                because the narrow meta line is `.nu_sub` alone and a name inside it
                would render as a fourth `·`-joined field. What changes is `.nu_sub`'s
                single text node, which becomes cells in DOM order **size, date, type**,
                classed `nu_c_sz` / `nu_c_dt` / `nu_c_ty`. Both wrappers survive; Card 2
                commit 3 makes them `display: contents` at width
              - the Type cell carries `ext_of(f)` (`nu.js:42-48`) and is emitted for
                **files only** — a dir's `ext` is `"---"`, so `ext_of()` falls through to
                guessing from the name and would label `my.backup` as `backup`. A file
                with no extension gets no cell either. It is the trailing child, so
                omitting it can never orphan a separator
              - dual-form cells are **one element with two spans inside**:
                `<span class="nu_c_dt"><span class="nu_n">12 jun</span><span
                class="nu_w">12 jun 2019</span></span>` — narrow keeps `dt_short()`
                (`:64-71`), wide formats from `f.ts` **with the year**, because `f.dt` is
                stripped from the `?ls` JSON (`httpcli.py:6982`) and cannot be recovered
                after the first navigation. A folder's size cell wraps `N items` /
                `humansize(f.sz)` the same way. Two bare siblings instead of one wrapper
                would be two boxes in one named track and two links in the separator
                chain
              - **a cell with nothing to say is not emitted at all** — no empty span.
                For a dir that means the size cell exists only when
                `nfiles(f) !== null`; `f.sz` for a dir is `st_size` (`httpcli.py:7506`,
                ~4096) unless the `ds` lookup filled it, and that lookup assigns `sz` and
                `.files` in one tuple (`:7635`, inside the `try` at `:7633-7637`), so
                `nfiles()` is the predicate. `cfg.idx` is **not** — it is true on a
                `nodirsz` volume, where `sz` is still 4096
              - the back row (`:265-272`) keeps its `parent folder` subline, but wrapped
                in `<span class="nu_n">` so it cannot land in a column, and the row gains
                a `nu_back` class for its placement rule
              - every literal in this file that is user-visible and new goes through
                `t()`; the pre-existing literals stay put — moving them is 0001 Card 1
  2. nu: regroup the fields into the handoff's meta line
     touches: copyparty/web/nu.css
     do:      - `.nu_sub > * + *::before { content: " · " }` — the separators move from
                the JS into CSS. Because an empty cell is never emitted (commit 1), no
                `:empty` guard is needed and no leading separator can appear
              - `.nu_w { display: none }` unconditionally; `.nu_c_ty { display: none }`
                below `80em` — and it is the **last** child, so hiding it can never
                orphan a separator
              - nothing else about `.nu_row` / `.nu_meat` / `.nu_sub`
                (`nu.css:303-364`) changes in this commit: the narrow row must come out
                of this card byte-identical on screen
  3. nu: hand the fields to the wide grid without flattening the row
     touches: copyparty/web/nu.css
     do:      - at `>= 64em`: `.nu_meat` and `.nu_sub` both take `display: contents` —
                **two** levels, not one (`nu.css:341-344` is only the first); `.nu_n`
                hidden, `.nu_w` shown
              - **and `.nu_sub > * + *::before { content: none }` in the same block.**
                `display: contents` drops the box, not the selector: leave the rule
                standing and every column but the first renders `· 1.2 GB` inside its
                own track
              - `.nu_row { display: grid; grid-template-columns: var(--nu-cols); }` with
                `--nu-cols` declared once per band using **named lines**:
                `[chip] 42px [name] minmax(0,1fr) [sz] 7em [dt] 10em [go] 1em`, and at
                `>= 80em` the same with `[ty] 7em` before `[dt]`
              - every cell placed by name — `.nu_type` on `chip`, then `name`, `sz`,
                `dt`, `ty`, `go` — never by order: files have no `.nu_go` (`nu.js:291`),
                an unindexed folder has no size cell and a dir has no type cell, so
                ordinal placement breaks on the second row it meets. `.nu_back .nu_name`
                spans `name / go`
              - the tracks are not the whole geometry: `.nu_row`'s `gap: 14px` and its
                `--row-pad` inline padding (`nu.css:306-307`) shift every column, so
                whatever the header does in Card 3 it must copy those two as well
              - **no `auto` track anywhere**: each row is its own grid, so a
                content-sized track means the columns stop lining up between rows
              - `.nu_empty` (`nu.css:373-378`) is untouched — it is a child of
                `#nu_list`, which stays a plain block, so it is not a grid item
done when:     suite green, no `.py` in the diff, and **the character-for-character
               check** at 390×844 on both an `-e2dsa` and a plain volume: a file row
               reads `<size> · <date>`, an indexed folder row `<n> items · <date>`, and
               an **unindexed** folder row the bare date with no leading separator —
               identical to what `b79cc1c8` renders for the same listing (screenshot
               diff, or read the two side by side). At 1440×900 — which is `90em`, above
               the `80em` step — the same rows are chip, Name, Size, Type, Date and
               chevron, aligned down the page, and **no `·` appears inside any column**;
               at 1100×900 (`68.75em`) the Type column is gone and the remaining columns
               still line up across a file row, an indexed folder row, an unindexed
               folder row and the back row

### Card 3 — The column header, as a second door to the existing sort
precondition:  Card 2 landed — the cells exist and `--nu-cols` is the one definition of
               the tracks
read for why:  spec §D4's last two bullets (why the header is not inside `#nu_list`, and
               why the arrow is repainted through `draw()` rather than from
               `pick_sort()`)
commits:
  1. nu: add the column header outside the aria-live region
     touches: copyparty/web/nu.html, copyparty/web/nu.css
     do:      - `<div id="nu_head"></div>` inside `#nu_main`, **before** `#nu_list` —
                never inside it: `#nu_list` carries `aria-live="polite"` (`nu.html:43`),
                so a header living there is re-announced on every sort and every
                keystroke in the filter
              - **no `hidden` attribute** — `display: none` in the base band and
                `display: grid` at `>= 64em`, one mechanism in one file. `hidden` is a
                UA `display: none` that the band rule then has to out-specify; it works
                from an id and breaks silently the day the rule moves to a class.
                (`#nu_tree` keeps its `hidden`, because JS owns it, not a band.)
              - it uses the same `var(--nu-cols)` grid, the same named-line placement,
                **and the same `gap` and inline padding as `.nu_row`** — all three, or a
                header that shares only the tracks sits 16px off at the left edge and
                drifts 14px more per column. That is the only reason it lines up with
                rows that are each their own grid
              - visible only at `>= 64em`; the middle and narrow bands keep the status
                line's sort button as their door
  2. nu: make a header click a second trigger for pick_sort()
     touches: copyparty/web/nu.js
     do:      - build the header's buttons **once at boot** from `SORTS`
                (`nu.js:131-137`), reusing its labels — `Name`, `Size`, `Type`, `Date` —
                so the header adds no i18n keys of its own
              - `SORTS` has a fifth key, `n` / `Items` (`:136`), and it gets **no**
                button: there is no Items column for it to sit over, and a fifth cell
                in a header that shares `--nu-cols` with the rows puts every column one
                track out. `n` stays a sheet-only sort, at every width
              - a click calls the existing `pick_sort(k)` (`nu.js:350-361`) with the
                same keys, including its natural-direction rule (`SORTS[a][3]`). No
                second comparator, no second state
              - the arrow is repainted by a `render_head()` called from `draw()`
                (`:302-306`), beside `render_stat()` — **not** by a third call bolted
                into `pick_sort()`, which is how the header and the sheet drift apart
              - `render_head()` writes `textContent` and `aria-sort` on the existing
                buttons; it must **not** rewrite the container's `innerHTML`, or the
                focused header button is destroyed under the user on every filter
                keystroke (`draw()` runs on a 90ms debounce, `nu.js:431-435`)
done when:     suite green, no `.py` in the diff, and at 1440×900: clicking `Size` sorts
               and clicking it again reverses; opening the sort sheet immediately after
               shows the **same** key and the **same** direction highlighted; picking
               `Date` in the sheet moves the header's arrow without a second click;
               `ebi("nu_list").contains(ebi("nu_head"))` is `false`, so the header is
               outside the `aria-live` region and a sort announces the listing once;
               and with a header button focused, typing five characters into the filter
               leaves `document.activeElement` that same button (the debounced `draw()`
               has run, and `render_head()` did not rewrite the container)

### Card 4 — The tree widget, and its dock
precondition:  Cards 1-3 landed — `#nu_tree`, `CAP`, `t()`/`STR`
read for why:  spec §D3 in full — it is a list of wire quirks, each of which is a bug if
               missed, and it is the reason this card is alone in its session
commits:
  1. nu: read the ?tree= endpoint, quirks and all
     touches: copyparty/web/nu.js
     do:      - `tree_load(top, dst, cb)` issuing
                `GET <dst>?tree=<top>[&dots][&k=<key>]`, the same request shape the
                classic navpane sends (`browser.js:7220-7232`). `top` must be `.` or a
                prefix of the request path or the server answers 422
                (`httpcli.py:6068-6072`)
              - **merge `a` with the `k*` keys.** `gen_tree` filters the expanded child
                out of the sibling list — `[x for x in dirs if x != excl]`
                (`httpcli.py:6144`, and `:6138` on the dirkey path) — and returns it
                only as `ret["k" + quotep(excl)]` (`:6094`). A reader that treats `a` as
                the child list silently drops the folder the user is inside. Classic's
                `parsetree` (`browser.js:7901-7908`) shows the merge; copy its structure
              - **decode, then test.** Every name is `quotep`-encoded (`:6141`, `:6144`,
                `:6161`), so `my vol` arrives as `my%20vol`; an unreachable sub-volume
                gets a `"\n"` appended *before* quoting (`:6160-6161`), so it arrives as
                `gone%0A`. Classic tests the still-encoded string
                (`browser.js:7922`, `ded = ks.endsWith('\n')`, on a value it only
                decodes at `:7923`) and therefore never matches — do **not** copy that
                line
              - **split the dirkey before decoding.** With the `dk` volflag the key is
                appended inside the same string (`name?k=kF73qdt_`, `httpcli.py:6141`);
                split at `?`, decode the name, carry the key into the href *and* into
                the next `?tree=` request's `&k=`, or the folder is unreachable
              - **always send a non-empty `tree=`.** The blank form is wrapped once per
                component of `args.R` under `-R` (`httpcli.py:6077-6082`); a reader that
                takes the top-level object as the root paints an empty tree on every
                reverse-proxied deployment
              - `&dots` is sent from the client's own preference on **every** request:
                the tree honors only the query param ANDed with `udot`
                (`httpcli.py:6114`), while the listing also honors a cookie
                (`:7434-7436`) — they are not one preference with two readers. For a user
                without `udot` the toggle is a documented no-op on the tree
              - state is `ST.tree = { root, expanded: {} }`; one fetch per expanded
                branch, never a recursive prefetch
  2. nu: render the tree into a container the sheet can reuse
     touches: copyparty/web/nu.js, copyparty/web/nu.css
     do:      - `render_tree(el)` takes its **container as an argument** — the dock now,
                0001 Card 4's sheet later. The widget is width-agnostic; only its
                container is not (spec §D3), and building it twice is how two UIs for
                one thing drift
              - only the chevron expands; the rest of the node navigates, through
                `keep()` (`nu.js:156-161`) so the `?nu` mode survives — `keep()` already
                appends `&nu` when the href carries a dirkey
              - the current path is marked (weight 700, accent text) and painted open on
                first load, which the reply's `k*` keys already deliver; an unreachable
                node renders disabled, never as a name with a line break
              - the dock fetches when it **first becomes visible**, not at boot: a phone
                that never widens must not pay a `?tree=` roundtrip. Subscribe to
                `CAP.on("wide", ...)` from Card 1 and load once, guarded by a loaded flag
              - the same function that un-hides `#nu_tree` writes `data-tree="1"` on
                `#nu_shell`, and nothing else ever writes it. That attribute is what
                opens the `16em` track (Card 1 commit 2), so the column and its contents
                appear in the same frame and every path that does not render a dock —
                `ui_notree`, a window that never widens, a failed `?tree=` — leaves one
                column and no gutter
              - the tree's strings (`Folders`, the unreachable node's title) go into
                `STR` via `t()`
  3. nu: bind cgv1 and honor the admin's ui_notree
     touches: copyparty/web/nu.html, copyparty/web/nu.js
     do:      - add `srvcfg = {{ cgv1 }}` to the bootstrap block (`nu.html:61-73`),
                **raw, never `|tojson`**: `vn.js_htm` is already a JSON *string*
                (`authsrv.py:3358`, `json_hesc(json.dumps(...))`), which is why every
                other template interpolates it bare (`browser.html:140`, `md.html:138`,
                `mde.html:35`); double-encoding hands the client a `String` and every
                capability gate reads `undefined`. `j2a` already passes it
                (`httpcli.py:7333`) — this is a template edit, not a server edit
              - the key is present only when the volflag is set
                (`authsrv.py:3338-3341` copies `ui_notree` / `ui_noctxb` into `js_htm`
                only when truthy), so the gate is `if (srvcfg.ui_notree)` and the dock
                is never rendered nor fetched — `--ui-notree` has meant "hide navpane in
                the UI" since `__main__.py:2026` and `nu` is the first UI that could not
                see it
done when:     suite green, no `.py` in the diff, and each wire quirk observed at
               1440×900 with its own setup: a folder named `my vol` renders as `my vol`;
               the folder the user is inside appears **exactly once**; behind `-R /pfx`
               the first expansion paints a populated tree; on a `--dk` volume every
               name arrives as `name?k=…`, the navigated href keeps the `?k=` and the
               next `?tree=` carries `&k=`; a sub-volume whose backing directory was
               removed after startup renders as one disabled node with no stray line
               break; expanding a branch costs **exactly one** request in devtools and
               expanding it again costs none; with `--ui-notree` the dock does not render
               at 1600px, `#nu_shell` carries no `data-tree` and resolves to **one**
               track with no empty gutter, and devtools records **zero** `?tree=`
               requests; and at 390×844 the page still issues no `?tree=` at all

### Card 5 — Desktop input on the surfaces that exist
precondition:  Card 4 landed — `CAP`, `srvcfg`, `--hov` / `--ring`
read for why:  spec §D2 in full (why the row stays a link, why nothing may be
               hover-only, why the query is read in JS and re-read on change) and
               §"Out of scope" (why the keyboard map is *not* built here)
commits:
  1. nu: give the row a hover fill and a visible focus ring
     touches: copyparty/web/nu.css
     do:      - `.nu_row:hover` on `--hov` inside `(hover: hover) and (pointer: fine)`,
                declared **above** the existing `:active` rule on `--sel`
                (`nu.css:314-316`) — equal specificity, so source order is what keeps the
                pressed state winning
              - `:focus-visible` on `.nu_row`, the chips, the sort button and the header
                buttons using `--ring`; `#nu_q` sets `outline: none` today (`:229`) and
                gets a real ring back
              - both are motion-guarded by Card 1's `prefers-reduced-motion` block
  2. nu: traverse the list with the arrow keys
     touches: copyparty/web/nu.js
     do:      - extend the existing `keydown` listener (`nu.js:445-448`) rather than
                adding a second one: `ArrowUp`/`ArrowDown` move focus between `.nu_row`
                elements (they are `<a href>` and already focusable), `Home`/`End` jump,
                `Enter` is the browser's own and needs no handler, `Escape` keeps closing
                the sheet and now also the context menu
              - **the typing guard first.** Classic reads the active element the same
                way (`browser.js:6237-6238`, `ae = document.activeElement` and its
                lower-cased `nodeName`) but then guards on `aet == 'input'` alone
                (`:6306-6307`, and a nodeName allowlist at `:6359-6360`);
                `isContentEditable` appears nowhere under `copyparty/web/`. `nu`'s guard
                is deliberately wider than the one it is modeled on — bail on `input`,
                `textarea`, `select` or `isContentEditable` — because the extra branches
                cost nothing and a textarea eats arrow keys exactly like `#nu_q`
                (`nu.html:30`) does
              - focus follows navigation only; **no selection state is created here** —
                click / shift-click / ctrl-click land with 0001 Card 5 (spec §D5)
  3. nu: add the right-click context menu as a declarative table
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - `<div id="nu_ctx" hidden role="menu"></div>` rendered from a `CTX` table
                (key, label key, enabled predicate, handler) so a later spec adds a row
                instead of redesigning the menu — the same shape 0001 Card 1 uses for
                its `MENU`
              - the rows are only the actions `nu` has **and that have a second door**:
                open, download, open in the classic UI. Nothing hover-only (spec §D2) —
                a hybrid laptop can be driven by finger at 1400px, so an action reachable
                only from this menu would be unreachable there. Copy-link and the
                destructive actions belong to 0001's `⋯` router and selection mode
              - installed **only** when `CAP.fine` matches and `!srvcfg.ui_noctxb`, and
                attached/detached from `CAP.on("fine", ...)`: a CSS-only gate hides the
                affordance while leaving the listener attached, which is the bug §D2
                exists to prevent. `--ui-noctxb` is the admin's existing switch
                (`__main__.py:2029`)
              - the menu closes on `Escape`, on scroll, and on a click outside; it is
                positioned at the cursor and flipped when it would leave the viewport
done when:     suite green, no `.py` in the diff, and the **capability matrix** holds
               without reloading between profiles: in a `pointer: fine` profile at
               1400px, hover fills a row, tabbing shows a ring on rows and chips, the
               arrow keys walk the list but do nothing while the cursor is in the search
               box, and right-click opens the menu; switching devtools to a coarse
               profile at the **same width** makes right-click fall through to the
               browser menu; with `--ui-noctxb` it falls through in both; and every
               action in the menu is reachable by finger at 1400px through a visible
               control

### Card 6 — The header at width, and the slots 0001 fills
precondition:  Cards 1-5 landed
read for why:  spec §D5's contract table (the action bar is one component with two
               placements, not two bars) and §Open questions (where the wide action bar
               sits is 0001 Card 1's call, with this as its constraint)
commits:
  1. nu: reflow the header for the wide band
     touches: copyparty/web/nu.css
     do:      - at `>= 64em` the header's four stacked bands (`#nu_nav`, `#nu_srch`,
                `#nu_chips`, `#nu_stat`, `nu.html:18-39`) become two rows: nav + search
                on one, chips + status on the other, with the search box no longer
                full-bleed. Same DOM, same ids, a different grid — one markup
              - the chips stay (decision above); the status line keeps its sort button
                at every width, so the sheet remains a door even where the column header
                exists
  2. nu: declare the wide toolbar slot for 0001's action bar
     touches: copyparty/web/nu.html, copyparty/web/nu.css
     do:      - `<span id="nu_tools"></span>` inside `#nu_stat`'s `#nu_acts`
                (`nu.html:38`, beside the existing `#nu_sort` button), empty and inert,
                with its wide placement styled
              - a comment naming its contract: 0001 Card 1 renders **the same** bar
                component into `#nu_tools` at `>= 64em` and into the fixed bottom bar
                below it — not a second bar with its own strings (spec §D5)
  3. docs: record what is built and what is still owed
     touches: docs/nu-ui.md
     do:      - update the `## widths` section from Card 1 to describe what now exists
                (dock, columns, header sort, desktop input) and what the wide band still
                lacks: selection, the action bar's wide placement, the full keyboard
                map, drag & drop upload, mtp tag columns
              - name the ordering explicitly — 0001 is re-planned against this tree —
                so the next reader does not re-derive it
done when:     suite green, no `.py` in the diff, and at 1440×900 the header is two rows
               with the search box no longer full-bleed while the chips still filter and
               the status line's sort button still opens the sheet; at 800×900 and
               390×844 the header is unchanged from `b79cc1c8`; `#nu_tools` is in the DOM
               with `getBoundingClientRect().width === 0`; and `docs/nu-ui.md`'s
               `## widths` section names all four things this plan built (dock, columns,
               header sort, desktop input) and all five it did not (selection, the action
               bar's wide placement, the keyboard map, drag & drop, mtp tag columns)

## What 0002 obliges 0001 to honor — declared, not edited

Spec §D5 is explicit that `docs/plans/0001-nu-the-rest-of-the-mobile-design.md` must be
re-planned once 0002 lands, and 0001's own §"The coupling to spec 0002" (`:48-71`)
already records the debt from its side. **This plan does not edit any `0001-*` file.**
What follows is the pendency list a future `/planc 0001` consumes — a clause per card,
so that re-plan is a diff and not a rewrite.

| 0001 card | what 0002 leaves it, and what it now owes |
|---|---|
| **1** — shell: i18n, bottom bar, `⋯` router | Commit 1 gains one bullet: fold `nu.js`'s `STR` table into `Ls.eng` and replace `t()`'s body with the per-key fallback — 0002's strings are already routed through `t()`, so no literal hunt. **Commit 2 is already landed** by 0002 Card 4 commit 3 (`srvcfg = {{ cgv1 }}`, raw); it becomes a verification line, not a commit. The bottom bar renders into `#nu_tools` at `>= 64em` and into the fixed bar below it — **one component, two placements**. The `classic` escape link moving into the `⋯` must keep 0002's context-menu row "open in classic UI" pointing somewhere real. |
| **2** — preferences and settings | The density toggle writes `data-dens="touch"` / `"compact"` on `documentElement` and **never restyles `.nu_row`** — 0002 owns `--row-pad` and the wide compact default (Card 1 commit 3). The settings screen is a centered panel at `>= 64em`, not a full-bleed sheet. The dotfiles toggle must also re-issue the tree's `?tree=&dots` through 0002's `tree_load()`, because the tree reads the query param and not the cookie. |
| **3** — grid + thumbnails | A wide tile size (114px is a phone tile), tiles filling the capped `100em` content column. The grid renderer stays the **single** sanctioned second renderer (spec §D1) and must not introduce a second *row* markup. |
| **4** — tree sheet | The widget is gone from this card: 0002 Card 4 built `tree_load()` / `render_tree(el)`. Card 4 builds **only** the sheet wrapper, passes the sheet's container to `render_tree()`, and is scoped to `< 64em` — and must not re-fetch what the dock already loaded. Its current commit 1 says "if 0002's tree widget has already landed, this commit builds the sheet wrapper and nothing else" (`0001:497-501`); that branch is now the only one. |
| **5** — selection | The checkbox is a **permanent column** at `>= 64em`, a new named line in `--nu-cols` — never a hover reveal. Long-press is installed only under `CAP.coarse`. Shift-click and ctrl/cmd-click act on the **checkbox**, extending and toggling the range (`msel.seltgl`, `browser.js:8827-8868`), never on the row: the row is an `<a href>` and a plain click must still navigate. The selection action bar uses `#nu_tools` at width. |
| **6** — swipe + pull-to-refresh | Both installed only under `CAP.coarse`, from JS, with the `onchange` re-bind — not hidden by CSS. The wide equivalent of the swipe's actions is a **row added to 0002's `CTX` table**, not a second menu. |
| **7** — image viewer | At `>= 64em` the viewer is a bounded image with its actions in a bar, prev/next on the arrow keys — and it must declare who owns `keydown` while it is open, because 0002 Card 5 put list traversal on the same document-level listener. |
| **8** — recursive search | No width dependency, but the result list renders through the **field-split row** (0002 Card 2), not a third row markup. |
| **plan-level** | 0001's gate rule names one viewport for the whole plan — "a named, falsifiable manual check **at 390×844**" (`0001:252`) — and no card names another. It becomes "at 390×844 **and** 1440×900", card by card. |

Ordering, restated because it is mechanical and not a preference: 0001 and 0002 both
edit `nu.js`, `nu.css` and `nu.html` in every card, so they cannot run in parallel.
0002 lands first; then `/planc 0001` re-runs against this tree.

## Verification (mirrors the spec's §Verification)

Run after Card 6, as the whole-plan check.

- **One markup, not two.** `grep -c 'nu_list").innerHTML' copyparty/web/nu.js` is `2` —
  `render_list()`'s write (`nu.js:299`) and `fetch_ls()`'s error message (`:458`). No
  third writer, no second row renderer.
- **The resize gate.** 1200px → 380px → 1200px without a reload keeps the sort, the
  filter, the search text and the scroll position, and issues **no** `?ls`. Widening may
  issue exactly one `?tree=` the first time (Card 4); narrowing issues nothing.
- **Capability, not width.** In a coarse profile the context menu does not exist; in a
  fine profile at the same width it does. Switching profiles without reloading flips the
  behavior — that is what proves the `onchange` re-bind exists rather than a boot-time
  latch.
- **Nothing is hover-only.** With a finger at 1400px every action reachable by hover is
  still reachable by a visible control.
- **The admin's switches reach `nu`.** A two-run diff: with `--ui-notree` no dock at
  1600px, zero `?tree=`, and a shell that is **one** column — a suppressed dock leaves
  no empty gutter; with `--ui-noctxb` right-click falls through to the browser menu.
  Both default off.
- **The separators stay in the narrow band.** At 1440×900 no column cell begins with
  `·`: the `::before` chain is cancelled where `.nu_sub` goes `display: contents`, which
  is the one rule that does not announce itself when it is missing.
- **The columns say something true.** On an unindexed volume a folder's Size cell is
  **empty**, never `4.0 KB`; on an `-e2dsa` volume it is the recursive size; on an
  `-e2dsa` volume carrying `nodirsz` it is empty again, which `cfg.idx` alone would have
  got wrong. The Date column distinguishes two files a year apart to the day.
- **Mobile does not regress.** At 390×844 the meta line is character-for-character what
  `b79cc1c8` renders — `<size> · <date>`, `<n> items · <date>`, and a bare date with **no
  leading separator** on an unindexed volume — even though the JS now emits those pieces
  as separate nodes.
- **No server drift.** `git diff b79cc1c8..HEAD` touches no `.py` file and adds no file
  under `web/`; the only files modified are `copyparty/web/nu.{js,css,html}` and
  `docs/`. A new file under `web/` would also need a row in the manifest that `RES` is
  built from (`copyparty/__init__.py:65-143`; `nu.css`/`nu.html`/`nu.js` are `:101-103`,
  `RES = set(...)` is `:143`) and a row in `scripts/sfx.ls`'s own alphabetical list
  (`nu.*` at `:105-107`) — which is the reason not to add one.
- **The classic UI is untouched.** `?b` reaches the basic browser, `?nu0` escapes, the
  `classic` link still unpins the `ui=nu` cookie, and no file under `copyparty/web/`
  other than `nu.*` appears in the diff.
- **Suite:** `python3 -m unittest discover -s tests` green — 31 tests, as at `b79cc1c8`.
  A regression guard, not evidence the work is right.

## Follow-ups this plan deliberately does not take

- `sorted()`'s `sz` comparator still orders folders by `f.sz` (`nu.js:197-198`), which
  is ~4096 wherever the recursive size was not filled. Fixing it changes mobile sorting
  and belongs with the mtp/column spec that revisits the sort keys.
- The tree dock's width, collapse and persistence (`treesz`, `parpane`, `dyntree`) —
  spec §D3 and §Open questions; judge it with the dock on screen.
- The full keyboard map, drag & drop upload, the 18-item context menu, mtp tag columns,
  the ten classic themes — all named in the spec's §Out of scope, each waiting on a spec
  of its own.
